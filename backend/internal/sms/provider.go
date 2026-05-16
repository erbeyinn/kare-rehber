package sms

import "context"

type Provider interface {
	Send(ctx context.Context, userID *int64, phone, body string) error
}
