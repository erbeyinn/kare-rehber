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

type StudentRepo struct {
	pool *pgxpool.Pool
}

func NewStudentRepo(pool *pgxpool.Pool) *StudentRepo {
	return &StudentRepo{pool: pool}
}

const studentColumns = "user_id, school, grade, city, parent_id"

func scanStudent(row pgx.Row) (*domain.Student, error) {
	var s domain.Student
	if err := row.Scan(&s.UserID, &s.School, &s.Grade, &s.City, &s.ParentID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &s, nil
}

type CreateStudentParams struct {
	UserID   int64
	School   *string
	Grade    *string
	City     *string
	ParentID *int64
}

func (r *StudentRepo) Create(ctx context.Context, p CreateStudentParams) (*domain.Student, error) {
	row := r.pool.QueryRow(ctx,
		`INSERT INTO students (user_id, school, grade, city, parent_id)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING `+studentColumns,
		p.UserID, p.School, p.Grade, p.City, p.ParentID,
	)
	return scanStudent(row)
}

func (r *StudentRepo) GetByUserID(ctx context.Context, userID int64) (*domain.Student, error) {
	row := r.pool.QueryRow(ctx,
		`SELECT `+studentColumns+` FROM students WHERE user_id=$1`,
		userID,
	)
	return scanStudent(row)
}

type StudentWithUser struct {
	Student domain.Student
	User    domain.User
	Parent  *domain.User
}

type StudentListFilter struct {
	ActiveOnly *bool
	City       *string
}

// List returns students filtered by active status of the user. If activeOnly is
// nil, returns both.
func (r *StudentRepo) List(ctx context.Context, activeOnly *bool) ([]*StudentWithUser, error) {
	return r.ListFiltered(ctx, StudentListFilter{ActiveOnly: activeOnly})
}

func (r *StudentRepo) ListFiltered(ctx context.Context, f StudentListFilter) ([]*StudentWithUser, error) {
	q := `SELECT
		s.user_id, s.school, s.grade, s.city, s.parent_id,
		u.id, u.role, u.first_name, u.last_name, u.phone, u.birthdate, u.email, u.password_hash, u.is_active, u.created_at, u.updated_at
		FROM students s
		JOIN users u ON u.id = s.user_id`
	var args []any
	var where []string
	if f.ActiveOnly != nil {
		args = append(args, *f.ActiveOnly)
		where = append(where, "u.is_active = $"+strconv.Itoa(len(args)))
	}
	if f.City != nil && *f.City != "" {
		args = append(args, *f.City)
		where = append(where, "s.city = $"+strconv.Itoa(len(args)))
	}
	if len(where) > 0 {
		q += " WHERE " + strings.Join(where, " AND ")
	}
	q += ` ORDER BY u.created_at DESC`

	rows, err := r.pool.Query(ctx, q, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []*StudentWithUser
	for rows.Next() {
		var s domain.Student
		var u domain.User
		var email *string
		if err := rows.Scan(
			&s.UserID, &s.School, &s.Grade, &s.City, &s.ParentID,
			&u.ID, &u.Role, &u.FirstName, &u.LastName, &u.Phone, &u.Birthdate, &email, &u.PasswordHash, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
		); err != nil {
			return nil, err
		}
		u.Email = email
		out = append(out, &StudentWithUser{Student: s, User: u})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	// Hydrate parents in a single query.
	parentIDs := make([]int64, 0, len(out))
	seen := make(map[int64]struct{})
	for _, sw := range out {
		if sw.Student.ParentID != nil {
			id := *sw.Student.ParentID
			if _, ok := seen[id]; !ok {
				seen[id] = struct{}{}
				parentIDs = append(parentIDs, id)
			}
		}
	}
	if len(parentIDs) > 0 {
		prows, err := r.pool.Query(ctx,
			`SELECT `+userColumns+` FROM users WHERE id = ANY($1)`,
			parentIDs,
		)
		if err != nil {
			return nil, err
		}
		defer prows.Close()
		parents := make(map[int64]*domain.User, len(parentIDs))
		for prows.Next() {
			p, err := scanUser(prows)
			if err != nil {
				return nil, err
			}
			parents[p.ID] = p
		}
		if err := prows.Err(); err != nil {
			return nil, err
		}
		for _, sw := range out {
			if sw.Student.ParentID != nil {
				sw.Parent = parents[*sw.Student.ParentID]
			}
		}
	}

	return out, nil
}

// ListByParentID returns the student rows whose parent_id matches parentID.
func (r *StudentRepo) ListByParentID(ctx context.Context, parentID int64) ([]*domain.Student, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+studentColumns+` FROM students WHERE parent_id=$1`,
		parentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.Student
	for rows.Next() {
		s, err := scanStudent(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

type CityCount struct {
	City  string
	Count int
}

// StudentCountsByCity returns the number of students per non-empty city.
func (r *StudentRepo) StudentCountsByCity(ctx context.Context) ([]CityCount, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT city, COUNT(*)
		   FROM students
		  WHERE city IS NOT NULL AND city <> ''
		  GROUP BY city
		  ORDER BY city`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CityCount
	for rows.Next() {
		var c CityCount
		if err := rows.Scan(&c.City, &c.Count); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// DistinctCities returns the set of cities present on student records, sorted.
func (r *StudentRepo) DistinctCities(ctx context.Context) ([]string, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT DISTINCT city FROM students WHERE city IS NOT NULL AND city <> '' ORDER BY city`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}
