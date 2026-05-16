package repository

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kare-rehber/backend/internal/domain"
)

type SMSLogRepo struct {
	pool *pgxpool.Pool
}

func NewSMSLogRepo(pool *pgxpool.Pool) *SMSLogRepo {
	return &SMSLogRepo{pool: pool}
}

const smsLogColumns = "id, user_id, phone, body, status, sent_at"

func scanSMSLog(row pgx.Row) (*domain.SMSLog, error) {
	var s domain.SMSLog
	if err := row.Scan(&s.ID, &s.UserID, &s.Phone, &s.Body, &s.Status, &s.SentAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &s, nil
}

type CreateSMSLogParams struct {
	UserID *int64
	Phone  string
	Body   string
	Status domain.SMSStatus
}

type SMSLogFilter struct {
	UserID *int64
	From   *time.Time
	To     *time.Time
	Limit  int
}

// List returns SMS log rows matching the filter, newest first. Limit is
// capped at 500 to keep responses bounded.
func (r *SMSLogRepo) List(ctx context.Context, f SMSLogFilter) ([]*domain.SMSLog, error) {
	q := `SELECT ` + smsLogColumns + ` FROM sms_logs`
	var args []any
	var where []string
	if f.UserID != nil {
		args = append(args, *f.UserID)
		where = append(where, "user_id = $"+strconv.Itoa(len(args)))
	}
	if f.From != nil {
		args = append(args, *f.From)
		where = append(where, "sent_at >= $"+strconv.Itoa(len(args)))
	}
	if f.To != nil {
		args = append(args, *f.To)
		where = append(where, "sent_at <= $"+strconv.Itoa(len(args)))
	}
	if len(where) > 0 {
		q += " WHERE " + strings.Join(where, " AND ")
	}
	q += " ORDER BY sent_at DESC, id DESC"
	limit := f.Limit
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	args = append(args, limit)
	q += " LIMIT $" + strconv.Itoa(len(args))

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.SMSLog
	for rows.Next() {
		l, err := scanSMSLog(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (r *SMSLogRepo) Create(ctx context.Context, p CreateSMSLogParams) (*domain.SMSLog, error) {
	status := p.Status
	if status == "" {
		status = domain.SMSStatusSent
	}
	row := r.pool.QueryRow(ctx,
		`INSERT INTO sms_logs (user_id, phone, body, status)
		 VALUES ($1, $2, $3, $4)
		 RETURNING `+smsLogColumns,
		p.UserID, p.Phone, p.Body, status,
	)
	return scanSMSLog(row)
}
