# syntax=docker/dockerfile:1.7

# ---- Build stage ----
FROM golang:1.25-alpine AS build

WORKDIR /src

# Cache module downloads.
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

# Copy source and build both API binaries.
COPY . .

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux \
    go build -trimpath -ldflags="-s -w" -o /out/admin-api ./cmd/admin-api && \
    CGO_ENABLED=0 GOOS=linux \
    go build -trimpath -ldflags="-s -w" -o /out/public-api ./cmd/public-api

# ---- Runtime stage ----
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata && \
    adduser -D -H -u 10001 app

WORKDIR /app

COPY --from=build /out/admin-api /app/admin-api
COPY --from=build /out/public-api /app/public-api
COPY migrations /app/migrations

# Render injects PORT at runtime; map it onto the service-specific env var
# the binary expects. Pick which API to start via SERVICE (admin|public).
#   SERVICE=admin   -> /app/admin-api  (PORT -> ADMIN_API_PORT)
#   SERVICE=public  -> /app/public-api (PORT -> PUBLIC_API_PORT)
ENV SERVICE=admin

USER app

ENTRYPOINT ["/bin/sh", "-c", "\
case \"$SERVICE\" in \
  admin|admin-api)   export ADMIN_API_PORT=\"${PORT:-${ADMIN_API_PORT:-8081}}\";  exec /app/admin-api  ;; \
  public|public-api) export PUBLIC_API_PORT=\"${PORT:-${PUBLIC_API_PORT:-8080}}\"; exec /app/public-api ;; \
  *) echo \"unknown SERVICE: $SERVICE (expected admin|public)\" >&2; exit 1 ;; \
esac"]
