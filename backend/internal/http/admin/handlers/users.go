package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"time"

	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/service"
)

type UsersHandler struct {
	reg      *service.RegistrationService
	users    *repository.UserRepo
	students *repository.StudentRepo
	coaches  *repository.CoachRepo
}

func NewUsersHandler(
	reg *service.RegistrationService,
	users *repository.UserRepo,
	students *repository.StudentRepo,
	coaches *repository.CoachRepo,
) *UsersHandler {
	return &UsersHandler{reg: reg, users: users, students: students, coaches: coaches}
}

type studentView struct {
	ID        int64   `json:"id"`
	FirstName string  `json:"first_name"`
	LastName  string  `json:"last_name"`
	Phone     string  `json:"phone"`
	Birthdate string  `json:"birthdate"`
	IsActive  bool    `json:"is_active"`
	School    *string `json:"school,omitempty"`
	Grade     *string `json:"grade,omitempty"`
	City      *string `json:"city,omitempty"`
	Parent    *parentView `json:"parent,omitempty"`
}

type parentView struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Birthdate string `json:"birthdate"`
	IsActive  bool   `json:"is_active"`
}

type coachView struct {
	ID         int64   `json:"id"`
	FirstName  string  `json:"first_name"`
	LastName   string  `json:"last_name"`
	Phone      string  `json:"phone"`
	Birthdate  string  `json:"birthdate"`
	Email      string  `json:"email,omitempty"`
	IsActive   bool    `json:"is_active"`
	IsApproved bool    `json:"is_approved"`
	Specialty  *string `json:"specialty,omitempty"`
}

