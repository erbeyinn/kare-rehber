package domain

type Student struct {
	UserID   int64
	School   *string
	Grade    *string
	City     *string
	ParentID *int64
}
