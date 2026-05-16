package service

import (
	"context"
	"encoding/json"
	"reflect"

	"kare-rehber/backend/internal/repository"
)

type AuditService struct {
	repo *repository.AuditRepo
}

func NewAuditService(repo *repository.AuditRepo) *AuditService {
	return &AuditService{repo: repo}
}

// LogChange records a diff between two snapshots of the same entity. before may
// be nil for create actions; after may be nil for delete. Only fields that
// differ are kept in the JSON payload, plus the action name.
func (s *AuditService) LogChange(ctx context.Context, entityType string, entityID int64, action string, actorID int64, before, after map[string]any) error {
	beforeOut, afterOut := diffMaps(before, after)
	payload := map[string]any{
		"before": beforeOut,
		"after":  afterOut,
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	var actor *int64
	if actorID > 0 {
		actor = &actorID
	}
	_, err = s.repo.Create(ctx, repository.CreateAuditParams{
		EntityType: entityType,
		EntityID:   entityID,
		Action:     action,
		ActorID:    actor,
		Diff:       raw,
	})
	return err
}

// diffMaps returns only the keys whose values differ between before and after.
// Useful so audit_log entries stay small and reviewable.
func diffMaps(before, after map[string]any) (map[string]any, map[string]any) {
	if before == nil && after == nil {
		return nil, nil
	}
	if before == nil {
		return nil, after
	}
	if after == nil {
		return before, nil
	}
	beforeOut := make(map[string]any)
	afterOut := make(map[string]any)
	keys := make(map[string]struct{}, len(before)+len(after))
	for k := range before {
		keys[k] = struct{}{}
	}
	for k := range after {
		keys[k] = struct{}{}
	}
	for k := range keys {
		b, bok := before[k]
		a, aok := after[k]
		if bok && aok && reflect.DeepEqual(b, a) {
			continue
		}
		if bok {
			beforeOut[k] = b
		}
		if aok {
			afterOut[k] = a
		}
	}
	return beforeOut, afterOut
}
