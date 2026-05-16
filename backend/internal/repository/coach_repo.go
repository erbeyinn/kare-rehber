package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kare-rehber/backend/internal/domain"
)

type CoachRepo struct {
	pool *pgxpool.Pool
}

func NewCoachRepo(pool *pgxpool.Pool) *CoachRepo {
	return &CoachRepo{pool: pool}
}

const coachColumns = "user_id, specialty, is_approved"

func scanCoach(row pgx.Row) (*domain.Coach, error) {
	var c domain.Coach
	if err := row.Scan(&c.UserID, &c.Specialty, &c.IsApproved); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &c, nil
}

type CreateCoachParams struct {
	UserID    int64
	Specialty *string
}

func (r *CoachRepo) Create(ctx context.Context, p CreateCoachParams) (*domain.Coach, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO coaches (user_id, specialty, is_approved)
		 VALUES ($1, $2, false)
		 RETURNING `+coachColumns,
		p.UserID, p.Specialty,
	)
	return scanCoach(row)
}

func (r *CoachRepo) GetByUserID(ctx context.Context, userID int64) (*domain.Coach, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+coachColumns+` FROM coaches WHERE user_id=$1`,
		userID,
	)
	return scanCoach(row)
}

func (r *CoachRepo) SetApproved(ctx context.Context, userID int64, approved bool) error {
	ct, err := r.pool.Exec(ctx,
		`UPDATE coaches SET is_approved=$1 WHERE user_id=$2`,
		approved, userID,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

type CoachWithUser struct {
	Coach domain.Coach
	User  domain.User
}

func (r *CoachRepo) List(ctx context.Context, approvedOnly *bool) ([]*CoachWithUser, error) {
	q := `SELECT
		c.user_id, c.specialty, c.is_approved,
		u.id, u.role, u.first_name, u.last_name, u.phone, u.birthdate, u.email, u.password_hash, u.is_active, u.created_at, u.updated_at
		FROM coaches c
		JOIN users u ON u.id = c.user_id`
	var args []any
	if approvedOnly != nil {
		q += ` WHERE c.is_approved = $1`
		args = append(args, *approvedOnly)
	}
	q += ` ORDER BY u.created_at DESC`

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*CoachWithUser
	for rows.Next() {
		var c domain.Coach
		var u domain.User
		var email *string
		if err := rows.Scan(
			&c.UserID, &c.Specialty, &c.IsApproved,
			&u.ID, &u.Role, &u.FirstName, &u.LastName, &u.Phone, &u.Birthdate, &email, &u.PasswordHash, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		u.Email = email
		out = append(out, &CoachWithUser{Coach: c, User: u})
	}
	return out, rows.Err()
}
