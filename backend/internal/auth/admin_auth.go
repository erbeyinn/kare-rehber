package auth

import (
	"context"
	"errors"

	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
)

var ErrInvalidCredentials = errors.New("invalid credentials")

type AdminAuth struct {
	users *repository.UserRepo
	jwt   *JWT
}

func NewAdminAuth(users *repository.UserRepo, jwt *JWT) *AdminAuth {
	return &AdminAuth{users: users, jwt: jwt}
}

type AdminLoginResult struct {
	Token string
	User  *domain.User
}

func (a *AdminAuth) LoginByEmail(ctx context.Context, email, password string) (*AdminLoginResult, error) {
	u, err := a.users.GetByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}
	if u.Role != domain.RoleAdmin {
		return nil, ErrInvalidCredentials
	}
	if !VerifyPassword(u.PasswordHash, password) {
		return nil, ErrInvalidCredentials
	}
	tok, err := a.jwt.Issue(u.ID, u.Role)
	if err != nil {
		return nil, err
	}
	return &AdminLoginResult{Token: tok, User: u}, nil
}
