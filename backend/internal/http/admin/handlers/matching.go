package handlers

import (
	"encoding/json"
	"net/http"

	"kare-rehber/backend/internal/domain"
	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/http/middleware"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/service"
)

type MatchingHandler struct {
	matching *service.MatchingService
	students *repository.StudentRepo
	users    *repository.UserRepo
	coaches  *repository.CoachRepo
}

func NewMatchingHandler(
	matching *service.MatchingService,
	students *repository.StudentRepo,
	users *repository.UserRepo,
	coaches *repository.CoachRepo,
) *MatchingHandler {
	return &MatchingHandler{matching: matching, students: students, users: users, coaches: coaches}
}

type matchTargetView struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}

type matchingStudentView struct {
	ID          int64            `json:"id"`
	FirstName   string           `json:"first_name"`
	LastName    string           `json:"last_name"`
	City        *string          `json:"city,omitempty"`
	School      *string          `json:"school,omitempty"`
	Grade       *string          `json:"grade,omitempty"`
	Coach       *matchTargetView `json:"coach,omitempty"`
	Coordinator *matchTargetView `json:"coordinator,omitempty"`
}

type matchTargetListView struct {
	ID        int64   `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Phone     string  `json:"phone"`
	City      *string `json:"city,omitempty"`
	Specialty *string `json:"specialty,omitempty"`
}

func (h *MatchingHandler) ListStudents(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var city *string
	if v := q.Get("city"); v != "" {
		city = &v
	}
	var t domain.MatchType
	if v := q.Get("type"); v != "" {
		t = domain.MatchType(v)
		if !t.Valid() {
			httputil.WriteError(w, http.StatusBadRequest, "invalid type")
			return
		}
	}
	unmatched := q.Get("unmatched") == "true"

	rows, err := h.matching.ListStudentsWithMatches(r.Context(), service.StudentListFilter{
		City:      city,
		Type:      t,
		Unmatched: unmatched,
	})
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]matchingStudentView, 0, len(rows))
	for _, v := range rows {
		view := matchingStudentView{
			ID:        v.Student.ID,
			FirstName: v.Student.FirstName,
			LastName:  v.Student.LastName,
			City:      v.Detail.City,
			School:    v.Detail.School,
			Grade:     v.Detail.Grade,
		}
		if v.Coach != nil {
			view.Coach = &matchTargetView{ID: v.Coach.ID, FirstName: v.Coach.FirstName, LastName: v.Coach.LastName}
		}
		if v.Coordinator != nil {
			view.Coordinator = &matchTargetView{ID: v.Coordinator.ID, FirstName: v.Coordinator.FirstName, LastName: v.Coordinator.LastName}
		}
		out = append(out, view)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *MatchingHandler) ListCities(w http.ResponseWriter, r *http.Request) {
	cities, err := h.students.DistinctCities(r.Context())
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	if cities == nil {
		cities = []string{}
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": cities})
}

func (h *MatchingHandler) ListCoachTargets(w http.ResponseWriter, r *http.Request) {
	approved := true
	rows, err := h.coaches.List(r.Context(), &approved)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]matchTargetListView, 0, len(rows))
	for _, cw := range rows {
		out = append(out, matchTargetListView{
			ID:        cw.User.ID,
			FirstName: cw.User.FirstName,
			LastName:  cw.User.LastName,
			Phone:     cw.User.Phone,
			Specialty: cw.Coach.Specialty,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *MatchingHandler) ListCoordinatorTargets(w http.ResponseWriter, r *http.Request) {
	rows, err := h.users.ListByRole(r.Context(), domain.RoleCoordinator)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]matchTargetListView, 0, len(rows))
	for _, u := range rows {
		if !u.IsActive {
			continue
		}
		out = append(out, matchTargetListView{
			ID:        u.ID,
			FirstName: u.FirstName,
			LastName:  u.LastName,
			Phone:     u.Phone,
		})
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

type bulkMatchReq struct {
	StudentIDs []int64 `json:"student_ids"`
	TargetID   int64   `json:"target_id"`
	Type       string  `json:"type"`
}

func (h *MatchingHandler) BulkMatch(w http.ResponseWriter, r *http.Request) {
	var req bulkMatchReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if len(req.StudentIDs) == 0 || req.TargetID == 0 {
		httputil.WriteError(w, http.StatusBadRequest, "student_ids and target_id required")
		return
	}
	t := domain.MatchType(req.Type)
	if !t.Valid() {
		httputil.WriteError(w, http.StatusBadRequest, "invalid type")
		return
	}
	claims, _ := middleware.ClaimsFrom(r.Context())
	if claims == nil {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	if err := h.matching.BulkMatch(r.Context(), req.StudentIDs, req.TargetID, t, claims.UserID); err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"count": len(req.StudentIDs)})
}

func (h *MatchingHandler) Unmatch(w http.ResponseWriter, r *http.Request) {
	sid, ok := pathID(w, r, "student_id")
	if !ok {
		return
	}
	t := domain.MatchType(r.URL.Query().Get("type"))
	if !t.Valid() {
		httputil.WriteError(w, http.StatusBadRequest, "invalid type")
		return
	}
	if err := h.matching.Unmatch(r.Context(), sid, t); err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
