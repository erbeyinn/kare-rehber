package handlers

import (
	"net/http"

	"kare-rehber/backend/internal/domain"
	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/http/middleware"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/service"
)

type MatchesHandler struct {
	matching *service.MatchingService
	users    *repository.UserRepo
}

func NewMatchesHandler(matching *service.MatchingService, users *repository.UserRepo) *MatchesHandler {
	return &MatchesHandler{matching: matching, users: users}
}

type matchedUserView struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
}

type myMatchesResp struct {
	Coach       *matchedUserView `json:"coach,omitempty"`
	Coordinator *matchedUserView `json:"coordinator,omitempty"`
}

// MyMatches returns the coach + coordinator assigned to the authenticated
// student. Only students are allowed; other roles get 403.
func (h *MatchesHandler) MyMatches(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	if claims.Role != domain.RoleStudent {
		httputil.WriteError(w, http.StatusForbidden, "students only")
		return
	}
	coach, coord, err := h.matching.StudentMatches(r.Context(), claims.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "lookup failed")
		return
	}
	resp := myMatchesResp{}
	if coach != nil {
		resp.Coach = &matchedUserView{ID: coach.ID, FirstName: coach.FirstName, LastName: coach.LastName, Phone: coach.Phone}
	}
	if coord != nil {
		resp.Coordinator = &matchedUserView{ID: coord.ID, FirstName: coord.FirstName, LastName: coord.LastName, Phone: coord.Phone}
	}
	httputil.WriteJSON(w, http.StatusOK, resp)
}
