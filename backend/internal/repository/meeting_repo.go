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

type MeetingRepo struct {
	pool *pgxpool.Pool
}

func NewMeetingRepo(pool *pgxpool.Pool) *MeetingRepo {
	return &MeetingRepo{pool: pool}
}

const meetingColumns = "id, student_id, coach_id, meeting_date, content, evaluation, status, created_at, updated_at"

func scanMeeting(row pgx.Row) (*domain.Meeting, error) {
	var m domain.Meeting
	if err := row.Scan(
		&m.ID, &m.StudentID, &m.CoachID, &m.MeetingDate, &m.Content, &m.Evaluation, &m.Status, &m.CreatedAt, &m.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &m, nil
}

type CreateMeetingParams struct {
	StudentID   int64
	CoachID     int64
	MeetingDate time.Time
	Content     string
	Evaluation  string
	Status      domain.MeetingStatus
}

func (r *MeetingRepo) Create(ctx context.Context, p CreateMeetingParams) (*domain.Meeting, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO meetings (student_id, coach_id, meeting_date, content, evaluation, status)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING `+meetingColumns,
		p.StudentID, p.CoachID, p.MeetingDate, p.Content, p.Evaluation, p.Status,
	)
	return scanMeeting(row)
}

func (r *MeetingRepo) GetByID(ctx context.Context, id int64) (*domain.Meeting, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+meetingColumns+` FROM meetings WHERE id=$1`,
		id,
	)
	return scanMeeting(row)
}

type UpdateMeetingParams struct {
	MeetingDate time.Time
	Content     string
	Evaluation  string
	Status      domain.MeetingStatus
}

func (r *MeetingRepo) Update(ctx context.Context, id int64, p UpdateMeetingParams) (*domain.Meeting, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE meetings
		    SET meeting_date=$1, content=$2, evaluation=$3, status=$4, updated_at=now()
		  WHERE id=$5
		  RETURNING `+meetingColumns,
		p.MeetingDate, p.Content, p.Evaluation, p.Status, id,
	)
	return scanMeeting(row)
}

func (r *MeetingRepo) SetStatus(ctx context.Context, id int64, status domain.MeetingStatus) (*domain.Meeting, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE meetings SET status=$1, updated_at=now() WHERE id=$2 RETURNING `+meetingColumns,
		status, id,
	)
	return scanMeeting(row)
}

type MeetingFilter struct {
	StudentID *int64
	CoachID   *int64
	Status    *domain.MeetingStatus
	Statuses  []domain.MeetingStatus
}

func (r *MeetingRepo) List(ctx context.Context, f MeetingFilter) ([]*domain.Meeting, error) {
	q := `SELECT ` + meetingColumns + ` FROM meetings`
	var args []any
	var where []string
	if f.StudentID != nil {
		args = append(args, *f.StudentID)
		where = append(where, "student_id = $"+strconv.Itoa(len(args)))
	}
	if f.CoachID != nil {
		args = append(args, *f.CoachID)
		where = append(where, "coach_id = $"+strconv.Itoa(len(args)))
	}
	if f.Status != nil {
		args = append(args, *f.Status)
		where = append(where, "status = $"+strconv.Itoa(len(args)))
	}
	if len(f.Statuses) > 0 {
		args = append(args, f.Statuses)
		where = append(where, "status = ANY($"+strconv.Itoa(len(args))+")")
	}
	if len(where) > 0 {
		q += " WHERE " + strings.Join(where, " AND ")
	}
	q += " ORDER BY meeting_date DESC, id DESC"

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.Meeting
	for rows.Next() {
		m, err := scanMeeting(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

// LastMeetingByCoach returns the most recent meeting_date per coach for the
// given coach IDs. Coaches without any meeting are omitted from the map.
func (r *MeetingRepo) LastMeetingByCoach(ctx context.Context, coachIDs []int64) (map[int64]time.Time, error) {
	if len(coachIDs) == 0 {
		return map[int64]time.Time{}, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT coach_id, MAX(meeting_date) FROM meetings
		 WHERE coach_id = ANY($1)
		 GROUP BY coach_id`,
		coachIDs,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]time.Time, len(coachIDs))
	for rows.Next() {
		var cid int64
		var d time.Time
		if err := rows.Scan(&cid, &d); err != nil {
			return nil, err
		}
		out[cid] = d
	}
	return out, rows.Err()
}

// CountSince returns how many meetings have a meeting_date >= since.
// Used by overview dashboards (e.g. "this week").
func (r *MeetingRepo) CountSince(ctx context.Context, since time.Time) (int, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM meetings WHERE meeting_date >= $1`,
		since,
	)
	var n int
	if err := row.Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

// CountPendingApproval returns how many meetings are awaiting admin approval.
func (r *MeetingRepo) CountPendingApproval(ctx context.Context) (int, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM meetings WHERE status=$1`,
		domain.MeetingStatusPending,
	)
	var n int
	if err := row.Scan(&n); err != nil {
		return 0, err
	}
	return n, nil
}

