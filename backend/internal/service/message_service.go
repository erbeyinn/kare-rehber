package service

import (
	"context"
	"fmt"
	"strings"

	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
)

type MessageService struct {
	messages *repository.MessageRepo
	users    *repository.UserRepo
	students *repository.StudentRepo
	matches  *repository.MatchRepo
}

func NewMessageService(
	messages *repository.MessageRepo,
	users *repository.UserRepo,
	students *repository.StudentRepo,
	matches *repository.MatchRepo,
) *MessageService {
	return &MessageService{messages: messages, users: users, students: students, matches: matches}
}

// SendFromPublic creates either a new thread or a reply on behalf of a
// student or parent. The recipient role/id pair on the resulting message
// always mirrors the thread's root message — for replies, threadID drives it.
func (s *MessageService) SendFromPublic(
	ctx context.Context,
	senderID int64,
	recipientRole domain.MessageRecipientRole,
	body string,
	threadID *int64,
) (*domain.Message, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, fmt.Errorf("%w: body required", ErrInvalidInput)
	}
	sender, err := s.users.GetByID(ctx, senderID)
	if err != nil {
		return nil, err
	}
	if sender.Role != domain.RoleStudent && sender.Role != domain.RoleParent {
		return nil, ErrForbidden
	}

	if threadID != nil {
		root, err := s.messages.GetByID(ctx, *threadID)
		if err != nil {
			return nil, err
		}
		if root.ThreadID != nil {
			return nil, fmt.Errorf("%w: thread_id must reference root message", ErrInvalidInput)
		}
		if root.SenderID != senderID {
			return nil, ErrForbidden
		}
		return s.messages.Create(ctx, repository.CreateMessageParams{
			SenderID:      senderID,
			RecipientRole: root.RecipientRole,
			RecipientID:   root.RecipientID,
			Body:          body,
			ThreadID:      &root.ID,
		})
	}

	if !recipientRole.Valid() {
		return nil, fmt.Errorf("%w: invalid recipient role", ErrInvalidInput)
	}

	var recipientID *int64
	if recipientRole == domain.MessageRecipientCoordinator {
		coordID, err := s.resolveCoordinator(ctx, sender)
		if err != nil {
			return nil, err
		}
		recipientID = &coordID
	}

	return s.messages.Create(ctx, repository.CreateMessageParams{
		SenderID:      senderID,
		RecipientRole: recipientRole,
		RecipientID:   recipientID,
		Body:          body,
		ThreadID:      nil,
	})
}

// ReplyAsAdmin appends an admin's reply to an existing thread whose root
// is addressed to the admin role.
func (s *MessageService) ReplyAsAdmin(ctx context.Context, adminID, threadRootID int64, body string) (*domain.Message, error) {
	return s.replyAs(ctx, adminID, domain.RoleAdmin, threadRootID, body)
}

// ReplyAsCoordinator appends a coordinator's reply to an existing thread whose
// root is addressed to this specific coordinator.
func (s *MessageService) ReplyAsCoordinator(ctx context.Context, coordID, threadRootID int64, body string) (*domain.Message, error) {
	return s.replyAs(ctx, coordID, domain.RoleCoordinator, threadRootID, body)
}

func (s *MessageService) replyAs(
	ctx context.Context,
	viewerID int64,
	viewerRole domain.Role,
	threadRootID int64,
	body string,
) (*domain.Message, error) {
	body = strings.TrimSpace(body)
	if body == "" {
		return nil, fmt.Errorf("%w: body required", ErrInvalidInput)
	}
	viewer, err := s.users.GetByID(ctx, viewerID)
	if err != nil {
		return nil, err
	}
	if viewer.Role != viewerRole {
		return nil, ErrForbidden
	}
	root, err := s.messages.GetByID(ctx, threadRootID)
	if err != nil {
		return nil, err
	}
	if root.ThreadID != nil {
		return nil, fmt.Errorf("%w: thread_id must reference root message", ErrInvalidInput)
	}
	if err := s.assertCanViewThread(viewer, root); err != nil {
		return nil, err
	}
	// Replies are recorded with the original recipient_role/id of the thread
	// root so the conversation stays anchored to the same pool / coordinator.
	return s.messages.Create(ctx, repository.CreateMessageParams{
		SenderID:      viewerID,
		RecipientRole: root.RecipientRole,
		RecipientID:   root.RecipientID,
		Body:          body,
		ThreadID:      &root.ID,
	})
}

// ListInboxOptions controls inbox scope. Only Mine is meaningful for admin.
type ListInboxOptions struct {
	// Mine, when true and viewer is an admin, restricts the result to threads
	// the admin has already replied in. When false, returns the admin pool.
	// Ignored for non-admin viewers.
	Mine bool
}

// ListInbox returns thread summaries visible to the viewer, ordered by last
// activity descending.
func (s *MessageService) ListInbox(ctx context.Context, viewerID int64, opts ListInboxOptions) ([]*repository.ThreadSummary, error) {
	viewer, err := s.users.GetByID(ctx, viewerID)
	if err != nil {
		return nil, err
	}
	f, err := s.filterFor(viewer, opts)
	if err != nil {
		return nil, err
	}
	return s.messages.ListThreadSummaries(ctx, f, viewerID)
}

