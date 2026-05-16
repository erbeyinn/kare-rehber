package domain

import "time"

type SMSStatus string

const (
	SMSStatusSent   SMSStatus = "sent"
	SMSStatusFailed SMSStatus = "failed"
)

type SMSLog struct {
	ID     int64
	UserID *int64
	Phone  string
	Body   string
	Status SMSStatus
	SentAt time.Time
}
