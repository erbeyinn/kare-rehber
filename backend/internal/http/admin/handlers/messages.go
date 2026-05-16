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

type MessagesHandler struct {
	messages *service.MessageService
	users    *repository.UserRepo
}

func NewMessagesHandler(messages *service.MessageService, users *repository.UserRepo) *MessagesHandler {
	return &MessagesHandler{messages: messages, users: users}
}

type messageView struct {
	ID            int64   `json:"id"`
	ThreadID      int64   `json:"thread_id"`
	SenderID      int64   `json:"sender_id"`
	SenderName    string  `json:"sender_name,omitempty"`
	SenderRole    string  `json:"sender_role,omitempty"`
	RecipientRole string  `json:"recipient_role"`
	RecipientID   *int64  `json:"recipient_id,omitempty"`
	RecipientName string  `json:"recipient_name,omitempty"`
	Body          string  `json:"body"`
	ReadAt        *string `json:"read_at,omitempty"`
	CreatedAt     string  `json:"created_at"`
}

type threadSummaryView struct {
	ThreadID      int64       `json:"thread_id"`
	RecipientRole string      `json:"recipient_role"`
	RecipientID   *int64      `json:"recipient_id,omitempty"`
	RecipientName string      `json:"recipient_name,omitempty"`
	Other         *partyView  `json:"other,omitempty"`
	LastMessage   messageView `json:"last_message"`
	UnreadCount   int         `json:"unread_count"`
}

func (h *MessagesHandler) ListThreads(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok || claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	opts := service.ListInboxOptions{}
	if claims.Role == domain.RoleAdmin {
		opts.Mine = r.URL.Query().Get("mine") == "true"
	}
	summaries, err := h.messages.ListInbox(r.Context(), claims.UserID, opts)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	out := h.toThreadSummaryViews(r, claims.Role, summaries)
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *MessagesHandler) GetThread(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok || claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	msgs, err := h.messages.ListThread(r.Context(), id, claims.UserID)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{
		"items": h.toMessageViews(r, msgs),
	})
}

type replyReq struct {
	Body string `json:"body"`
}

func (h *MessagesHandler) Reply(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok || claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	var req replyReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	var (
		m   *domain.Message
		err error
	)
	switch claims.Role {
	case domain.RoleAdmin:
		m, err = h.messages.ReplyAsAdmin(r.Context(), claims.UserID, id, req.Body)
	case domain.RoleCoordinator:
		m, err = h.messages.ReplyAsCoordinator(r.Context(), claims.UserID, id, req.Body)
	default:
		httputil.WriteError(w, http.StatusForbidden, "forbidden")
		return
	}
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, h.toMessageView(r, m))
}

func (h *MessagesHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok || claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	if err := h.messages.MarkRead(r.Context(), id, claims.UserID); err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- view conversion ------------------------------------------------------

func (h *MessagesHandler) toMessageView(r *http.Request, m *domain.Message) messageView {
	v := messageView{
		ID:            m.ID,
		ThreadID:      m.RootID(),
		SenderID:      m.SenderID,
		RecipientRole: string(m.RecipientRole),
		RecipientID:   m.RecipientID,
		Body:          m.Body,
		CreatedAt:     m.CreatedAt.Format(time.RFC3339),
	}
	if m.ReadAt != nil {
		s := m.ReadAt.Format(time.RFC3339)
		v.ReadAt = &s
	}
	if u, err := h.users.GetByID(r.Context(), m.SenderID); err == nil {
		v.SenderName = u.FirstName + " " + u.LastName
		v.SenderRole = string(u.Role)
	}
	if m.RecipientID != nil {
		if u, err := h.users.GetByID(r.Context(), *m.RecipientID); err == nil {
			v.RecipientName = u.FirstName + " " + u.LastName
		}
	}
	return v
}

func (h *MessagesHandler) toMessageViews(r *http.Request, ms []*domain.Message) []messageView {
	out := make([]messageView, 0, len(ms))
	for _, m := range ms {
		out = append(out, h.toMessageView(r, m))
	}
	return out
}

func (h *MessagesHandler) toThreadSummaryViews(r *http.Request, viewerRole domain.Role, summaries []*repository.ThreadSummary) []threadSummaryView {
	_ = viewerRole // admin & coordinator both want the "other party" = sender (a student or parent)
	out := make([]threadSummaryView, 0, len(summaries))
	for _, s := range summaries {
		last := h.toMessageView(r, s.Last)
		v := threadSummaryView{
			ThreadID:      s.Root.ID,
			RecipientRole: string(s.Root.RecipientRole),
			RecipientID:   s.Root.RecipientID,
			LastMessage:   last,
			UnreadCount:   s.UnreadCount,
		}
		if s.Root.RecipientID != nil {
			if u, err := h.users.GetByID(r.Context(), *s.Root.RecipientID); err == nil {
				v.RecipientName = u.FirstName + " " + u.LastName
			}
		}
		if u, err := h.users.GetByID(r.Context(), s.Root.SenderID); err == nil {
			v.Other = &partyView{ID: u.ID, FirstName: u.FirstName, LastName: u.LastName}
		}
		out = append(out, v)
	}
	return out
}
