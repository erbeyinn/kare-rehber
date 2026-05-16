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

// --- public endpoints ------------------------------------------------------

func (h *MessagesHandler) ListThreads(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireMessagingViewer(w, r)
	if !ok {
		return
	}
	summaries, err := h.messages.ListInbox(r.Context(), claims.UserID, service.ListInboxOptions{})
	if err != nil {
		writePublicError(w, err)
		return
	}
	out := h.toThreadSummaryViews(r, claims, summaries)
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *MessagesHandler) GetThread(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireMessagingViewer(w, r)
	if !ok {
		return
	}
	id, ok := pathInt(w, r, "id")
	if !ok {
		return
	}
	msgs, err := h.messages.ListThread(r.Context(), id, claims.UserID)
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{
		"items": h.toMessageViews(r, msgs),
	})
}

type createMessageReq struct {
	RecipientRole string `json:"recipient_role"`
	Body          string `json:"body"`
	ThreadID      *int64 `json:"thread_id,omitempty"`
}

func (h *MessagesHandler) Create(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireMessagingViewer(w, r)
	if !ok {
		return
	}
	var req createMessageReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	role := domain.MessageRecipientRole(req.RecipientRole)
	if req.ThreadID == nil && !role.Valid() {
		httputil.WriteError(w, http.StatusBadRequest, "invalid recipient_role")
		return
	}
	m, err := h.messages.SendFromPublic(r.Context(), claims.UserID, role, req.Body, req.ThreadID)
	if err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, h.toMessageView(r, m))
}

func (h *MessagesHandler) MarkRead(w http.ResponseWriter, r *http.Request) {
	claims, ok := requireMessagingViewer(w, r)
	if !ok {
		return
	}
	id, ok := pathInt(w, r, "id")
	if !ok {
		return
	}
	if err := h.messages.MarkRead(r.Context(), id, claims.UserID); err != nil {
		writePublicError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// --- helpers ---------------------------------------------------------------

// requireMessagingViewer accepts any authenticated user; visibility is enforced
// in the service layer per role.
func requireMessagingViewer(w http.ResponseWriter, r *http.Request) (*authClaims, bool) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok || claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return nil, false
	}
	return &authClaims{UserID: claims.UserID, Role: claims.Role}, true
}

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

func (h *MessagesHandler) toThreadSummaryViews(r *http.Request, viewer *authClaims, summaries []*repository.ThreadSummary) []threadSummaryView {
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
		v.Other = h.resolveOtherParty(r, viewer, s)
		out = append(out, v)
	}
	return out
}

// resolveOtherParty returns the "other side" of the conversation from the
// viewer's perspective — admin/coordinator viewers see the public sender;
// student/parent viewers see the recipient user (or nil for the admin pool).
func (h *MessagesHandler) resolveOtherParty(r *http.Request, viewer *authClaims, s *repository.ThreadSummary) *partyView {
	switch viewer.Role {
	case domain.RoleAdmin, domain.RoleCoordinator:
		if u, err := h.users.GetByID(r.Context(), s.Root.SenderID); err == nil {
			return &partyView{ID: u.ID, FirstName: u.FirstName, LastName: u.LastName}
		}
	case domain.RoleStudent, domain.RoleParent:
		if s.Root.RecipientID != nil {
			if u, err := h.users.GetByID(r.Context(), *s.Root.RecipientID); err == nil {
				return &partyView{ID: u.ID, FirstName: u.FirstName, LastName: u.LastName}
			}
		}
	}
	return nil
}
