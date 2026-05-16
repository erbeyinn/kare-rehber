package service

import (
	"context"
	"errors"
	"fmt"
	"slices"
	"time"

	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
)

var (
	ErrForbidden       = errors.New("forbidden")
	ErrInvalidTransition = errors.New("invalid status transition")
)

type MeetingService struct {
	meetings *repository.MeetingRepo
	matches  *repository.MatchRepo
	users    *repository.UserRepo
	students *repository.StudentRepo
	audit    *AuditService
}

func NewMeetingService(
	meetings *repository.MeetingRepo,
	matches *repository.MatchRepo,
	users *repository.UserRepo,
	students *repository.StudentRepo,
	audit *AuditService,
) *MeetingService {
	return &MeetingService{
		meetings: meetings,
		matches:  matches,
		users:    users,
		students: students,
		audit:    audit,
	}
}

type MeetingPayload struct {
	StudentID   int64
	MeetingDate time.Time
	Content     string
	Evaluation  string
}

// CreateDraft is called by the coach for an assigned student. Creates a draft.
func (s *MeetingService) CreateDraft(ctx context.Context, coachID int64, in MeetingPayload) (*domain.Meeting, error) {
	if in.StudentID == 0 || in.MeetingDate.IsZero() {
		return nil, fmt.Errorf("%w: student_id and meeting_date required", ErrInvalidInput)
	}
	if err := s.assertCoachOwnsStudent(ctx, coachID, in.StudentID); err != nil {
		return nil, err
	}
	return s.meetings.Create(ctx, repository.CreateMeetingParams{
		StudentID:   in.StudentID,
		CoachID:     coachID,
		MeetingDate: in.MeetingDate,
		Content:     in.Content,
		Evaluation:  in.Evaluation,
		Status:      domain.MeetingStatusDraft,
	})
}

// UpdateByCoach is allowed only while the meeting is draft or pending and
// belongs to the coach.
func (s *MeetingService) UpdateByCoach(ctx context.Context, coachID, meetingID int64, in MeetingPayload) (*domain.Meeting, error) {
	m, err := s.meetings.GetByID(ctx, meetingID)
	if err != nil {
		return nil, err
	}
	if m.CoachID != coachID {
		return nil, ErrForbidden
	}
	if m.Status == domain.MeetingStatusApproved {
		return nil, fmt.Errorf("%w: approved meetings can only be updated by admin", ErrForbidden)
	}
	if in.MeetingDate.IsZero() {
		return nil, fmt.Errorf("%w: meeting_date required", ErrInvalidInput)
	}
	return s.meetings.Update(ctx, meetingID, repository.UpdateMeetingParams{
		MeetingDate: in.MeetingDate,
		Content:     in.Content,
		Evaluation:  in.Evaluation,
		Status:      m.Status, // status unchanged here
	})
}

// Submit moves a draft meeting to pending. Only the owning coach may submit.
func (s *MeetingService) Submit(ctx context.Context, coachID, meetingID int64) (*domain.Meeting, error) {
	m, err := s.meetings.GetByID(ctx, meetingID)
	if err != nil {
		return nil, err
	}
	if m.CoachID != coachID {
		return nil, ErrForbidden
	}
	if m.Status != domain.MeetingStatusDraft {
		return nil, fmt.Errorf("%w: %s → pending", ErrInvalidTransition, m.Status)
	}
	return s.meetings.SetStatus(ctx, meetingID, domain.MeetingStatusPending)
}

// Approve moves a pending meeting to approved. Admin-only.
func (s *MeetingService) Approve(ctx context.Context, adminID, meetingID int64) (*domain.Meeting, error) {
	m, err := s.meetings.GetByID(ctx, meetingID)
	if err != nil {
		return nil, err
	}
	if m.Status == domain.MeetingStatusApproved {
		return m, nil
	}
	updated, err := s.meetings.SetStatus(ctx, meetingID, domain.MeetingStatusApproved)
	if err != nil {
		return nil, err
	}
	_ = s.audit.LogChange(ctx, "meeting", meetingID, "approve", adminID,
		meetingSnapshot(m), meetingSnapshot(updated))
	return updated, nil
}

type AdminMeetingUpdate struct {
	MeetingDate time.Time
	Content     string
	Evaluation  string
	Status      *domain.MeetingStatus // optional explicit status change
}

// UpdateByAdmin can update any meeting in any status. The diff is audit-logged.
func (s *MeetingService) UpdateByAdmin(ctx context.Context, adminID, meetingID int64, in AdminMeetingUpdate) (*domain.Meeting, error) {
	m, err := s.meetings.GetByID(ctx, meetingID)
	if err != nil {
		return nil, err
	}
	status := m.Status
	if in.Status != nil {
		if !in.Status.Valid() {
			return nil, fmt.Errorf("%w: invalid status", ErrInvalidInput)
		}
		status = *in.Status
	}
	date := m.MeetingDate
	if !in.MeetingDate.IsZero() {
		date = in.MeetingDate
	}
	updated, err := s.meetings.Update(ctx, meetingID, repository.UpdateMeetingParams{
		MeetingDate: date,
		Content:     in.Content,
		Evaluation:  in.Evaluation,
		Status:      status,
	})
	if err != nil {
		return nil, err
	}
	_ = s.audit.LogChange(ctx, "meeting", meetingID, "update", adminID,
		meetingSnapshot(m), meetingSnapshot(updated))
	return updated, nil
}

