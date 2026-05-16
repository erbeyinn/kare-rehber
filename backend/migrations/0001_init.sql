-- +goose Up
-- +goose StatementBegin
CREATE TYPE user_role AS ENUM ('admin', 'coordinator', 'coach', 'student', 'parent');

CREATE TABLE users (
    id            BIGSERIAL PRIMARY KEY,
    role          user_role   NOT NULL,
    first_name    TEXT        NOT NULL,
    last_name     TEXT        NOT NULL,
    phone         TEXT        NOT NULL,
    birthdate     DATE        NOT NULL,
    email         TEXT,
    password_hash TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX users_phone_birthdate_uniq ON users (phone, birthdate);
CREATE UNIQUE INDEX users_email_uniq ON users (email) WHERE email IS NOT NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;
-- +goose StatementEnd
