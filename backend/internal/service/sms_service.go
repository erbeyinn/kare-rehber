package service

import (
	"context"
	"fmt"
	"strings"

	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
	"kare-rehber/backend/internal/sms"
)

type SMSService struct {
	users    *repository.UserRepo
	students *repository.StudentRepo
	sms      sms.Provider
	reports  *ReportService
	logs     *repository.SMSLogRepo
}

func NewSMSService(
	users *repository.UserRepo,
	students *repository.StudentRepo,
	provider sms.Provider,
	reports *ReportService,
	logs *repository.SMSLogRepo,
) *SMSService {
	return &SMSService{
		users:    users,
		students: students,
		sms:      provider,
		reports:  reports,
		logs:     logs,
	}
}

// BulkSendResult summarizes the outcome of a multi-recipient send. Failures
// are captured per user so the admin sees what didn't go through without the
// whole batch aborting.
type BulkSendResult struct {
	Sent     int
	Failed   int
	Failures []BulkFailure
}

type BulkFailure struct {
	UserID int64
	Phone  string
	Error  string
}

func (s *SMSService) SendIndividual(ctx context.Context, userID int64, body string) error {
	if strings.TrimSpace(body) == "" {
		return fmt.Errorf("%w: body required", ErrInvalidInput)
	}
	u, err := s.users.GetByID(ctx, userID)
	if err != nil {
		return err
	}
	if strings.TrimSpace(u.Phone) == "" {
		return fmt.Errorf("%w: user has no phone", ErrInvalidInput)
	}
	id := u.ID
	return s.sms.Send(ctx, &id, u.Phone, body)
}

func (s *SMSService) SendBulk(ctx context.Context, userIDs []int64, body string) (*BulkSendResult, error) {
	if strings.TrimSpace(body) == "" {
		return nil, fmt.Errorf("%w: body required", ErrInvalidInput)
	}
	if len(userIDs) == 0 {
		return nil, fmt.Errorf("%w: no recipients", ErrInvalidInput)
	}
	res := &BulkSendResult{}
	for _, uid := range userIDs {
		u, err := s.users.GetByID(ctx, uid)
		if err != nil {
			res.Failed++
			res.Failures = append(res.Failures, BulkFailure{UserID: uid, Error: "user not found"})
			continue
		}
		if strings.TrimSpace(u.Phone) == "" {
			res.Failed++
			res.Failures = append(res.Failures, BulkFailure{UserID: uid, Error: "no phone"})
			continue
		}
		id := u.ID
		if err := s.sms.Send(ctx, &id, u.Phone, body); err != nil {
			res.Failed++
			res.Failures = append(res.Failures, BulkFailure{UserID: uid, Phone: u.Phone, Error: err.Error()})
			continue
		}
		res.Sent++
	}
	return res, nil
}

func (s *SMSService) SendToOverdueCoaches(ctx context.Context, intervalDays int, body string) (*BulkSendResult, error) {
	if strings.TrimSpace(body) == "" {
		return nil, fmt.Errorf("%w: body required", ErrInvalidInput)
	}
	overdue, err := s.reports.OverdueCoaches(ctx, intervalDays)
	if err != nil {
		return nil, err
	}
	ids := make([]int64, 0, len(overdue))
	for _, o := range overdue {
		ids = append(ids, o.Coach.ID)
	}
	if len(ids) == 0 {
		return &BulkSendResult{}, nil
	}
	return s.SendBulk(ctx, ids, body)
}

// BulkRecipientFilter describes who a bulk SMS should target. City only
// applies to students and their parents — for coach/coordinator/admin the
// city filter is ignored.
type BulkRecipientFilter struct {
	Role domain.Role
	City *string
}

// ResolveRecipients returns the active users matching the given filter,
// suitable for the bulk-SMS preview. Inactive users are skipped — sending
// SMS to a user who hasn't received credentials yet is not useful.
func (s *SMSService) ResolveRecipients(ctx context.Context, f BulkRecipientFilter) ([]*domain.User, error) {
	if !f.Role.Valid() {
		return nil, fmt.Errorf("%w: invalid role", ErrInvalidInput)
	}
	switch f.Role {
	case domain.RoleStudent:
		active := true
		rows, err := s.students.ListFiltered(ctx, repository.StudentListFilter{
			ActiveOnly: &active,
			City:       f.City,
		})
		if err != nil {
			return nil, err
		}
		out := make([]*domain.User, 0, len(rows))
		for _, r := range rows {
			u := r.User
			out = append(out, &u)
		}
		return out, nil
	case domain.RoleParent:
		active := true
		rows, err := s.students.ListFiltered(ctx, repository.StudentListFilter{
			ActiveOnly: &active,
			City:       f.City,
		})
		if err != nil {
			return nil, err
		}
		seen := make(map[int64]struct{})
		out := make([]*domain.User, 0, len(rows))
		for _, r := range rows {
			if r.Parent == nil || !r.Parent.IsActive {
				continue
			}
			if _, dup := seen[r.Parent.ID]; dup {
				continue
			}
			seen[r.Parent.ID] = struct{}{}
			p := *r.Parent
			out = append(out, &p)
		}
		return out, nil
	case domain.RoleCoach, domain.RoleCoordinator, domain.RoleAdmin:
		rows, err := s.users.ListByRole(ctx, f.Role)
		if err != nil {
			return nil, err
		}
		out := make([]*domain.User, 0, len(rows))
		for _, u := range rows {
			if !u.IsActive {
				continue
			}
			out = append(out, u)
		}
		return out, nil
	}
	return nil, fmt.Errorf("%w: unsupported role", ErrInvalidInput)
}

// Logs returns SMS history filtered by user and/or time window. Returns an
// empty slice (never nil) so the HTTP layer can JSON-encode safely.
func (s *SMSService) Logs(ctx context.Context, f repository.SMSLogFilter) ([]*domain.SMSLog, error) {
	rows, err := s.logs.List(ctx, f)
	if err != nil {
		return nil, err
	}
	if rows == nil {
		return []*domain.SMSLog{}, nil
	}
	return rows, nil
}