func (s *MeetingService) Get(ctx context.Context, id int64) (*domain.Meeting, error) {
	return s.meetings.GetByID(ctx, id)
}

// --- Listing helpers --------------------------------------------------------

func (s *MeetingService) ListForCoach(ctx context.Context, coachID int64, studentID *int64) ([]*domain.Meeting, error) {
	f := repository.MeetingFilter{CoachID: &coachID}
	if studentID != nil {
		if err := s.assertCoachOwnsStudent(ctx, coachID, *studentID); err != nil {
			return nil, err
		}
		f.StudentID = studentID
	}
	return s.meetings.List(ctx, f)
}

func (s *MeetingService) ListForStudent(ctx context.Context, studentID int64) ([]*domain.Meeting, error) {
	status := domain.MeetingStatusApproved
	return s.meetings.List(ctx, repository.MeetingFilter{
		StudentID: &studentID,
		Status:    &status,
	})
}

func (s *MeetingService) ListForParent(ctx context.Context, parentID int64) ([]*domain.Meeting, error) {
	children, err := s.students.ListByParentID(ctx, parentID)
	if err != nil {
		return nil, err
	}
	if len(children) == 0 {
		return nil, nil
	}
	ids := make([]int64, 0, len(children))
	for _, c := range children {
		ids = append(ids, c.UserID)
	}
	status := domain.MeetingStatusApproved
	return s.meetings.ListForStudents(ctx, ids, &status)
}

// ListForCoordinator returns ALL statuses for students matched to this
// coordinator (admin approval not required for visibility).
func (s *MeetingService) ListForCoordinator(ctx context.Context, coordID int64, studentID *int64) ([]*domain.Meeting, error) {
	studentIDs, err := s.coordinatorStudentIDs(ctx, coordID)
	if err != nil {
		return nil, err
	}
	if studentID != nil {
		if !slices.Contains(studentIDs, *studentID) {
			return nil, ErrForbidden
		}
		return s.meetings.List(ctx, repository.MeetingFilter{StudentID: studentID})
	}
	return s.meetings.ListForStudents(ctx, studentIDs, nil)
}

func (s *MeetingService) ListAdmin(ctx context.Context, status *domain.MeetingStatus) ([]*domain.Meeting, error) {
	return s.meetings.List(ctx, repository.MeetingFilter{Status: status})
}

// --- Authorization helpers --------------------------------------------------

// CoachOwnsStudent returns true iff the coach is currently matched to the
// student. Used by handlers when more nuanced messaging is needed than
// ErrForbidden.
func (s *MeetingService) CoachOwnsStudent(ctx context.Context, coachID, studentID int64) (bool, error) {
	matches, err := s.matches.ListByStudent(ctx, studentID)
	if err != nil {
		return false, err
	}
	for _, m := range matches {
		if m.Type == domain.MatchTypeCoach && m.TargetID == coachID {
			return true, nil
		}
	}
	return false, nil
}

func (s *MeetingService) assertCoachOwnsStudent(ctx context.Context, coachID, studentID int64) error {
	ok, err := s.CoachOwnsStudent(ctx, coachID, studentID)
	if err != nil {
		return err
	}
	if !ok {
		return ErrForbidden
	}
	return nil
}

// CoachStudents returns the active students currently assigned to coachID.
func (s *MeetingService) CoachStudents(ctx context.Context, coachID int64) ([]*domain.User, error) {
	ms, err := s.matches.ListByTarget(ctx, coachID, domain.MatchTypeCoach)
	if err != nil {
		return nil, err
	}
	out := make([]*domain.User, 0, len(ms))
	for _, m := range ms {
		u, err := s.users.GetByID(ctx, m.StudentID)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				continue
			}
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}

// CoordinatorStudents returns the active students currently assigned to
// coordinatorID.
func (s *MeetingService) CoordinatorStudents(ctx context.Context, coordinatorID int64) ([]*domain.User, error) {
	ids, err := s.coordinatorStudentIDs(ctx, coordinatorID)
	if err != nil {
		return nil, err
	}
	out := make([]*domain.User, 0, len(ids))
	for _, id := range ids {
		u, err := s.users.GetByID(ctx, id)
		if err != nil {
			if errors.Is(err, repository.ErrNotFound) {
				continue
			}
			return nil, err
		}
		out = append(out, u)
	}
	return out, nil
}

func (s *MeetingService) coordinatorStudentIDs(ctx context.Context, coordID int64) ([]int64, error) {
	ms, err := s.matches.ListByTarget(ctx, coordID, domain.MatchTypeCoordinator)
	if err != nil {
		return nil, err
	}
	ids := make([]int64, 0, len(ms))
	for _, m := range ms {
		ids = append(ids, m.StudentID)
	}
	return ids, nil
}

func meetingSnapshot(m *domain.Meeting) map[string]any {
	if m == nil {
		return nil
	}
	return map[string]any{
		"meeting_date": m.MeetingDate.Format("2006-01-02"),
		"content":      m.Content,
		"evaluation":   m.Evaluation,
		"status":       string(m.Status),
	}
}