type CoachMeetingStats struct {
	CoachID    int64
	Total      int
	Last30Days int
}

// CoachMeetingTotals returns per-coach total meetings + last 30 days for the
// given coach IDs. Coaches without any meeting are omitted.
func (r *MeetingRepo) CoachMeetingTotals(ctx context.Context, coachIDs []int64, since30 time.Time) (map[int64]*CoachMeetingStats, error) {
	if len(coachIDs) == 0 {
		return map[int64]*CoachMeetingStats{}, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT coach_id,
		        COUNT(*) AS total,
		        COUNT(*) FILTER (WHERE meeting_date >= $2) AS last30
		   FROM meetings
		  WHERE coach_id = ANY($1)
		  GROUP BY coach_id`,
		coachIDs, since30,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]*CoachMeetingStats, len(coachIDs))
	for rows.Next() {
		s := &CoachMeetingStats{}
		if err := rows.Scan(&s.CoachID, &s.Total, &s.Last30Days); err != nil {
			return nil, err
		}
		out[s.CoachID] = s
	}
	return out, rows.Err()
}

type StudentMeetingStats struct {
	StudentID     int64
	Total         int
	LastMeetingAt *time.Time
}

// StudentMeetingTotals returns per-student total meetings + last meeting date
// for the given student IDs. Students without any meeting are omitted.
func (r *MeetingRepo) StudentMeetingTotals(ctx context.Context, studentIDs []int64) (map[int64]*StudentMeetingStats, error) {
	if len(studentIDs) == 0 {
		return map[int64]*StudentMeetingStats{}, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT student_id, COUNT(*) AS total, MAX(meeting_date) AS last_at
		   FROM meetings
		  WHERE student_id = ANY($1)
		  GROUP BY student_id`,
		studentIDs,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]*StudentMeetingStats, len(studentIDs))
	for rows.Next() {
		s := &StudentMeetingStats{}
		var last time.Time
		if err := rows.Scan(&s.StudentID, &s.Total, &last); err != nil {
			return nil, err
		}
		l := last
		s.LastMeetingAt = &l
		out[s.StudentID] = s
	}
	return out, rows.Err()
}

type MeetingStatusCount struct {
	Status domain.MeetingStatus
	Count  int
}

// CountByStatusBetween returns the count of meetings in [from, to] grouped by
// status. from/to are inclusive boundaries on meeting_date.
func (r *MeetingRepo) CountByStatusBetween(ctx context.Context, from, to time.Time) ([]MeetingStatusCount, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT status, COUNT(*) FROM meetings
		  WHERE meeting_date >= $1 AND meeting_date <= $2
		  GROUP BY status`,
		from, to,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []MeetingStatusCount
	for rows.Next() {
		var mc MeetingStatusCount
		if err := rows.Scan(&mc.Status, &mc.Count); err != nil {
			return nil, err
		}
		out = append(out, mc)
	}
	return out, rows.Err()
}

type DailyMeetingBucket struct {
	Day   time.Time
	Count int
}

// DailyCountsBetween returns count per UTC day in [from, to] for meeting_date.
// Empty days are not returned — the caller fills the gaps.
func (r *MeetingRepo) DailyCountsBetween(ctx context.Context, from, to time.Time) ([]DailyMeetingBucket, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT date_trunc('day', meeting_date) AS day, COUNT(*) AS n
		   FROM meetings
		  WHERE meeting_date >= $1 AND meeting_date <= $2
		  GROUP BY day
		  ORDER BY day`,
		from, to,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []DailyMeetingBucket
	for rows.Next() {
		var b DailyMeetingBucket
		if err := rows.Scan(&b.Day, &b.Count); err != nil {
			return nil, err
		}
		out = append(out, b)
	}
	return out, rows.Err()
}

// ListForStudents returns all meetings whose student_id is in studentIDs,
// optionally filtered by status. Used to hydrate parent / coordinator views.
func (r *MeetingRepo) ListForStudents(ctx context.Context, studentIDs []int64, status *domain.MeetingStatus) ([]*domain.Meeting, error) {
	if len(studentIDs) == 0 {
		return nil, nil
	}
	q := `SELECT ` + meetingColumns + ` FROM meetings WHERE student_id = ANY($1)`
	args := []any{studentIDs}
	if status != nil {
		q += ` AND status = $2`
		args = append(args, *status)
	}
	q += ` ORDER BY meeting_date DESC, id DESC`

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.Meeting
	for rows.Next() {
		m, err := scanMeeting(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, m)
	}
	return out, rows.Err()
}
