package auth

import (
	"context"
	"errors"
	"time"

	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
)

type PublicAuth struct {
	users *repository.UserRepo
	jwt   *JWT
}

func NewPublicAuth(users *repository.UserRepo, jwt *JWT) *PublicAuth {
	return &PublicAuth{users: users, jwt: jwt}
}

type PublicLoginResult struct {
	Token string
	User  *domain.User
}

func (a *PublicAuth) LoginByPhone(ctx context.Context, phone string, birthdate time.Time, password string) (*PublicLoginResult, error) {
	u, err := a.users.GetByPhoneAndBirthdate(ctx, phone, birthdate)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if u.Role == domain.RoleAdmin {
		return nil, ErrInvalidCredentials
	}
	if !VerifyPassword(u.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}
	tok, err := a.jwt.Issue(u.ID, u.Role)
	if err != nil {
		return nil, err
	}
	return &PublicLoginResult{Token: tok, User: u}, nil
}
