package service

import (
	"context"
	"errors"
	"fmt"

	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
)

type MatchingService struct {
	users    *repository.UserRepo
	students *repository.StudentRepo
	matches  *repository.MatchRepo
}

func NewMatchingService(
	users *repository.UserRepo,
	students *repository.StudentRepo,
	matches *repository.MatchRepo,
) *MatchingService {
	return &MatchingService{users: users, students: students, matches: matches}
}

type StudentMatchView struct {
	Student domain.User
	Detail  domain.Student
	Coach       *domain.User
	Coordinator *domain.User
}

type StudentListFilter struct {
	City      *string
	Type      domain.MatchType // optional — used together with Unmatched
	Unmatched bool             // when true, returns only students missing a match of Type
}

// ListStudentsWithMatches returns active students filtered by city / unmatched
// status, with their current coach and coordinator hydrated.
func (s *MatchingService) ListStudentsWithMatches(ctx context.Context, f StudentListFilter) ([]*StudentMatchView, error) {
	active := true
	rows, err := s.students.ListFiltered(ctx, repository.StudentListFilter{
		ActiveOnly: &active,
		City:       f.City,
	})
	if err != nil {
		return nil, err
	}

	if len(rows) == 0 {
		return nil, nil
	}

	studentIDs := make([]int64, 0, len(rows))
	for _, sw := range rows {
		studentIDs = append(studentIDs, sw.User.ID)
	}

	ms, err := s.matches.ListByStudents(ctx, studentIDs)
	if err != nil {
		return nil, err
	}

	// Index matches by (student, type) and collect target IDs.
	type key struct {
		sid int64
		t   domain.MatchType
	}
	byKey := make(map[key]*domain.Match, len(ms))
	targetIDSet := make(map[int64]struct{})
	for _, m := range ms {
		byKey[key{m.StudentID, m.Type}] = m
		targetIDSet[m.TargetID] = struct{}{}
	}
	targetIDs := make([]int64, 0, len(targetIDSet))
	for id := range targetIDSet {
		targetIDs = append(targetIDs, id)
	}
	targets, err := s.usersByIDs(ctx, targetIDs)
	if err != nil {
		return nil, err
	}

	out := make([]*StudentMatchView, 0, len(rows))
	for _, sw := range rows {
		v := &StudentMatchView{
			Student: sw.User,
			Detail:  sw.Student,
		}
		if m, ok := byKey[key{sw.User.ID, domain.MatchTypeCoach}]; ok {
			v.Coach = targets[m.TargetID]
		}
		if m, ok := byKey[key{sw.User.ID, domain.MatchTypeCoordinator}]; ok {
			v.Coordinator = targets[m.TargetID]
		}
		if f.Unmatched && f.Type.Valid() {
			switch f.Type {
			case domain.MatchTypeCoach:
				if v.Coach != nil {
					continue
				}
			case domain.MatchTypeCoordinator:
				if v.Coordinator != nil {
					continue
				}
			}
		}
		out = append(out, v)
	}
	return out, nil
}

// BulkMatch assigns target to each studentID for the given type. Existing
// matches of the same type are overridden.
func (s *MatchingService) BulkMatch(ctx context.Context, studentIDs []int64, targetID int64, t domain.MatchType, assignedBy int64) error {
	if len(studentIDs) == 0 {
		return fmt.Errorf("%w: no students selected", ErrInvalidInput)
	}
	if !t.Valid() {
		return fmt.Errorf("%w: invalid match type", ErrInvalidInput)
	}

	target, err := s.users.GetByID(ctx, targetID)
	if err != nil {
		return err
	}
	if !target.IsActive {
		return fmt.Errorf("%w: target not active", ErrInvalidInput)
	}
	switch t {
	case domain.MatchTypeCoach:
		if target.Role != domain.RoleCoach {
			return fmt.Errorf("%w: target is not a coach", ErrInvalidInput)
		}
	case domain.MatchTypeCoordinator:
		if target.Role != domain.RoleCoordinator {
			return fmt.Errorf("%w: target is not a coordinator", ErrInvalidInput)
		}
	}

	// Validate students exist + are students.
	for _, sid := range studentIDs {
		u, err := s.users.GetByID(ctx, sid)
		if err != nil {
			return fmt.Errorf("%w: student %d", err, sid)
		}
		if u.Role != domain.RoleStudent {
			return fmt.Errorf("%w: %d is not a student", ErrInvalidInput, sid)
		}
	}

	return s.matches.BulkAssign(ctx, studentIDs, targetID, t, assignedBy)
}

func (s *MatchingService) Unmatch(ctx context.Context, studentID int64, t domain.MatchType) error {
	if !t.Valid() {
		return fmt.Errorf("%w: invalid match type", ErrInvalidInput)
	}
	if err := s.matches.Unassign(ctx, studentID, t); err != nil {
		if errors.Is(err, repository.ErrNotFound) {
			return nil
		}
		return err
	}
	return nil
}

// StudentMatchesForViewer returns the coach + coordinator currently assigned to
// a student, used by the student/parent panel.
func (s *MatchingService) StudentMatches(ctx context.Context, studentID int64) (coach, coordinator *domain.User, err error) {
	ms, err := s.matches.ListByStudent(ctx, studentID)
	if err != nil {
		return nil, nil, err
	}
	for _, m := range ms {
		u, err := s.users.GetByID(ctx, m.TargetID)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				continue
			}
			return nil, nil, err
		}
		switch m.Type {
		case domain.MatchTypeCoach:
			coach = u
		case domain.MatchTypeCoordinator:
			coordinator = u
		}
	}
	return coach, coordinator, nil
}

func (s *MatchingService) usersByIDs(ctx context.Context, ids []int64) (map[int64]*domain.User, error) {
	out := make(map[int64]*domain.User, len(ids))
	for _, id := range ids {
		u, err := s.users.GetByID(ctx, id)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				continue
			}
			return nil, err
		}
		out[id] = u
	}
	return out, nil
}
