package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"kare-rehber/backend/internal/domain"
	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/service"
)

type SMSHandler struct {
	sms             *service.SMSService
	users           *repository.UserRepo
	students        *repository.StudentRepo
	defaultInterval int
}

func NewSMSHandler(
	sms *service.SMSService,
	users *repository.UserRepo,
	students *repository.StudentRepo,
	defaultInterval int,
) *SMSHandler {
	if defaultInterval <= 0 {
		defaultInterval = 14
	}
	return &SMSHandler{sms: sms, users: users, students: students, defaultInterval: defaultInterval}
}

type individualSMSReq struct {
	UserID int64  `json:"user_id"`
	Body   string `json:"body"`
}

func (h *SMSHandler) SendIndividual(w http.ResponseWriter, r *http.Request) {
	var req individualSMSReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.UserID == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "user_id required")
		return
	}
	if err := h.sms.SendIndividual(r.Context(), req.UserID, req.Body); err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"status": "sent"})
}

type bulkSMSReq struct {
	UserIDs []int64 `json:"user_ids"`
	Body    string  `json:"body"`
}

type bulkSMSResp struct {
	Sent     int                `json:"sent"`
	Failed   int                `json:"failed"`
	Failures []bulkFailureView  `json:"failures,omitempty"`
}

type bulkFailureView struct {
	UserID int64  `json:"user_id"`
	Phone  string `json:"phone,omitempty"`
	Error  string `json:"error"`
}

func (h *SMSHandler) SendBulk(w http.ResponseWriter, r *http.Request) {
	var req bulkSMSReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	res, err := h.sms.SendBulk(r.Context(), req.UserIDs, req.Body)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, bulkResultView(res))
}

type overdueSMSReq struct {
	Body string `json:"body"`
	Days *int   `json:"days,omitempty"`
}

func (h *SMSHandler) SendToOverdue(w http.ResponseWriter, r *http.Request) {
	var req overdueSMSReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	days := h.defaultInterval
	if req.Days != nil {
		if *req.Days < 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid days")
			return
		}
		days = *req.Days
	}
	res, err := h.sms.SendToOverdueCoaches(r.Context(), days, req.Body)
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, bulkResultView(res))
}

type recipientView struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

// ListRecipients powers the bulk-SMS preview: role + city filter → users.
func (h *SMSHandler) ListRecipients(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	role := domain.Role(q.Get("role"))
	if !role.Valid() {
		httputil.WriteError(w, http.StatusBadRequest, "invalid role")
		return
	}
	var city *string
	if v := q.Get("city"); v != "" {
		city = &v
	}
	rows, err := h.sms.ResolveRecipients(r.Context(), service.BulkRecipientFilter{
		Role: role,
		City: city,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	out := make([]recipientView, 0, len(rows))
	for _, u := range rows {
		out = append(out, recipientView{
			ID: u.ID, FirstName: u.FirstName, LastName: u.LastName, Phone: u.Phone,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out, "count": len(out)})
}

// SearchUsers powers the individual-SMS combobox: substring on name or phone.
func (h *SMSHandler) SearchUsers(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	if len(query) < 2 {
		httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": []recipientView{}})
		return
	}
	roles := []domain.Role{domain.RoleStudent, domain.RoleParent, domain.RoleCoach, domain.RoleCoordinator, domain.RoleAdmin}
	out := make([]recipientView, 0, 16)
	for _, role := range roles {
		users, err := h.users.ListByRole(r.Context(), role)
		if err != nil {
			httputil.WriteError(w, http.StatusInternalServerError, "search failed")
			return
		}
		for _, u := range users {
			if !u.IsActive {
				continue
			}
			if !matchUser(u, query) {
				continue
			}
			out = append(out, recipientView{
				ID: u.ID, FirstName: u.FirstName, LastName: u.LastName, Phone: u.Phone,
			})
			if len(out) >= 30 {
				httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
				return
			}
		}
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

type smsLogView struct {
	ID     int64   `json:"id"`
	UserID *int64  `json:"user_id,omitempty"`
	Phone  string  `json:"phone"`
	Body   string  `json:"body"`
	Status string  `json:"status"`
	SentAt string  `json:"sent_at"`
}

func (h *SMSHandler) ListLogs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	f := repository.SMSLogFilter{}
	if v := q.Get("user_id"); v != "" {
		n, err := strconv.ParseInt(v, 10, 64)
		if err != nil || n <= 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid user_id")
			return
		}
		f.UserID = &n
	}
	if v := q.Get("from"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "from must be YYYY-MM-DD")
			return
		}
		f.From = &t
	}
	if v := q.Get("to"); v != "" {
		t, err := time.Parse("2006-01-02", v)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "to must be YYYY-MM-DD")
			return
		}
		end := t.Add(24 * time.Hour)
		f.To = &end
	}
	if v := q.Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		f.Limit = n
	}
	rows, err := h.sms.Logs(r.Context(), f)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]smsLogView, 0, len(rows))
	for _, l := range rows {
		out = append(out, smsLogView{
			ID:     l.ID,
			UserID: l.UserID,
			Phone:  l.Phone,
			Body:   l.Body,
			Status: string(l.Status),
			SentAt: l.SentAt.Format(time.RFC3339),
		})
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func bulkResultView(res *service.BulkSendResult) bulkSMSResp {
	v := bulkSMSResp{Sent: res.Sent, Failed: res.Failed}
	if len(res.Failures) > 0 {
		v.Failures = make([]bulkFailureView, 0, len(res.Failures))
		for _, f := range res.Failures {
			v.Failures = append(v.Failures, bulkFailureView{UserID: f.UserID, Phone: f.Phone, Error: f.Error})
		}
	}
	return v
}

func matchUser(u *domain.User, q string) bool {
	needle := strings.ToLower(q)
	full := strings.ToLower(u.FirstName + " " + u.LastName)
	if strings.Contains(full, needle) {
		return true
	}
	return strings.Contains(strings.ToLower(u.Phone), needle)
}
