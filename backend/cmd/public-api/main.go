package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"

	"kare-rehber/backend/internal/auth"
	"kare-rehber/backend/internal/config"
	"kare-rehber/backend/internal/db"
	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/http/middleware"
	publichandlers "kare-rehber/backend/internal/http/public/handlers"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/service"
	"kare-rehber/backend/internal/sms"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("db connect failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	userRepo := repository.NewUserRepo(pool)
	studentRepo := repository.NewStudentRepo(pool)
	coachRepo := repository.NewCoachRepo(pool)
	matchRepo := repository.NewMatchRepo(pool)
	meetingRepo := repository.NewMeetingRepo(pool)
	auditRepo := repository.NewAuditRepo(pool)
	smsLogRepo := repository.NewSMSLogRepo(pool)
	smsProvider := sms.NewMockProvider(smsLogRepo)

	jwt := auth.NewJWT(cfg.JWTSecret)
	publicAuth := auth.NewPublicAuth(userRepo, jwt)
	authHandler := publichandlers.NewPublicAuthHandler(publicAuth, userRepo)
	registration := service.NewRegistrationService(userRepo, studentRepo, coachRepo, smsProvider)
	matching := service.NewMatchingService(userRepo, studentRepo, matchRepo)
	auditService := service.NewAuditService(auditRepo)
	meetings := service.NewMeetingService(meetingRepo, matchRepo, userRepo, studentRepo, auditService)
	registerHandler := publichandlers.NewRegisterHandler(registration)
	matchesHandler := publichandlers.NewMatchesHandler(matching, userRepo)
	meetingsHandler := publichandlers.NewMeetingsHandler(meetings, userRepo)
	messageRepo := repository.NewMessageRepo(pool)
	messageService := service.NewMessageService(messageRepo, userRepo, studentRepo, matchRepo)
	messagesHandler := publichandlers.NewMessagesHandler(messageService, userRepo)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "public-api"})
	})
	mux.HandleFunc("POST /auth/login", authHandler.Login)
	mux.Handle("GET /me", middleware.RequireAuth(jwt)(http.HandlerFunc(authHandler.Me)))
	mux.HandleFunc("POST /register/student", registerHandler.Student)
	mux.HandleFunc("POST /register/coach", registerHandler.Coach)
	mux.Handle("GET /me/matches", middleware.RequireAuth(jwt)(http.HandlerFunc(matchesHandler.MyMatches)))

	authed := middleware.RequireAuth(jwt)
	mux.Handle("GET /coach/students", authed(http.HandlerFunc(meetingsHandler.CoachStudents)))
	mux.Handle("GET /coach/students/{id}/meetings", authed(http.HandlerFunc(meetingsHandler.CoachStudentMeetings)))
	mux.Handle("POST /coach/meetings", authed(http.HandlerFunc(meetingsHandler.CoachCreate)))
	mux.Handle("GET /coach/meetings/{id}", authed(http.HandlerFunc(meetingsHandler.CoachGet)))
	mux.Handle("PUT /coach/meetings/{id}", authed(http.HandlerFunc(meetingsHandler.CoachUpdate)))
	mux.Handle("POST /coach/meetings/{id}/submit", authed(http.HandlerFunc(meetingsHandler.CoachSubmit)))

	mux.Handle("GET /student/meetings", authed(http.HandlerFunc(meetingsHandler.StudentMeetings)))
	mux.Handle("GET /parent/meetings", authed(http.HandlerFunc(meetingsHandler.ParentMeetings)))
	mux.Handle("GET /coordinator/students", authed(http.HandlerFunc(meetingsHandler.CoordinatorStudents)))
	mux.Handle("GET /coordinator/students/{id}/meetings", authed(http.HandlerFunc(meetingsHandler.CoordinatorStudentMeetings)))

	mux.Handle("GET /messages/threads", authed(http.HandlerFunc(messagesHandler.ListThreads)))
	mux.Handle("GET /messages/threads/{id}", authed(http.HandlerFunc(messagesHandler.GetThread)))
	mux.Handle("POST /messages", authed(http.HandlerFunc(messagesHandler.Create)))
	mux.Handle("POST /messages/threads/{id}/read", authed(http.HandlerFunc(messagesHandler.MarkRead)))

	handler := middleware.Recover(middleware.Logging(middleware.CORS(mux)))

	addr := fmt.Sprintf(":%d", cfg.PublicAPIPort)
	slog.Info("public-api listening", "addr", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		slog.Error("public-api failed", "err", err)
		os.Exit(1)
	}
}
