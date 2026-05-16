.PHONY: run-admin run-public run-all migrate-up seed seed-mock tidy

ifneq (,$(wildcard .env))
include .env
export
endif

run-admin:
	go run ./cmd/admin-api

run-public:
	go run ./cmd/public-api

run-all:
	@trap 'kill 0' INT TERM EXIT; \
	go run ./cmd/admin-api & \
	go run ./cmd/public-api & \
	wait

migrate-up:
	@command -v goose >/dev/null 2>&1 || { echo "goose yok: go install github.com/pressly/goose/v3/cmd/goose@latest"; exit 1; }
	goose -dir migrations postgres "$$DATABASE_URL" up

seed:
	go run ./cmd/seed

seed-mock:
	go run ./cmd/mock-seed

tidy:
	go mod tidy