type simpleUserView struct {
	ID        int64  `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Birthdate string `json:"birthdate"`
	Email     string `json:"email,omitempty"`
	IsActive  bool   `json:"is_active"`
}

func (h *UsersHandler) ListStudents(w http.ResponseWriter, r *http.Request) {
	active := parseStatusFilter(r.URL.Query().Get("status"))
	rows, err := h.students.List(r.Context(), active)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]studentView, 0, len(rows))
	for _, sw := range rows {
		v := studentView{
			ID:        sw.User.ID,
			FirstName: sw.User.FirstName,
			LastName:  sw.User.LastName,
			Phone:     sw.User.Phone,
			Birthdate: sw.User.Birthdate.Format("2006-01-02"),
			IsActive:  sw.User.IsActive,
			School:    sw.Student.School,
			Grade:     sw.Student.Grade,
			City:      sw.Student.City,
		}
		if sw.Parent != nil {
			v.Parent = &parentView{
				ID:        sw.Parent.ID,
				FirstName: sw.Parent.FirstName,
				LastName:  sw.Parent.LastName,
				Phone:     sw.Parent.Phone,
				Birthdate: sw.Parent.Birthdate.Format("2006-01-02"),
				IsActive:  sw.Parent.IsActive,
			}
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *UsersHandler) GetStudent(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	u, err := h.users.GetByID(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not found")
		return
	}
	stu, err := h.students.GetByUserID(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not found")
		return
	}
	v := studentView{
		ID:        u.ID,
		FirstName: u.FirstName,
		LastName:  u.LastName,
		Phone:     u.Phone,
		Birthdate: u.Birthdate.Format("2006-01-02"),
		IsActive:  u.IsActive,
		School:    stu.School,
		Grade:     stu.Grade,
		City:      stu.City,
	}
	if stu.ParentID != nil {
		p, err := h.users.GetByID(r.Context(), *stu.ParentID)
		if err == nil {
			v.Parent = &parentView{
				ID:        p.ID,
				FirstName: p.FirstName,
				LastName:  p.LastName,
				Phone:     p.Phone,
				Birthdate: p.Birthdate.Format("2006-01-02"),
				IsActive:  p.IsActive,
			}
		}
	}
	httputil.WriteJSON(w, http.StatusOK, v)
}

func (h *UsersHandler) ApproveStudent(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	if err := h.reg.ApproveStudent(r.Context(), id); err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

func (h *UsersHandler) ListCoaches(w http.ResponseWriter, r *http.Request) {
	var approved *bool
	switch r.URL.Query().Get("status") {
	case "pending":
		v := false
		approved = &v
	case "active":
		v := true
		approved = &v
	}
	rows, err := h.coaches.List(r.Context(), approved)
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]coachView, 0, len(rows))
	for _, cw := range rows {
		v := coachView{
			ID:         cw.User.ID,
			FirstName:  cw.User.FirstName,
			LastName:   cw.User.LastName,
			Phone:      cw.User.Phone,
			Birthdate:  cw.User.Birthdate.Format("2006-01-02"),
			IsActive:   cw.User.IsActive,
			IsApproved: cw.Coach.IsApproved,
			Specialty:  cw.Coach.Specialty,
		}
		if cw.User.Email != nil {
			v.Email = *cw.User.Email
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *UsersHandler) GetCoach(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	u, err := h.users.GetByID(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not found")
		return
	}
	c, err := h.coaches.GetByUserID(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not found")
		return
	}
	v := coachView{
		ID:         u.ID,
		FirstName:  u.FirstName,
		LastName:   u.LastName,
		Phone:      u.Phone,
		Birthdate:  u.Birthdate.Format("2006-01-02"),
		IsActive:   u.IsActive,
		IsApproved: c.IsApproved,
		Specialty:  c.Specialty,
	}
	if u.Email != nil {
		v.Email = *u.Email
	}
	httputil.WriteJSON(w, http.StatusOK, v)
}

func (h *UsersHandler) ApproveCoach(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	if err := h.reg.ApproveCoach(r.Context(), id); err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

type coordinatorReq struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Birthdate string `json:"birthdate"`
}

func (h *UsersHandler) ListCoordinators(w http.ResponseWriter, r *http.Request) {
	rows, err := h.users.ListByRole(r.Context(), "coordinator")
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]simpleUserView, 0, len(rows))
	for _, u := range rows {
		v := simpleUserView{
			ID: u.ID, FirstName: u.FirstName, LastName: u.LastName,
			Phone:    u.Phone,
			Birthdate: u.Birthdate.Format("2006-01-02"),
			IsActive: u.IsActive,
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *UsersHandler) CreateCoordinator(w http.ResponseWriter, r *http.Request) {
	var req coordinatorReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	dob, err := time.Parse("2006-01-02", req.Birthdate)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "birthdate must be YYYY-MM-DD")
		return
	}
	u, err := h.reg.CreateCoordinator(r.Context(), service.CoordinatorCreate{
		FirstName: req.FirstName, LastName: req.LastName,
		Phone: req.Phone, Birthdate: dob,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, simpleUserView{
		ID: u.ID, FirstName: u.FirstName, LastName: u.LastName,
		Phone: u.Phone, Birthdate: u.Birthdate.Format("2006-01-02"), IsActive: u.IsActive,
	})
}

func (h *UsersHandler) UpdateCoordinator(w http.ResponseWriter, r *http.Request) {
	h.updateBasic(w, r, "coordinator")
}

type adminReq struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Birthdate string `json:"birthdate"`
	Email     string `json:"email"`
	Password  string `json:"password"`
}

func (h *UsersHandler) ListAdmins(w http.ResponseWriter, r *http.Request) {
	rows, err := h.users.ListByRole(r.Context(), "admin")
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "list failed")
		return
	}
	out := make([]simpleUserView, 0, len(rows))
	for _, u := range rows {
		v := simpleUserView{
			ID: u.ID, FirstName: u.FirstName, LastName: u.LastName,
			Phone: u.Phone, Birthdate: u.Birthdate.Format("2006-01-02"),
			IsActive: u.IsActive,
		}
		if u.Email != nil {
			v.Email = *u.Email
		}
		out = append(out, v)
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]any{"items": out})
}

func (h *UsersHandler) CreateAdmin(w http.ResponseWriter, r *http.Request) {
	var req adminReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	dob, err := time.Parse("2006-01-02", req.Birthdate)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "birthdate must be YYYY-MM-DD")
		return
	}
	u, err := h.reg.CreateAdmin(r.Context(), service.AdminCreate{
		FirstName: req.FirstName, LastName: req.LastName,
		Phone: req.Phone, Birthdate: dob,
		Email: req.Email, Password: req.Password,
	})
	if err != nil {
		writeServiceError(w, err)
		return
	}
	v := simpleUserView{
		ID: u.ID, FirstName: u.FirstName, LastName: u.LastName,
		Phone: u.Phone, Birthdate: u.Birthdate.Format("2006-01-02"),
		IsActive: u.IsActive,
	}
	if u.Email != nil {
		v.Email = *u.Email
	}
	httputil.WriteJSON(w, http.StatusCreated, v)
}

func (h *UsersHandler) UpdateAdmin(w http.ResponseWriter, r *http.Request) {
	h.updateBasic(w, r, "admin")
}

func (h *UsersHandler) updateBasic(w http.ResponseWriter, r *http.Request, role string) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	existing, err := h.users.GetByID(r.Context(), id)
	if err != nil {
		httputil.WriteError(w, http.StatusNotFound, "not found")
		return
	}
	if string(existing.Role) != role {
		httputil.WriteError(w, http.StatusBadRequest, "role mismatch")
		return
	}
	var req adminReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	dob := existing.Birthdate
	if req.Birthdate != "" {
		parsed, err := time.Parse("2006-01-02", req.Birthdate)
		if err != nil {
			httputil.WriteError(w, http.StatusBadRequest, "birthdate must be YYYY-MM-DD")
			return
		}
		dob = parsed
	}
	first := req.FirstName
	if first == "" {
		first = existing.FirstName
	}
	last := req.LastName
	if last == "" {
		last = existing.LastName
	}
	phone := req.Phone
	if phone == "" {
		phone = existing.Phone
	}
	var emailPtr *string
	if req.Email != "" {
		e := req.Email
		emailPtr = &e
	} else {
		emailPtr = existing.Email
	}
	u, err := h.users.Update(r.Context(), id, repository.UpdateUserParams{
		FirstName: first, LastName: last, Phone: phone, Birthdate: dob, Email: emailPtr,
	})
	if err != nil {
		httputil.WriteError(w, http.StatusInternalServerError, "update failed")
		return
	}
	v := simpleUserView{
		ID: u.ID, FirstName: u.FirstName, LastName: u.LastName,
		Phone: u.Phone, Birthdate: u.Birthdate.Format("2006-01-02"),
		IsActive: u.IsActive,
	}
	if u.Email != nil {
		v.Email = *u.Email
	}
	httputil.WriteJSON(w, http.StatusOK, v)
}

func (h *UsersHandler) SendCredentials(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(w, r, "id")
	if !ok {
		return
	}
	if err := h.reg.SendCredentials(r.Context(), id); err != nil {
		writeServiceError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusOK, map[string]string{"status": "sent"})
}

func pathID(w http.ResponseWriter, r *http.Request, key string) (int64, bool) {
	raw := r.PathValue(key)
	id, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || id <= 0 {
		httputil.WriteError(w, http.StatusBadRequest, "invalid id")
		return 0, false
	}
	return id, true
}

func parseStatusFilter(s string) *bool {
	switch s {
	case "pending":
		v := false
		return &v
	case "active":
		v := true
		return &v
	default:
		return nil
	}
}

func writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrAlreadyExists):
		httputil.WriteError(w, http.StatusConflict, err.Error())
	case errors.Is(err, service.ErrAlreadyActive):
		httputil.WriteError(w, http.StatusConflict, "already active")
	case errors.Is(err, service.ErrNotApprovable):
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrInvalidTransition):
		httputil.WriteError(w, http.StatusConflict, err.Error())
	case errors.Is(err, service.ErrForbidden):
		httputil.WriteError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, repository.ErrNotFound):
		httputil.WriteError(w, http.StatusNotFound, "not found")
	default:
		httputil.WriteError(w, http.StatusInternalServerError, "internal error")
	}
}
