package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"kare-rehber/backend/internal/auth"
	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/http/middleware"
	"kare-rehber/backend/internal/repository"
)

type PublicAuthHandler struct {
	auth  *auth.PublicAuth
	users *repository.UserRepo
}

func NewPublicAuthHandler(a *auth.PublicAuth, users *repository.UserRepo) *PublicAuthHandler {
	return &PublicAuthHandler{auth: a, users: users}
}

type publicLoginReq struct {
	Phone     string `json:"phone"`
	Birthdate string `json:"birthdate"`
	Password  string `json:"password"`
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
}

func (h *PublicAuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req publicLoginReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Phone == "" || req.Birthdate == "" || req.Password == "" {
		httputil.WriteError(w, http.StatusBadRequest, "phone, birthdate, password required")
		return
	}
	dob, err := time.Parse("2006-01-02", req.Birthdate)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "birthdate must be YYYY-MM-DD")
		return
	}
	res, err := h.auth.LoginByPhone(r.Context(), req.Phone, dob, req.Password)
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
		User: userView{
			ID: res.User.ID, Role: string(res.User.Role),
			FirstName: res.User.FirstName, LastName: res.User.LastName, Phone: res.User.Phone,
		},
	})
}

func (h *PublicAuthHandler) Me(w http.ResponseWriter, r *http.Request) {
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
	httputil.WriteJSON(w, http.StatusOK, userView{
		ID: u.ID, Role: string(u.Role),
		FirstName: u.FirstName, LastName: u.LastName, Phone: u.Phone,
	})
}
