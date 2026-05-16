package repository

import (
	"context"
	"errors"
	"strconv"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kare-rehber/backend/internal/domain"
)

type MessageRepo struct {
	pool *pgxpool.Pool
}

func NewMessageRepo(pool *pgxpool.Pool) *MessageRepo {
	return &MessageRepo{pool: pool}
}

const messageColumns = "id, sender_id, recipient_role, recipient_id, body, thread_id, read_at, created_at"

func scanMessage(row pgx.Row) (*domain.Message, error) {
	var m domain.Message
	if err := row.Scan(
		&m.ID, &m.SenderID, &m.RecipientRole, &m.RecipientID, &m.Body, &m.ThreadID, &m.ReadAt, &m.CreatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &m, nil
}

type CreateMessageParams struct {
	SenderID      int64
	RecipientRole domain.MessageRecipientRole
	RecipientID   *int64
	Body          string
	ThreadID      *int64
}

func (r *MessageRepo) Create(ctx context.Context, p CreateMessageParams) (*domain.Message, error) {
	if !p.RecipientRole.Valid() {
		return nil, errors.New("invalid recipient role")
	}
	row := r.pool.QueryRow(ctx,
		`INSERT INTO messages (sender_id, recipient_role, recipient_id, body, thread_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING `+messageColumns,
		p.SenderID, p.RecipientRole, p.RecipientID, p.Body, p.ThreadID,
	)
	return scanMessage(row)
}

func (r *MessageRepo) GetByID(ctx context.Context, id int64) (*domain.Message, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+messageColumns+` FROM messages WHERE id=$1`,
		id,
	)
	return scanMessage(row)
}

// ListByThread returns the root message and all replies of the thread,
// ordered chronologically. threadRootID must be the root message id
// (i.e. the message whose thread_id IS NULL).
func (r *MessageRepo) ListByThread(ctx context.Context, threadRootID int64) ([]*domain.Message, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+messageColumns+` FROM messages
		  WHERE id = $1 OR thread_id = $1
		  ORDER BY created_at ASC, id ASC`,
		threadRootID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.Message
	for rows.Next() {
		m, err := scanMessage(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// MarkRead marks every message in the thread that was not sent by viewerID
// as read (sets read_at = now()) if not already read.
func (r *MessageRepo) MarkRead(ctx context.Context, threadRootID, viewerID int64) error {
	_, err := r.pool.Exec(ctx,
		`UPDATE messages
		    SET read_at = now()
		  WHERE (id = $1 OR thread_id = $1)
		    AND sender_id <> $2
		    AND read_at IS NULL`,
		threadRootID, viewerID,
	)
	return err
}

type ThreadSummary struct {
	Root        *domain.Message
	Last        *domain.Message
	UnreadCount int
}

// ThreadFilter selects which thread roots are visible to a viewer.
type ThreadFilter struct {
	// SenderID, if set, requires the root message to have been sent by this user.
	// Used for student/parent inboxes (they only see threads they initiated).
	SenderID *int64
	// RecipientRole, if set, requires the root message to be addressed to this role.
	RecipientRole *domain.MessageRecipientRole
	// RecipientID, if set, requires the root message to be addressed to this specific recipient.
	// Used for coordinator inboxes.
	RecipientID *int64
	// RecipientIDIsNull, if true, requires recipient_id IS NULL (admin pool).
	RecipientIDIsNull bool
	// ParticipantID, if set, requires that user to have sent at least one message in the thread.
	// Used for admin "mine" filter.
	ParticipantID *int64
}

// ListThreadSummaries returns thread roots matching the filter, each paired with
// the last message in the thread and the unread count for viewerID.
// Threads are ordered by last activity descending.
func (r *MessageRepo) ListThreadSummaries(ctx context.Context, f ThreadFilter, viewerID int64) ([]*ThreadSummary, error) {
	var where []string
	var args []any
	where = append(where, "r.thread_id IS NULL")

	if f.SenderID != nil {
		args = append(args, *f.SenderID)
		where = append(where, "r.sender_id = $"+strconv.Itoa(len(args)))
	}
	if f.RecipientRole != nil {
		args = append(args, *f.RecipientRole)
		where = append(where, "r.recipient_role = $"+strconv.Itoa(len(args)))
	}
	if f.RecipientID != nil {
		args = append(args, *f.RecipientID)
		where = append(where, "r.recipient_id = $"+strconv.Itoa(len(args)))
	}
	if f.RecipientIDIsNull {
		where = append(where, "r.recipient_id IS NULL")
	}
	if f.ParticipantID != nil {
		args = append(args, *f.ParticipantID)
		where = append(where, "EXISTS (SELECT 1 FROM messages p WHERE (p.id = r.id OR p.thread_id = r.id) AND p.sender_id = $"+strconv.Itoa(len(args))+")")
	}

	args = append(args, viewerID)
	viewerArgIdx := strconv.Itoa(len(args))

	q := `SELECT
	         r.id, r.sender_id, r.recipient_role, r.recipient_id, r.body, r.thread_id, r.read_at, r.created_at,
	         l.id, l.sender_id, l.recipient_role, l.recipient_id, l.body, l.thread_id, l.read_at, l.created_at,
	         COALESCE(u.cnt, 0) AS unread
	      FROM messages r
	      LEFT JOIN LATERAL (
	          SELECT id, sender_id, recipient_role, recipient_id, body, thread_id, read_at, created_at
	          FROM messages
	          WHERE id = r.id OR thread_id = r.id
	          ORDER BY created_at DESC, id DESC
	          LIMIT 1
	      ) l ON true
	      LEFT JOIN LATERAL (
	          SELECT COUNT(*)::int AS cnt FROM messages
	          WHERE (id = r.id OR thread_id = r.id)
	            AND sender_id <> $` + viewerArgIdx + `
	            AND read_at IS NULL
	      ) u ON true
	      WHERE ` + strings.Join(where, " AND ") + `
	      ORDER BY l.created_at DESC, l.id DESC`

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*ThreadSummary
	for rows.Next() {
		var root, last domain.Message
		var unread int
		if err := rows.Scan(
			&root.ID, &root.SenderID, &root.RecipientRole, &root.RecipientID, &root.Body, &root.ThreadID, &root.ReadAt, &root.CreatedAt,
			&last.ID, &last.SenderID, &last.RecipientRole, &last.RecipientID, &last.Body, &last.ThreadID, &last.ReadAt, &last.CreatedAt,
			&unread,
		); err != nil {
			return nil, err
		}
		out = append(out, &ThreadSummary{Root: &root, Last: &last, UnreadCount: unread})
	}
	return out, rows.Err()
}

