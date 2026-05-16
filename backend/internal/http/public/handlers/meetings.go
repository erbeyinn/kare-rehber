package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	"kare-rehber/backend/internal/domain"
	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/http/middleware"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/service"
)

type MeetingsHandler struct {
	meetings *service.MeetingService
	users    *repository.UserRepo
}

func NewMeetingsHandler(meetings *service.MeetingService, users *repository.UserRepo) *MeetingsHandler {
	return &MeetingsHandler{meetings: meetings, users: users}
}

type partyView struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type meetingView struct {
	ID          int64      `json:"id"`
	Status      string     `json:"status"`
	MeetingDate string     `json:"meeting_date"`
	Content     string     `json:"content"`
	Evaluation  string     `json:"evaluation"`
	Student     *partyView `json:"student,omitempty"`
	Coach       *partyView `json:"coach,omitempty"`
	CreatedAt   string     `json:"created_at"`
	UpdatedAt   string     `json:"updated_at"`
}

type studentMiniView struct {
	ID        int64   `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Phone     string  `json:"phone"`
	School    *string `json:"school,omitempty"`
	Grade     *string `json:"grade,omitempty"`
	City      *string `json:"city,omitempty"`
}

// --- Coach endpoints --------------------------------------------------------

func (h *MeetingsHandler) CoachStudents(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleCoach)
	if !ok {
		return
	}
	students, err := h.meetings.CoachStudents(r.Context(), claims.UserID)
	if err != nil {
		writePublicError(w, err)
		return
	}
	out := make([]studentMiniView, 0, len(students))
	for _, u := range students {
		out = append(out, studentMiniView{
			ID: u.ID, FirstName: u.FirstName, LastName: u.LastName, Phone: u.Phone,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *MeetingsHandler) CoachStudentMeetings(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleCoach)
	if !ok {
		return
	}
	sid, ok := pathInt(w, r, "id")
	if !ok {
		return
	}
	rows, err := h.meetings.ListForCoach(r.Context(), claims.UserID, &sid)
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": h.toViews(r, rows)})
}

type coachMeetingReq struct {
	StudentID   int64  `json:"student_id"`
	MeetingDate string `json:"meeting_date"`
	Content     string `json:"content"`
	Evaluation  string `json:"evaluation"`
}

func (h *MeetingsHandler) CoachCreate(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleCoach)
	if !ok {
		return
	}
	var req coachMeetingReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	date, err := time.Parse("2006-01-02", req.MeetingDate)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "meeting_date must be YYYY-MM-DD")
		return
	}
	m, err := h.meetings.CreateDraft(r.Context(), claims.UserID, service.MeetingPayload{
		StudentID:   req.StudentID,
		MeetingDate: date,
		Content:     req.Content,
		Evaluation:  req.Evaluation,
	})
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, h.toView(r, m))
}

type coachMeetingUpdateReq struct {
	MeetingDate string `json:"meeting_date"`
	Content     string `json:"content"`
	Evaluation  string `json:"evaluation"`
}

func (h *MeetingsHandler) CoachUpdate(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleCoach)
	if !ok {
		return
	}
	id, ok := pathInt(w, r, "id")
	if !ok {
		return
	}
	var req coachMeetingUpdateReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	date, err := time.Parse("2006-01-02", req.MeetingDate)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "meeting_date must be YYYY-MM-DD")
		return
	}
	existing, err := h.meetings.Get(r.Context(), id)
	if err != nil {
		writePublicError(w, err)
		return
	}
	m, err := h.meetings.UpdateByCoach(r.Context(), claims.UserID, id, service.MeetingPayload{
		StudentID:   existing.StudentID,
		MeetingDate: date,
		Content:     req.Content,
		Evaluation:  req.Evaluation,
	})
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, h.toView(r, m))
}

func (h *MeetingsHandler) CoachSubmit(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleCoach)
	if !ok {
		return
	}
	id, ok := pathInt(w, r, "id")
	if !ok {
		return
	}
	m, err := h.meetings.Submit(r.Context(), claims.UserID, id)
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, h.toView(r, m))
}

func (h *MeetingsHandler) CoachGet(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleCoach)
	if !ok {
		return
	}
	id, ok := pathInt(w, r, "id")
	if !ok {
		return
	}
	m, err := h.meetings.Get(r.Context(), id)
	if err != nil {
		writePublicError(w, err)
		return
	}
	if m.CoachID != claims.UserID {
		httputil.WriteError(w, http.StatusForbidden, "forbidden")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, h.toView(r, m))
}

// --- Student / parent / coordinator -----------------------------------------

func (h *MeetingsHandler) StudentMeetings(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleStudent)
	if !ok {
		return
	}
	rows, err := h.meetings.ListForStudent(r.Context(), claims.UserID)
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": h.toViews(r, rows)})
}

func (h *MeetingsHandler) ParentMeetings(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleParent)
	if !ok {
		return
	}
	rows, err := h.meetings.ListForParent(r.Context(), claims.UserID)
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": h.toViews(r, rows)})
}

func (h *MeetingsHandler) CoordinatorStudents(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleCoordinator)
	if !ok {
		return
	}
	students, err := h.meetings.CoordinatorStudents(r.Context(), claims.UserID)
	if err != nil {
		writePublicError(w, err)
		return
	}
	out := make([]studentMiniView, 0, len(students))
	for _, u := range students {
		out = append(out, studentMiniView{
			ID: u.ID, FirstName: u.FirstName, LastName: u.LastName, Phone: u.Phone,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *MeetingsHandler) CoordinatorStudentMeetings(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireRole(w, r, domain.RoleCoordinator)
	if !ok {
		return
	}
	sid, ok := pathInt(w, r, "id")
	if !ok {
		return
	}
	rows, err := h.meetings.ListForCoordinator(r.Context(), claims.UserID, &sid)
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": h.toViews(r, rows)})
}

// --- helpers ----------------------------------------------------------------

func requireRole(w http.ResponseWriter, r *http.Request, role domain.Role) (*authClaims, bool) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok || claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return nil, false
	}
	if claims.Role != role {
		httputil.WriteError(w, http.StatusForbidden, "forbidden")
		return nil, false
	}
	return &authClaims{UserID: claims.UserID, Role: claims.Role}, true
}

type authClaims struct {
	UserID int64
	Role   domain.Role
}

func pathInt(w http.ResponseWriter, r *http.Request, key string) (int64, bool) {
	raw := r.PathValue(key)
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid id")
		return 0, false
	}
	return id, true
}

func (h *MeetingsHandler) toView(r *http.Request, m *domain.Meeting) meetingView {
	v := meetingView{
		ID:          m.ID,
		Status:      string(m.Status),
		MeetingDate: m.MeetingDate.Format("2006-01-02"),
		Content:     m.Content,
		Evaluation:  m.Evaluation,
		CreatedAt:   m.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   m.UpdatedAt.Format(time.RFC3339),
	}
	if u, err := h.users.GetByID(r.Context(), m.StudentID); err == nil {
		v.Student = &partyView{ID: u.ID, FirstName: u.FirstName, LastName: u.LastName}
	}
	if u, err := h.users.GetByID(r.Context(), m.CoachID); err == nil {
		v.Coach = &partyView{ID: u.ID, FirstName: u.FirstName, LastName: u.LastName}
	}
	return v
}

func (h *MeetingsHandler) toViews(r *http.Request, ms []*domain.Meeting) []meetingView {
	out := make([]meetingView, 0, len(ms))
	for _, m := range ms {
		out = append(out, h.toView(r, m))
	}
	return out
}

func writePublicError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden):
		httputil.WriteError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, service.ErrInvalidInput):
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrInvalidTransition):
		httputil.WriteError(w, http.StatusConflict, err.Error())
	case errors.Is(err, repository.ErrNotFound):
		httputil.WriteError(w, http.StatusNotFound, "not found")
	default:
		httputil.WriteError(w, http.StatusInternalServerError, "internal error")
	}
}
