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
	"kare-rehber/backend/internal/domain"
	httputil "kare-rehber/backend/internal/http"
	adminhandlers "kare-rehber/backend/internal/http/admin/handlers"
	"kare-rehber/backend/internal/http/middleware"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/service"
	"kare-rehber/backend/internal/sms"
)

func main() {
	cfg := config.Load()

	ctx := context.Background()
	if err := db.RunMigrations(ctx, cfg.DatabaseURL); err != nil {
		slog.Error("migrations failed", "err", err)
		os.Exit(1)
	}
	slog.Info("migrations applied")

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
	adminAuth := auth.NewAdminAuth(userRepo, jwt)
	authHandler := adminhandlers.NewAdminAuthHandler(adminAuth, userRepo)
	registration := service.NewRegistrationService(userRepo, studentRepo, coachRepo, smsProvider)
	matching := service.NewMatchingService(userRepo, studentRepo, matchRepo)
	auditService := service.NewAuditService(auditRepo)
	meetings := service.NewMeetingService(meetingRepo, matchRepo, userRepo, studentRepo, auditService)
	reports := service.NewReportService(coachRepo, matchRepo, meetingRepo, studentRepo, userRepo)
	smsService := service.NewSMSService(userRepo, studentRepo, smsProvider, reports, smsLogRepo)
	messageRepo := repository.NewMessageRepo(pool)
	messageService := service.NewMessageService(messageRepo, userRepo, studentRepo, matchRepo)
	usersHandler := adminhandlers.NewUsersHandler(registration, userRepo, studentRepo, coachRepo)
	matchingHandler := adminhandlers.NewMatchingHandler(matching, studentRepo, userRepo, coachRepo)
	meetingsHandler := adminhandlers.NewMeetingsHandler(meetings, userRepo)
	reportsHandler := adminhandlers.NewReportsHandler(reports, cfg.CoachMeetingIntervalDays)
	smsHandler := adminhandlers.NewSMSHandler(smsService, userRepo, studentRepo, cfg.CoachMeetingIntervalDays)
	messagesHandler := adminhandlers.NewMessagesHandler(messageService, userRepo)
	logsHandler := adminhandlers.NewLogsHandler(auditRepo, userRepo)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "admin-api"})
	})
	mux.HandleFunc("POST /auth/login", authHandler.Login)
	mux.Handle("GET /me", middleware.RequireAuth(jwt)(http.HandlerFunc(authHandler.Me)))

	adminOnly := middleware.RequireRole(jwt, domain.RoleAdmin)
	mux.Handle("GET /users/students", adminOnly(http.HandlerFunc(usersHandler.ListStudents)))
	mux.Handle("GET /users/students/{id}", adminOnly(http.HandlerFunc(usersHandler.GetStudent)))
	mux.Handle("POST /users/students/{id}/approve", adminOnly(http.HandlerFunc(usersHandler.ApproveStudent)))

	mux.Handle("GET /users/coaches", adminOnly(http.HandlerFunc(usersHandler.ListCoaches)))
	mux.Handle("GET /users/coaches/{id}", adminOnly(http.HandlerFunc(usersHandler.GetCoach)))
	mux.Handle("POST /users/coaches/{id}/approve", adminOnly(http.HandlerFunc(usersHandler.ApproveCoach)))

	mux.Handle("GET /users/coordinators", adminOnly(http.HandlerFunc(usersHandler.ListCoordinators)))
	mux.Handle("POST /users/coordinators", adminOnly(http.HandlerFunc(usersHandler.CreateCoordinator)))
	mux.Handle("PUT /users/coordinators/{id}", adminOnly(http.HandlerFunc(usersHandler.UpdateCoordinator)))

	mux.Handle("GET /users/admins", adminOnly(http.HandlerFunc(usersHandler.ListAdmins)))
	mux.Handle("POST /users/admins", adminOnly(http.HandlerFunc(usersHandler.CreateAdmin)))
	mux.Handle("PUT /users/admins/{id}", adminOnly(http.HandlerFunc(usersHandler.UpdateAdmin)))

	mux.Handle("POST /users/{id}/send-credentials", adminOnly(http.HandlerFunc(usersHandler.SendCredentials)))

	mux.Handle("GET /matching/students", adminOnly(http.HandlerFunc(matchingHandler.ListStudents)))
	mux.Handle("GET /matching/cities", adminOnly(http.HandlerFunc(matchingHandler.ListCities)))
	mux.Handle("GET /matching/coaches", adminOnly(http.HandlerFunc(matchingHandler.ListCoachTargets)))
	mux.Handle("GET /matching/coordinators", adminOnly(http.HandlerFunc(matchingHandler.ListCoordinatorTargets)))
	mux.Handle("POST /matching/bulk", adminOnly(http.HandlerFunc(matchingHandler.BulkMatch)))
	mux.Handle("DELETE /matching/{student_id}", adminOnly(http.HandlerFunc(matchingHandler.Unmatch)))

	mux.Handle("GET /meetings", adminOnly(http.HandlerFunc(meetingsHandler.List)))
	mux.Handle("GET /meetings/{id}", adminOnly(http.HandlerFunc(meetingsHandler.Get)))
	mux.Handle("PUT /meetings/{id}", adminOnly(http.HandlerFunc(meetingsHandler.Update)))
	mux.Handle("POST /meetings/{id}/approve", adminOnly(http.HandlerFunc(meetingsHandler.Approve)))

	mux.Handle("GET /reports/overdue-coaches", adminOnly(http.HandlerFunc(reportsHandler.OverdueCoaches)))
	mux.Handle("GET /reports/overview", adminOnly(http.HandlerFunc(reportsHandler.Overview)))
	mux.Handle("GET /reports/students", adminOnly(http.HandlerFunc(reportsHandler.StudentStats)))
	mux.Handle("GET /reports/coaches", adminOnly(http.HandlerFunc(reportsHandler.CoachStats)))
	mux.Handle("GET /reports/cities", adminOnly(http.HandlerFunc(reportsHandler.Cities)))
	mux.Handle("GET /reports/meetings", adminOnly(http.HandlerFunc(reportsHandler.MeetingStats)))
	mux.Handle("GET /reports/missing-meetings", adminOnly(http.HandlerFunc(reportsHandler.MissingMeetings)))
	mux.Handle("GET /logs", adminOnly(http.HandlerFunc(logsHandler.List)))

	mux.Handle("GET /sms/recipients", adminOnly(http.HandlerFunc(smsHandler.ListRecipients)))
	mux.Handle("GET /sms/users", adminOnly(http.HandlerFunc(smsHandler.SearchUsers)))
	mux.Handle("GET /sms/logs", adminOnly(http.HandlerFunc(smsHandler.ListLogs)))
	mux.Handle("POST /sms/individual", adminOnly(http.HandlerFunc(smsHandler.SendIndividual)))
	mux.Handle("POST /sms/bulk", adminOnly(http.HandlerFunc(smsHandler.SendBulk)))
	mux.Handle("POST /sms/overdue-coaches", adminOnly(http.HandlerFunc(smsHandler.SendToOverdue)))

	adminOrCoord := middleware.RequireRole(jwt, domain.RoleAdmin, domain.RoleCoordinator)
	mux.Handle("GET /messages/threads", adminOrCoord(http.HandlerFunc(messagesHandler.ListThreads)))
	mux.Handle("GET /messages/threads/{id}", adminOrCoord(http.HandlerFunc(messagesHandler.GetThread)))
	mux.Handle("POST /messages/threads/{id}/reply", adminOrCoord(http.HandlerFunc(messagesHandler.Reply)))
	mux.Handle("POST /messages/threads/{id}/read", adminOrCoord(http.HandlerFunc(messagesHandler.MarkRead)))

	handler := middleware.Recover(middleware.Logging(middleware.CORS(mux)))

	addr := fmt.Sprintf(":%d", cfg.AdminAPIPort)
	slog.Info("admin-api listening", "addr", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		slog.Error("admin-api failed", "err", err)
		os.Exit(1)
	}
}
