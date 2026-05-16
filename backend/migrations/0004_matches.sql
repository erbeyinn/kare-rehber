-- +goose Up
-- +goose StatementBegin
CREATE TYPE match_type AS ENUM ('coach', 'coordinator');

CREATE TABLE matches (
    id          BIGSERIAL PRIMARY KEY,
    student_id  BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id   BIGINT      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        match_type  NOT NULL,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by BIGINT      REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX matches_student_type_uniq ON matches (student_id, type);
CREATE INDEX matches_target_type_idx ON matches (target_id, type);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS matches;
DROP TYPE IF EXISTS match_type;
-- +goose StatementEnd
