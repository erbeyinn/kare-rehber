package domain

import "time"

type MeetingStatus string

const (
	MeetingStatusDraft    MeetingStatus = "draft"
	MeetingStatusPending  MeetingStatus = "pending"
	MeetingStatusApproved MeetingStatus = "approved"
)

func (s MeetingStatus) Valid() bool {
	switch s {
	case MeetingStatusDraft, MeetingStatusPending, MeetingStatusApproved:
		return true
	}
	return false
}

type Meeting struct {
	ID          int64
	StudentID   int64
	CoachID     int64
	MeetingDate time.Time
	Content     string
	Evaluation  string
	Status      MeetingStatus
	CreatedAt   time.Time
	UpdatedAt   time.Time
}
