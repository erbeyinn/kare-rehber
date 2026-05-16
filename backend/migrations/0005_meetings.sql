-- +goose Up
-- +goose StatementBegin
CREATE TYPE meeting_status AS ENUM ('draft', 'pending', 'approved');

CREATE TABLE meetings (
    id           BIGSERIAL      PRIMARY KEY,
    student_id   BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coach_id     BIGINT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    meeting_date DATE           NOT NULL,
    content      TEXT           NOT NULL DEFAULT '',
    evaluation   TEXT           NOT NULL DEFAULT '',
    status       meeting_status NOT NULL DEFAULT 'draft',
    created_at   TIMESTAMPTZ    NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE INDEX meetings_student_idx ON meetings (student_id, meeting_date DESC);
CREATE INDEX meetings_coach_idx   ON meetings (coach_id, meeting_date DESC);
CREATE INDEX meetings_status_idx  ON meetings (status);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS meetings;
DROP TYPE IF EXISTS meeting_status;
-- +goose StatementEnd
