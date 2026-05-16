package domain

type Coach struct {
	UserID     int64
	Specialty  *string
	IsApproved bool
}
