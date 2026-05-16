package repository

import (
	"context"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"kare-rehber/backend/internal/domain"
)

type AuditRepo struct {
	pool *pgxpool.Pool
}

func NewAuditRepo(pool *pgxpool.Pool) *AuditRepo {
	return &AuditRepo{pool: pool}
}

type CreateAuditParams struct {
	EntityType string
	EntityID   int64
	Action     string
	ActorID    *int64
	Diff       []byte // JSON-encoded {before, after, fields}
}

func (r *AuditRepo) Create(ctx context.Context, p CreateAuditParams) (*domain.AuditLog, error) {
	diff := p.Diff
	if len(diff) == 0 {
		diff = []byte("{}")
	}
	row := r.pool.QueryRow(ctx,
		`INSERT INTO audit_logs (entity_type, entity_id, action, actor_id, diff)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING id, entity_type, entity_id, action, actor_id, diff, created_at`,
		p.EntityType, p.EntityID, p.Action, p.ActorID, diff,
	)
	var a domain.AuditLog
	if err := row.Scan(&a.ID, &a.EntityType, &a.EntityID, &a.Action, &a.ActorID, &a.Diff, &a.CreatedAt); err != nil {
		return nil, err
	}
	return &a, nil
}

type AuditFilter struct {
	EntityType *string
	EntityID   *int64
	ActorID    *int64
	From       *time.Time
	To         *time.Time
	Limit      int
}

// List returns audit log rows ordered by newest first. Limit defaults to 200
// (max 500) — these tables grow fast and the UI is paginated client-side.
func (r *AuditRepo) List(ctx context.Context, f AuditFilter) ([]*domain.AuditLog, error) {
	q := `SELECT id, entity_type, entity_id, action, actor_id, diff, created_at FROM audit_logs`
	var args []any
	var where []string
	if f.EntityType != nil && *f.EntityType != "" {
		args = append(args, *f.EntityType)
		where = append(where, "entity_type = $"+strconv.Itoa(len(args)))
	}
	if f.EntityID != nil {
		args = append(args, *f.EntityID)
		where = append(where, "entity_id = $"+strconv.Itoa(len(args)))
	}
	if f.ActorID != nil {
		args = append(args, *f.ActorID)
		where = append(where, "actor_id = $"+strconv.Itoa(len(args)))
	}
	if f.From != nil {
		args = append(args, *f.From)
		where = append(where, "created_at >= $"+strconv.Itoa(len(args)))
	}
	if f.To != nil {
		args = append(args, *f.To)
		where = append(where, "created_at <= $"+strconv.Itoa(len(args)))
	}
	if len(where) > 0 {
		q += " WHERE " + strings.Join(where, " AND ")
	}
	q += " ORDER BY created_at DESC, id DESC"

	limit := f.Limit
	if limit <= 0 {
		limit = 200
	}
	if limit > 500 {
		limit = 500
	}
	args = append(args, limit)
	q += " LIMIT $" + strconv.Itoa(len(args))

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.AuditLog
	for rows.Next() {
		var a domain.AuditLog
		if err := rows.Scan(&a.ID, &a.EntityType, &a.EntityID, &a.Action, &a.ActorID, &a.Diff, &a.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, &a)
	}
	return out, rows.Err()
}
