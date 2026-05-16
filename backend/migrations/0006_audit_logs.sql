-- +goose Up
-- +goose StatementBegin
CREATE TABLE audit_logs (
    id          BIGSERIAL   PRIMARY KEY,
    entity_type TEXT        NOT NULL,
    entity_id   BIGINT      NOT NULL,
    action      TEXT        NOT NULL,
    actor_id    BIGINT      REFERENCES users(id) ON DELETE SET NULL,
    diff        JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx     ON audit_logs (entity_type, entity_id, created_at DESC);
CREATE INDEX audit_logs_created_at_idx ON audit_logs (created_at DESC);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS audit_logs;
-- +goose StatementEnd
