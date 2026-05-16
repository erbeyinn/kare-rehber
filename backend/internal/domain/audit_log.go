package domain

import "time"

type AuditLog struct {
	ID         int64
	EntityType string
	EntityID   int64
	Action     string
	ActorID    *int64
	Diff       []byte
	CreatedAt  time.Time
}