// ListThread returns all messages in the thread after validating that the
// viewer is allowed to see it.
func (s *MessageService) ListThread(ctx context.Context, threadRootID, viewerID int64) ([]*domain.Message, error) {
	viewer, err := s.users.GetByID(ctx, viewerID)
	if err != nil {
		return nil, err
	}
	root, err := s.messages.GetByID(ctx, threadRootID)
	if err != nil {
		return nil, err
	}
	if root.ThreadID != nil {
		return nil, fmt.Errorf("%w: thread_id must reference root message", ErrInvalidInput)
	}
	if err := s.assertCanViewThread(viewer, root); err != nil {
		return nil, err
	}
	return s.messages.ListByThread(ctx, root.ID)
}

// MarkRead marks every message not sent by viewer as read, after validating
// visibility.
func (s *MessageService) MarkRead(ctx context.Context, threadRootID, viewerID int64) error {
	viewer, err := s.users.GetByID(ctx, viewerID)
	if err != nil {
		return err
	}
	root, err := s.messages.GetByID(ctx, threadRootID)
	if err != nil {
		return err
	}
	if root.ThreadID != nil {
		return fmt.Errorf("%w: thread_id must reference root message", ErrInvalidInput)
	}
	if err := s.assertCanViewThread(viewer, root); err != nil {
		return err
	}
	return s.messages.MarkRead(ctx, root.ID, viewerID)
}

// --- helpers --------------------------------------------------------------

func (s *MessageService) filterFor(viewer *domain.User, opts ListInboxOptions) (repository.ThreadFilter, error) {
	switch viewer.Role {
	case domain.RoleStudent, domain.RoleParent:
		return repository.ThreadFilter{SenderID: &viewer.ID}, nil
	case domain.RoleCoordinator:
		role := domain.MessageRecipientCoordinator
		return repository.ThreadFilter{
			RecipientRole: &role,
			RecipientID:   &viewer.ID,
		}, nil
	case domain.RoleAdmin:
		role := domain.MessageRecipientAdmin
		f := repository.ThreadFilter{
			RecipientRole:     &role,
			RecipientIDIsNull: true,
		}
		if opts.Mine {
			f.ParticipantID = &viewer.ID
		}
		return f, nil
	default:
		return repository.ThreadFilter{}, ErrForbidden
	}
}

func (s *MessageService) assertCanViewThread(viewer *domain.User, root *domain.Message) error {
	switch viewer.Role {
	case domain.RoleStudent, domain.RoleParent:
		if root.SenderID == viewer.ID {
			return nil
		}
	case domain.RoleAdmin:
		if root.RecipientRole == domain.MessageRecipientAdmin {
			return nil
		}
	case domain.RoleCoordinator:
		if root.RecipientRole == domain.MessageRecipientCoordinator &&
			root.RecipientID != nil && *root.RecipientID == viewer.ID {
			return nil
		}
	}
	return ErrForbidden
}

// resolveCoordinator returns the coordinator user id to address when a
// student or parent writes to "the coordinator". A student uses their own
// coordinator match; a parent uses any of their children's coordinator
// (we require all children to share the same coordinator, otherwise the
// parent's "coordinator" target is ambiguous).
func (s *MessageService) resolveCoordinator(ctx context.Context, sender *domain.User) (int64, error) {
	switch sender.Role {
	case domain.RoleStudent:
		ms, err := s.matches.ListByStudent(ctx, sender.ID)
		if err != nil {
			return 0, err
		}
		for _, m := range ms {
			if m.Type == domain.MatchTypeCoordinator {
				return m.TargetID, nil
			}
		}
		return 0, fmt.Errorf("%w: öğrencinin eşleşmiş koordinatörü yok", ErrForbidden)
	case domain.RoleParent:
		children, err := s.students.ListByParentID(ctx, sender.ID)
		if err != nil {
			return 0, err
		}
		if len(children) == 0 {
			return 0, fmt.Errorf("%w: velinin kayıtlı çocuğu yok", ErrForbidden)
		}
		var coord int64
		for _, child := range children {
			ms, err := s.matches.ListByStudent(ctx, child.UserID)
			if err != nil {
				return 0, err
			}
			for _, m := range ms {
				if m.Type != domain.MatchTypeCoordinator {
					continue
				}
				if coord == 0 {
					coord = m.TargetID
				} else if coord != m.TargetID {
					return 0, fmt.Errorf("%w: çocukların koordinatörleri farklı; lütfen admin'e yazın", ErrInvalidInput)
				}
			}
		}
		if coord == 0 {
			return 0, fmt.Errorf("%w: çocukların eşleşmiş koordinatörü yok", ErrForbidden)
		}
		return coord, nil
	default:
		return 0, ErrForbidden
	}
}
