package handlers

import (
	"encoding/json"
	"net/http"
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

type meetingView struct {
	ID          int64        `json:"id"`
	Status      string       `json:"status"`
	MeetingDate string       `json:"meeting_date"`
	Content     string       `json:"content"`
	Evaluation  string       `json:"evaluation"`
	Student     *partyView   `json:"student,omitempty"`
	Coach       *partyView   `json:"coach,omitempty"`
	CreatedAt   string       `json:"created_at"`
	UpdatedAt   string       `json:"updated_at"`
}

type partyView struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

func (h *MeetingsHandler) List(w http.ResponseWriter, r *http.Request) {
	var status *domain.MeetingStatus
	switch r.URL.Query().Get("status") {
	case "pending":
		v := domain.MeetingStatusPending
		status = &v
	case "draft":
		v := domain.MeetingStatusDraft
		status = &v
	case "approved":
		v := domain.MeetingStatusApproved
		status = &v
	case "", "all":
		status = nil
	default:
		httputil.WriteError(w, http.StatusBadRequest, "invalid status")
		return
	}
	rows, err := h.meetings.ListAdmin(r.Context(), status)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]meetingView, 0, len(rows))
	for _, m := range rows {
		out = append(out, h.toView(r, m))
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *MeetingsHandler) Get(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	m, err := h.meetings.Get(r.Context(), id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, h.toView(r, m))
}

type adminMeetingReq struct {
	MeetingDate string  `json:"meeting_date"`
	Content     string  `json:"content"`
	Evaluation  string  `json:"evaluation"`
	Status      *string `json:"status,omitempty"`
}

func (h *MeetingsHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	var req adminMeetingReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	var date time.Time
	if req.MeetingDate != "" {
		d, err := time.Parse("2006-01-02", req.MeetingDate)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "meeting_date must be YYYY-MM-DD")
			return
		}
		date = d
	}
	var statusPtr *domain.MeetingStatus
	if req.Status != nil {
		s := domain.MeetingStatus(*req.Status)
		statusPtr = &s
	}
	claims, _ := middleware.ClaimsFrom(r.Context())
	if claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	m, err := h.meetings.UpdateByAdmin(r.Context(), claims.UserID, id, service.AdminMeetingUpdate{
		MeetingDate: date,
		Content:     req.Content,
		Evaluation:  req.Evaluation,
		Status:      statusPtr,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, h.toView(r, m))
}

func (h *MeetingsHandler) Approve(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	claims, _ := middleware.ClaimsFrom(r.Context())
	if claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	m, err := h.meetings.Approve(r.Context(), claims.UserID, id)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, h.toView(r, m))
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
