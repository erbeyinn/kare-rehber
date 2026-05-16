package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	httputil "kare-rehber/backend/internal/http"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/service"
)

type RegisterHandler struct {
	reg *service.RegistrationService
}

func NewRegisterHandler(reg *service.RegistrationService) *RegisterHandler {
	return &RegisterHandler{reg: reg}
}

type studentRegisterReq struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Birthdate string `json:"birthdate"`
	School    string `json:"school"`
	Grade     string `json:"grade"`
	City      string `json:"city"`

	ParentFirstName string `json:"parent_first_name"`
	ParentLastName  string `json:"parent_last_name"`
	ParentPhone     string `json:"parent_phone"`
	ParentBirthdate string `json:"parent_birthdate"`
}

type coachRegisterReq struct {
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
	Phone     string `json:"phone"`
	Birthdate string `json:"birthdate"`
	Email     string `json:"email"`
	Specialty string `json:"specialty"`
}

func (h *RegisterHandler) Student(w http.ResponseWriter, r *http.Request) {
	var req studentRegisterReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	dob, err := time.Parse("2006-01-02", req.Birthdate)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "birthdate must be YYYY-MM-DD")
		return
	}
	pdob, err := time.Parse("2006-01-02", req.ParentBirthdate)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "parent_birthdate must be YYYY-MM-DD")
		return
	}
	in := service.StudentRegistration{
		FirstName: req.FirstName, LastName: req.LastName,
		Phone: req.Phone, Birthdate: dob,
		School: optStr(req.School), Grade: optStr(req.Grade), City: optStr(req.City),
		ParentFirstName: req.ParentFirstName, ParentLastName: req.ParentLastName,
		ParentPhone: req.ParentPhone, ParentBirthdate: pdob,
	}
	res, err := h.reg.RegisterStudent(r.Context(), in)
	if err != nil {
		writeRegisterError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, map[string]any{
		"student_id": res.Student.ID,
		"parent_id":  res.Parent.ID,
		"status":     "pending",
	})
}

func (h *RegisterHandler) Coach(w http.ResponseWriter, r *http.Request) {
	var req coachRegisterReq
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "invalid body")
		return
	}
	dob, err := time.Parse("2006-01-02", req.Birthdate)
	if err != nil {
		httputil.WriteError(w, http.StatusBadRequest, "birthdate must be YYYY-MM-DD")
		return
	}
	in := service.CoachRegistration{
		FirstName: req.FirstName, LastName: req.LastName,
		Phone: req.Phone, Birthdate: dob,
		Email:     optStr(req.Email),
		Specialty: optStr(req.Specialty),
	}
	u, err := h.reg.RegisterCoach(r.Context(), in)
	if err != nil {
		writeRegisterError(w, err)
		return
	}
	httputil.WriteJSON(w, http.StatusCreated, map[string]any{
		"coach_id": u.ID,
		"status":   "pending",
	})
}

func optStr(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

func writeRegisterError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidInput):
		httputil.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrAlreadyExists):
		httputil.WriteError(w, http.StatusConflict, err.Error())
	case errors.Is(err, repository.ErrNotFound):
		httputil.WriteError(w, http.StatusNotFound, "not found")
	default:
		httputil.WriteError(w, http.StatusInternalServerError, "internal error")
	}
}
