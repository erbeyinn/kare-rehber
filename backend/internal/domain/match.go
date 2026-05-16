package domain

import "time"

type MatchType string

const (
	MatchTypeCoach       MatchType = "coach"
	MatchTypeCoordinator MatchType = "coordinator"
)

func (t MatchType) Valid() bool {
	switch t {
	case MatchTypeCoach, MatchTypeCoordinator:
		return true
	}
	return false
}

type Match struct {
	ID         int64
	StudentID  int64
	TargetID   int64
	Type       MatchType
	AssignedAt time.Time
	AssignedBy *int64
}
