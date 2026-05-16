-- +goose Up
-- +goose StatementBegin
CREATE TABLE sms_logs (
    id      BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    phone   TEXT NOT NULL,
    body    TEXT NOT NULL,
    status  TEXT NOT NULL DEFAULT 'sent',
    sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sms_logs_user_id_idx ON sms_logs(user_id);
CREATE INDEX sms_logs_sent_at_idx ON sms_logs(sent_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS sms_logs;
-- +goose StatementEnd
