package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"kare-rehber/backend/internal/auth"
	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/http/middleware"
	"kare-rehber/backend/internal/repository"
)

type AdminAuthHandler struct {
	auth  *auth.AdminAuth
	users *repository.UserRepo
}

func NewAdminAuthHandler(a *auth.AdminAuth, users *repository.UserRepo) *AdminAuthHandler {
	return &AdminAuthHandler{auth: a, users: users}
}

type adminLoginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResp struct {
	Token string   `json:"token"`
	User  userView `json:"user"`
}

type userView struct {
	ID        int64  `json:"id"`
	Role      string `json:"role"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Email     string `json:"email,omitempty"`
}

func (h *AdminAuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req adminLoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Email == "" || req.Password == "" {
		httputil.WriteError(w, http.StatusBadRequest, "email and password required")
		return
	}
	res, err := h.auth.LoginByEmail(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			httputil.WriteError(w, http.StatusUnauthorized, "invalid credentials")
			return
		}
		httputil.WriteError(w, http.StatusInternalServerError, "login failed")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, loginResp{
		Token: res.Token,
		User:  toUserView(res.User.ID, string(res.User.Role), res.User.FirstName, res.User.LastName, res.User.Phone, res.User.Email),
	})
}

func (h *AdminAuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	claims, ok := middleware.ClaimsFrom(r.Context())
	if !ok {
		httputil.WriteError(w, http.StatusUnauthorized, "unauthenticated")
		return
	}
	u, err := h.users.GetByID(r.Context(), claims.UserID)
	if err != nil {
		httputil.WriteError(w, http.StatusUnauthorized, "user not found")
		return
	}
	httputil.WriteJSON(w, http.StatusOK, toUserView(u.ID, string(u.Role), u.FirstName, u.LastName, u.Phone, u.Email))
}

func toUserView(id int64, role, first, last, phone string, email *string) userView {
	v := userView{ID: id, Role: role, FirstName: first, LastName: last, Phone: phone}
	if email != nil {
		v.Email = *email
	}
	return v
}
