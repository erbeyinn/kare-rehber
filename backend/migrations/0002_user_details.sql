-- +goose Up
-- +goose StatementBegin
ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE students (
    user_id   BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    school    TEXT,
    grade     TEXT,
    city      TEXT,
    parent_id BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX students_parent_id_idx ON students(parent_id);
CREATE INDEX students_city_idx ON students(city);

CREATE TABLE coaches (
    user_id     BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    specialty   TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT false
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS coaches;
DROP TABLE IF EXISTS students;
ALTER TABLE users DROP COLUMN IF EXISTS is_active;
-- +goose StatementEnd
