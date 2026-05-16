package sms

import (
	"context"
	"log/slog"

	"kare-rehber/backend/internal/domain"
	"kare-rehber/backend/internal/repository"
)

type MockProvider struct {
	logs *repository.SMSLogRepo
}

func NewMockProvider(logs *repository.SMSLogRepo) *MockProvider {
	return &MockProvider{logs: logs}
}

func (m *MockProvider) Send(ctx context.Context, userID *int64, phone, body string) error {
	slog.Info("sms mock send", "user_id", userID, "phone", phone, "body", body)
	_, err := m.logs.Create(ctx, repository.CreateSMSLogParams{
		UserID: userID,
		Phone:  phone,
		Body:   body,
		Status: domain.SMSStatusSent,
	})
	return err
}
