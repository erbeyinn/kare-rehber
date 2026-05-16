package main

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"time"

	"kare-rehber/backend/internal/auth"
	"kare-rehber/backend/internal/config"
	"kare-rehber/backend/internal/db"
	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
)

func main() {
	cfg := config.Load()

	email := os.Getenv("SEED_ADMIN_EMAIL")
	password := os.Getenv("SEED_ADMIN_PASSWORD")
	firstName := getenv("SEED_ADMIN_FIRST_NAME", "Admin")
	lastName := getenv("SEED_ADMIN_LAST_NAME", "Kare")
	phone := getenv("SEED_ADMIN_PHONE", "+905550000000")
	birthdateStr := getenv("SEED_ADMIN_BIRTHDATE", "1990-01-01")

	if email == "" || password == "" {
		slog.Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set")
		os.Exit(1)
	}

	birthdate, err := time.Parse("2006-01-02", birthdateStr)
	if err != nil {
		slog.Error("invalid SEED_ADMIN_BIRTHDATE (want YYYY-MM-DD)", "err", err)
		os.Exit(1)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		slog.Error("db connect failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	users := repository.NewUserRepo(pool)

	if _, err := users.GetByEmail(ctx, email); err == nil {
		slog.Info("admin already exists, skipping", "email", email)
		return
	} else if !errors.Is(err, repository.ErrNotFound) {
		slog.Error("lookup failed", "err", err)
		os.Exit(1)
	}

	hash, err := auth.HashPassword(password)
	if err != nil {
		slog.Error("hash failed", "err", err)
		os.Exit(1)
	}

	u, err := users.Create(ctx, repository.CreateUserParams{
		Role:         domain.RoleAdmin,
		FirstName:    firstName,
		LastName:     lastName,
		Phone:        phone,
		Birthdate:    birthdate,
		Email:        &email,
		PasswordHash: hash,
	})
	if err != nil {
		slog.Error("create admin failed", "err", err)
		os.Exit(1)
	}
	slog.Info("admin created", "id", u.ID, "email", email)
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}
