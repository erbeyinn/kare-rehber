package domain

import "time"

type MessageRecipientRole string

const (
	MessageRecipientAdmin       MessageRecipientRole = "admin"
	MessageRecipientCoordinator MessageRecipientRole = "coordinator"
)

func (r MessageRecipientRole) Valid() bool {
	switch r {
	case MessageRecipientAdmin, MessageRecipientCoordinator:
		return true
	}
	return false
}

type Message struct {
	ID            int64
	SenderID      int64
	RecipientRole MessageRecipientRole
	RecipientID   *int64
	Body          string
	ThreadID      *int64
	ReadAt        *time.Time
	CreatedAt     time.Time
}

// RootID returns the canonical thread root id for this message.
// First message in a thread has ThreadID == nil, so its own ID is the root.
func (m *Message) RootID() int64 {
	if m.ThreadID != nil {
		return *m.ThreadID
	}
	return m.ID
}
