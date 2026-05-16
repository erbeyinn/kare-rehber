-- +goose Up
-- +goose StatementBegin
CREATE TYPE message_recipient_role AS ENUM ('admin', 'coordinator');

CREATE TABLE messages (
    id             BIGSERIAL              PRIMARY KEY,
    sender_id      BIGINT                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_role message_recipient_role NOT NULL,
    recipient_id   BIGINT                 REFERENCES users(id) ON DELETE SET NULL,
    body           TEXT                   NOT NULL,
    thread_id      BIGINT                 REFERENCES messages(id) ON DELETE CASCADE,
    read_at        TIMESTAMPTZ,
    created_at     TIMESTAMPTZ            NOT NULL DEFAULT now()
);

CREATE INDEX messages_thread_idx       ON messages (thread_id, created_at);
CREATE INDEX messages_sender_idx       ON messages (sender_id, created_at DESC);
CREATE INDEX messages_recipient_idx    ON messages (recipient_id, created_at DESC);
CREATE INDEX messages_recipient_role_idx ON messages (recipient_role, created_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS messages;
DROP TYPE IF EXISTS message_recipient_role;
-- +goose StatementEnd
