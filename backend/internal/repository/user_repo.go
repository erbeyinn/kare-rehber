package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kare-rehber/backend/internal/domain"
)

var ErrNotFound = errors.New("user not found")

type UserRepo struct {
	pool *pgxpool.Pool
}

func NewUserRepo(pool *pgxpool.Pool) *UserRepo {
	return &UserRepo{pool: pool}
}

const userColumns = "id, role, first_name, last_name, phone, birthdate, email, password_hash, is_active, created_at, updated_at"

func scanUser(row pgx.Row) (*domain.User, error) {
	var u domain.User
	var email *string
	if err := row.Scan(
		&u.ID,
		&u.Role,
		&u.FirstName,
		&u.LastName,
		&u.Phone,
		&u.Birthdate,
		&email,
		&u.PasswordHash,
		&u.IsActive,
		&u.CreatedAt,
		&u.UpdatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	u.Email = email
	return &u, nil
}

func (r *UserRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := r.pool.QueryRow(ctx,
		"SELECT "+userColumns+" FROM users WHERE email = $1",
		email,
	)
	return scanUser(row)
}

func (r *UserRepo) GetByPhoneAndBirthdate(ctx context.Context, phone string, birthdate time.Time) (*domain.User, error) {
	row := r.pool.QueryRow(ctx,
		"SELECT "+userColumns+" FROM users WHERE phone = $1 AND birthdate = $2",
		phone, birthdate,
	)
	return scanUser(row)
}

func (r *UserRepo) GetByID(ctx context.Context, id int64) (*domain.User, error) {
	row := r.pool.QueryRow(ctx,
		"SELECT "+userColumns+" FROM users WHERE id = $1",
		id,
	)
	return scanUser(row)
}

type CreateUserParams struct {
	Role         domain.Role
	FirstName    string
	LastName     string
	Phone        string
	Birthdate    time.Time
	Email        *string
	PasswordHash string
	IsActive     bool
}

func (r *UserRepo) Create(ctx context.Context, p CreateUserParams) (*domain.User, error) {
	if !p.Role.Valid() {
		return nil, fmt.Errorf("invalid role: %q", p.Role)
	}
	row := r.pool.QueryRow(ctx,
		`INSERT INTO users (role, first_name, last_name, phone, birthdate, email, password_hash, is_active)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING `+userColumns,
		p.Role, p.FirstName, p.LastName, p.Phone, p.Birthdate, p.Email, p.PasswordHash, p.IsActive,
	)
	return scanUser(row)
}

type UpdateUserParams struct {
	FirstName string
	LastName  string
	Phone     string
	Birthdate time.Time
	Email     *string
}

func (r *UserRepo) Update(ctx context.Context, id int64, p UpdateUserParams) (*domain.User, error) {
	row := r.pool.QueryRow(ctx,
		`UPDATE users
		    SET first_name=$1, last_name=$2, phone=$3, birthdate=$4, email=$5, updated_at=now()
		  WHERE id=$6
		  RETURNING `+userColumns,
		p.FirstName, p.LastName, p.Phone, p.Birthdate, p.Email, id,
	)
	return scanUser(row)
}

func (r *UserRepo) SetActive(ctx context.Context, id int64, active bool) error {
	ct, err := r.pool.Exec(ctx,
		`UPDATE users SET is_active=$1, updated_at=now() WHERE id=$2`,
		active, id,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepo) SetPassword(ctx context.Context, id int64, hash string) error {
	ct, err := r.pool.Exec(ctx,
		`UPDATE users SET password_hash=$1, updated_at=now() WHERE id=$2`,
		hash, id,
	)
	if err != nil {
		return err
	}
	if ct.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *UserRepo) ListByRole(ctx context.Context, role domain.Role) ([]*domain.User, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT `+userColumns+` FROM users WHERE role=$1 ORDER BY created_at DESC`,
		role,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []*domain.User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	return out, rows.Err()
}

type RoleCounts struct {
	Role     domain.Role
	Total    int
	Active   int
	Inactive int
}

// CountByRole returns total / active / inactive counts grouped by role.
func (r *UserRepo) CountByRole(ctx context.Context) ([]RoleCounts, error) {
	rows, err := r.pool.Query(ctx,
		`SELECT role,
		        COUNT(*) AS total,
		        COUNT(*) FILTER (WHERE is_active) AS active,
		        COUNT(*) FILTER (WHERE NOT is_active) AS inactive
		   FROM users
		  GROUP BY role`,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []RoleCounts
	for rows.Next() {
		var rc RoleCounts
		if err := rows.Scan(&rc.Role, &rc.Total, &rc.Active, &rc.Inactive); err != nil {
			return nil, err
		}
		out = append(out, rc)
	}
	return out, rows.Err()
}

// ListByIDs returns users with IDs in the given set. Used to hydrate audit logs
// and report rows. Returns a map keyed by user id.
func (r *UserRepo) ListByIDs(ctx context.Context, ids []int64) (map[int64]*domain.User, error) {
	if len(ids) == 0 {
		return map[int64]*domain.User{}, nil
	}
	rows, err := r.pool.Query(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = ANY($1)`,
		ids,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make(map[int64]*domain.User, len(ids))
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out[u.ID] = u
	}
	return out, rows.Err()
}
