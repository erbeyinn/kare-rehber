package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kare-rehber/backend/internal/domain"
)

type MatchRepo struct {
	pool *pgxpool.Pool
}

func NewMatchRepo(pool *pgxpool.Pool) *MatchRepo {
	return &MatchRepo{pool: pool}
}

const matchColumns = "id, student_id, target_id, type, assigned_at, assigned_by"

func scanMatch(row pgx.Row) (*domain.Match, error) {
	var m domain.Match
	if err := row.Scan(&m.ID, &m.StudentID, &m.TargetID, &m.Type, &m.AssignedAt, &m.AssignedBy); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &m, nil
}

// BulkAssign assigns the same target to multiple students for a given type in a
// single transaction. Any existing match of that type for those students is
// overridden (ON CONFLICT update).
func (r *MatchRepo) BulkAssign(ctx context.Context, studentIDs []int64, targetID int64, t domain.MatchType, assignedBy int64) error {
	if len(studentIDs) == 0 {
		return nil
	}
	if !t.Valid() {
		return errors.New("invalid match type")
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for _, sid := range studentIDs {
		_, err := tx.Exec(ctx,
			`INSERT INTO matches (student_id, target_id, type, assigned_by)
			 VALUES ($1, $2, $3, $4)
			 ON CONFLICT (student_id, type)
			 DO UPDATE SET target_id = EXCLUDED.target_id,
			               assigned_at = now(),
			               assigned_by = EXCLUDED.assigned_by`,
			sid, targetID, t, assignedBy,
		)
		if err != nil {
			return err
		}
	}
	return tx.Commit(ctx)
}

func (r *MatchRepo) Unassign(ctx context.Context, studentID int64, t domain.MatchType) error {
	ct, err := r.pool.Exec(ctx,
		`DELETE FROM matches WHERE student_id=$1 AND type=$2`,
		studentID, t,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *MatchRepo) ListByStudent(ctx context.Context, studentID int64) ([]*domain.Match, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+matchColumns+` FROM matches WHERE student_id=$1`,
		studentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.Match
	for rows.Next() {
		m, err := scanMatch(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *MatchRepo) ListByTarget(ctx context.Context, targetID int64, t domain.MatchType) ([]*domain.Match, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+matchColumns+` FROM matches WHERE target_id=$1 AND type=$2`,
		targetID, t,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.Match
	for rows.Next() {
		m, err := scanMatch(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// CountStudentsByTarget returns the number of students assigned per target for
// the given type. Targets without matches are not present in the map.
func (r *MatchRepo) CountStudentsByTarget(ctx context.Context, targetIDs []int64, t domain.MatchType) (map[int64]int, error) {
	if len(targetIDs) == 0 {
		return map[int64]int{}, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT target_id, COUNT(*) FROM matches
		 WHERE target_id = ANY($1) AND type = $2
		 GROUP BY target_id`,
		targetIDs, t,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]int, len(targetIDs))
	for rows.Next() {
		var tid int64
		var n int
		if err := rows.Scan(&tid, &n); err != nil {
			return nil, err
		}
		out[tid] = n
	}
	return out, rows.Err()
}

// OldestAssignmentByTarget returns the earliest assigned_at per target for the
// given type. Used to compute "since when has this coach been waiting".
func (r *MatchRepo) OldestAssignmentByTarget(ctx context.Context, targetIDs []int64, t domain.MatchType) (map[int64]time.Time, error) {
	if len(targetIDs) == 0 {
		return map[int64]time.Time{}, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT target_id, MIN(assigned_at) FROM matches
		 WHERE target_id = ANY($1) AND type = $2
		 GROUP BY target_id`,
		targetIDs, t,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]time.Time, len(targetIDs))
	for rows.Next() {
		var tid int64
		var d time.Time
		if err := rows.Scan(&tid, &d); err != nil {
			return nil, err
		}
		out[tid] = d
	}
	return out, rows.Err()
}

// ListByStudents returns all matches for any of the given student IDs.
// Used to hydrate match info on student listings.
func (r *MatchRepo) ListByStudents(ctx context.Context, studentIDs []int64) ([]*domain.Match, error) {
	if len(studentIDs) == 0 {
		return nil, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT `+matchColumns+` FROM matches WHERE student_id = ANY($1)`,
		studentIDs,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.Match
	for rows.Next() {
		m, err := scanMatch(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
