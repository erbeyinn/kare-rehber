package domain

import "time"

type Role string

const (
	RoleAdmin       Role = "admin"
	RoleCoordinator Role = "coordinator"
	RoleCoach       Role = "coach"
	RoleStudent     Role = "student"
	RoleParent      Role = "parent"
)

func (r Role) Valid() bool {
	switch r {
	case RoleAdmin, RoleCoordinator, RoleCoach, RoleStudent, RoleParent:
		return true
	}
	return false
}

type User struct {
	ID           int64
	Role         Role
	FirstName    string
	LastName     string
	Phone        string
	Birthdate    time.Time
	Email        *string
	PasswordHash string
	IsActive     bool
	CreatedAt    time.Time
	UpdatedAt    time.Time
}
