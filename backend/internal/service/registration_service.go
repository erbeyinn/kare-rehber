package service

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"time"

	"kare-rehber/backend/internal/auth"
	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/sms"
)

var (
	ErrAlreadyExists  = errors.New("user already exists")
	ErrAlreadyActive  = errors.New("user already active")
	ErrInvalidInput   = errors.New("invalid input")
	ErrNotApprovable  = errors.New("user cannot be approved")
)

type RegistrationService struct {
	users    *repository.UserRepo
	students *repository.StudentRepo
	coaches  *repository.CoachRepo
	sms      sms.Provider
}

func NewRegistrationService(
	users *repository.UserRepo,
	students *repository.StudentRepo,
	coaches *repository.CoachRepo,
	smsProvider sms.Provider,
) *RegistrationService {
	return &RegistrationService{users: users, students: students, coaches: coaches, sms: smsProvider}
}

type StudentRegistration struct {
	FirstName string
	LastName  string
	Phone     string
	Birthdate time.Time
	School    *string
	Grade     *string
	City      *string

	ParentFirstName string
	ParentLastName  string
	ParentPhone     string
	ParentBirthdate time.Time
}

type StudentRegistrationResult struct {
	Student *domain.User
	Parent  *domain.User
}

func (s *RegistrationService) RegisterStudent(ctx context.Context, in StudentRegistration) (*StudentRegistrationResult, error) {
	if in.FirstName == "" || in.LastName == "" || in.Phone == "" || in.Birthdate.IsZero() {
		return nil, fmt.Errorf("%w: missing student fields", ErrInvalidInput)
	}
	if in.ParentFirstName == "" || in.ParentLastName == "" || in.ParentPhone == "" || in.ParentBirthdate.IsZero() {
		return nil, fmt.Errorf("%w: missing parent fields", ErrInvalidInput)
	}
	if _, err := s.users.GetByPhoneAndBirthdate(ctx, in.Phone, in.Birthdate); err == nil {
		return nil, fmt.Errorf("%w: student", ErrAlreadyExists)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	if _, err := s.users.GetByPhoneAndBirthdate(ctx, in.ParentPhone, in.ParentBirthdate); err == nil {
		return nil, fmt.Errorf("%w: parent", ErrAlreadyExists)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	placeholder, err := auth.HashPassword(randomPassword())
	if err != nil {
		return nil, err
	}

	parent, err := s.users.Create(ctx, repository.CreateUserParams{
		Role:         domain.RoleParent,
		FirstName:    in.ParentFirstName,
		LastName:     in.ParentLastName,
		Phone:        in.ParentPhone,
		Birthdate:    in.ParentBirthdate,
		PasswordHash: placeholder,
		IsActive:     false,
	})
	if err != nil {
		return nil, err
	}

	placeholderStu, err := auth.HashPassword(randomPassword())
	if err != nil {
		return nil, err
	}
	student, err := s.users.Create(ctx, repository.CreateUserParams{
		Role:         domain.RoleStudent,
		FirstName:    in.FirstName,
		LastName:     in.LastName,
		Phone:        in.Phone,
		Birthdate:    in.Birthdate,
		PasswordHash: placeholderStu,
		IsActive:     false,
	})
	if err != nil {
		return nil, err
	}

	parentID := parent.ID
	if _, err := s.students.Create(ctx, repository.CreateStudentParams{
		UserID:   student.ID,
		School:   in.School,
		Grade:    in.Grade,
		City:     in.City,
		ParentID: &parentID,
	}); err != nil {
		return nil, err
	}

	return &StudentRegistrationResult{Student: student, Parent: parent}, nil
}

type CoachRegistration struct {
	FirstName string
	LastName  string
	Phone     string
	Birthdate time.Time
	Email     *string
	Specialty *string
}

func (s *RegistrationService) RegisterCoach(ctx context.Context, in CoachRegistration) (*domain.User, error) {
	if in.FirstName == "" || in.LastName == "" || in.Phone == "" || in.Birthdate.IsZero() {
		return nil, fmt.Errorf("%w: missing coach fields", ErrInvalidInput)
	}
	if _, err := s.users.GetByPhoneAndBirthdate(ctx, in.Phone, in.Birthdate); err == nil {
		return nil, fmt.Errorf("%w: coach", ErrAlreadyExists)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}

	placeholder, err := auth.HashPassword(randomPassword())
	if err != nil {
		return nil, err
	}
	u, err := s.users.Create(ctx, repository.CreateUserParams{
		Role:         domain.RoleCoach,
		FirstName:    in.FirstName,
		LastName:     in.LastName,
		Phone:        in.Phone,
		Birthdate:    in.Birthdate,
		Email:        in.Email,
		PasswordHash: placeholder,
		IsActive:     false,
	})
	if err != nil {
		return nil, err
	}
	if _, err := s.coaches.Create(ctx, repository.CreateCoachParams{
		UserID:    u.ID,
		Specialty: in.Specialty,
	}); err != nil {
		return nil, err
	}
	return u, nil
}

func (s *RegistrationService) ApproveStudent(ctx context.Context, studentUserID int64) error {
	stu, err := s.users.GetByID(ctx, studentUserID)
	if err != nil {
		return err
	}
	if stu.Role != domain.RoleStudent {
		return fmt.Errorf("%w: not a student", ErrNotApprovable)
	}
	if stu.IsActive {
		return ErrAlreadyActive
	}
	rec, err := s.students.GetByUserID(ctx, studentUserID)
	if err != nil {
		return err
	}
	var parent *domain.User
	if rec.ParentID != nil {
		parent, err = s.users.GetByID(ctx, *rec.ParentID)
		if err != nil && !errors.Is(err, repository.ErrNotFound) {
			return err
		}
	}

	if err := s.activateAndSend(ctx, stu); err != nil {
		return err
	}
	if parent != nil && !parent.IsActive {
		if err := s.activateAndSend(ctx, parent); err != nil {
			return err
		}
	}
	return nil
}

func (s *RegistrationService) ApproveCoach(ctx context.Context, coachUserID int64) error {
	u, err := s.users.GetByID(ctx, coachUserID)
	if err != nil {
		return err
	}
	if u.Role != domain.RoleCoach {
		return fmt.Errorf("%w: not a coach", ErrNotApprovable)
	}
	if u.IsActive {
		return ErrAlreadyActive
	}
	if err := s.coaches.SetApproved(ctx, coachUserID, true); err != nil {
		return err
	}
	return s.activateAndSend(ctx, u)
}

type AdminCreate struct {
	FirstName string
	LastName  string
	Phone     string
	Birthdate time.Time
	Email     string
	Password  string
}

func (s *RegistrationService) CreateAdmin(ctx context.Context, in AdminCreate) (*domain.User, error) {
	if in.FirstName == "" || in.LastName == "" || in.Phone == "" || in.Birthdate.IsZero() || in.Email == "" || in.Password == "" {
		return nil, fmt.Errorf("%w: missing admin fields", ErrInvalidInput)
	}
	if _, err := s.users.GetByEmail(ctx, in.Email); err == nil {
		return nil, fmt.Errorf("%w: email", ErrAlreadyExists)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	if _, err := s.users.GetByPhoneAndBirthdate(ctx, in.Phone, in.Birthdate); err == nil {
		return nil, fmt.Errorf("%w: phone+birthdate", ErrAlreadyExists)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	hash, err := auth.HashPassword(in.Password)
	if err != nil {
		return nil, err
	}
	email := in.Email
	return s.users.Create(ctx, repository.CreateUserParams{
		Role:         domain.RoleAdmin,
		FirstName:    in.FirstName,
		LastName:     in.LastName,
		Phone:        in.Phone,
		Birthdate:    in.Birthdate,
		Email:        &email,
		PasswordHash: hash,
		IsActive:     true,
	})
}

type CoordinatorCreate struct {
	FirstName string
	LastName  string
	Phone     string
	Birthdate time.Time
}

func (s *RegistrationService) CreateCoordinator(ctx context.Context, in CoordinatorCreate) (*domain.User, error) {
	if in.FirstName == "" || in.LastName == "" || in.Phone == "" || in.Birthdate.IsZero() {
		return nil, fmt.Errorf("%w: missing coordinator fields", ErrInvalidInput)
	}
	if _, err := s.users.GetByPhoneAndBirthdate(ctx, in.Phone, in.Birthdate); err == nil {
		return nil, fmt.Errorf("%w: phone+birthdate", ErrAlreadyExists)
	} else if !errors.Is(err, repository.ErrNotFound) {
		return nil, err
	}
	placeholder, err := auth.HashPassword(randomPassword())
	if err != nil {
		return nil, err
	}
	return s.users.Create(ctx, repository.CreateUserParams{
		Role:         domain.RoleCoordinator,
		FirstName:    in.FirstName,
		LastName:     in.LastName,
		Phone:        in.Phone,
		Birthdate:    in.Birthdate,
		PasswordHash: placeholder,
		IsActive:     true,
	})
}

// SendCredentials regenerates the password and sends it via SMS — used for
// coordinators (no auto-SMS at creation) or as a manual resend.
func (s *RegistrationService) SendCredentials(ctx context.Context, userID int64) error {
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	return s.activateAndSend(ctx, u)
}

func (s *RegistrationService) activateAndSend(ctx context.Context, u *domain.User) error {
	pwd := randomPassword()
	hash, err := auth.HashPassword(pwd)
	if err != nil {
		return err
	}
	if err := s.users.SetPassword(ctx, u.ID, hash); err != nil {
		return err
	}
	if !u.IsActive {
		if err := s.users.SetActive(ctx, u.ID, true); err != nil {
			return err
		}
	}
	body := fmt.Sprintf(
		"KARE Rehber giris bilgileri\nKullanici (telefon): %s\nDogum tarihi: %s\nSifre: %s",
		u.Phone, u.Birthdate.Format("2006-01-02"), pwd,
	)
	id := u.ID
	return s.sms.Send(ctx, &id, u.Phone, body)
}

const passwordAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

func randomPassword() string {
	const n = 8
	buf := make([]byte, n)
	if _, err := rand.Read(buf); err != nil {
		// rand.Read on darwin/linux does not fail; if it does, fall back to a
		// deterministic but still non-trivial value.
		for i := range buf {
			buf[i] = byte(i + 1)
		}
	}
	out := make([]byte, n)
	for i, b := range buf {
		out[i] = passwordAlphabet[int(b)%len(passwordAlphabet)]
	}
	return string(out)
}
