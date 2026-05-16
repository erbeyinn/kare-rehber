package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/repository"
)

type LogsHandler struct {
	audit *repository.AuditRepo
	users *repository.UserRepo
}

func NewLogsHandler(audit *repository.AuditRepo, users *repository.UserRepo) *LogsHandler {
	return &LogsHandler{audit: audit, users: users}
}

type logActorView struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type logView struct {
	ID         int64           `json:"id"`
	EntityType string          `json:"entity_type"`
	EntityID   int64           `json:"entity_id"`
	Action     string          `json:"action"`
	Actor      *logActorView   `json:"actor,omitempty"`
	Diff       json.RawMessage `json:"diff"`
	CreatedAt  string          `json:"created_at"`
}

func (h *LogsHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var f repository.AuditFilter
	if v := q.Get("entity_type"); v != "" {
		f.EntityType = &v
	}
	if v := q.Get("entity_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid entity_id")
			return
		}
		f.EntityID = &id
	}
	if v := q.Get("actor_id"); v != "" {
		id, err := strconv.ParseInt(v, 10, 64)
		if err != nil || id <= 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid actor_id")
			return
		}
		f.ActorID = &id
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
		// inclusive end of day
		end := t.Add(24*time.Hour - time.Nanosecond)
		f.To = &end
	}
	if v := q.Get("limit"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n <= 0 {
			httputil.WriteError(w, http.StatusBadRequest, "invalid limit")
			return
		}
		f.Limit = n
	}

	rows, err := h.audit.List(r.Context(), f)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}

	actorIDSet := make(map[int64]struct{}, len(rows))
	for _, a := range rows {
		if a.ActorID != nil {
			actorIDSet[*a.ActorID] = struct{}{}
		}
	}
	actorIDs := make([]int64, 0, len(actorIDSet))
	for id := range actorIDSet {
		actorIDs = append(actorIDs, id)
	}
	actors, err := h.users.ListByIDs(r.Context(), actorIDs)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "actor hydrate failed")
		return
	}

	out := make([]logView, 0, len(rows))
	for _, a := range rows {
		v := logView{
			ID:         a.ID,
			EntityType: a.EntityType,
			EntityID:   a.EntityID,
			Action:     a.Action,
			Diff:       json.RawMessage(a.Diff),
			CreatedAt:  a.CreatedAt.Format(time.RFC3339),
		}
		if a.ActorID != nil {
			if u, ok := actors[*a.ActorID]; ok {
				v.Actor = &logActorView{ID: u.ID, FirstName: u.FirstName, LastName: u.LastName}
			}
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}
