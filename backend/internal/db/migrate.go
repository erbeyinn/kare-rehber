package db

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"

	"kare-rehber/backend/migrations"
)

func RunMigrations(ctx context.Context, url string) error {
	if url == "" {
		return fmt.Errorf("DATABASE_URL is empty")
	}
	sqlDB, err := sql.Open("pgx", url)
	if err != nil {
		return fmt.Errorf("sql.Open: %w", err)
	}
	defer sqlDB.Close()

	goose.SetBaseFS(migrations.FS)
	if err := goose.SetDialect("postgres"); err != nil {
		return fmt.Errorf("goose.SetDialect: %w", err)
	}
	if err := goose.UpContext(ctx, sqlDB, "."); err != nil {
		return fmt.Errorf("goose.Up: %w", err)
	}
	return nil
}
