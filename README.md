# Kare Rehber

Öğrenci, koç, koordinatör ve velileri tek panelden yöneten rehberlik platformu.
Üç parça: Go backend (admin + public API), React admin SPA, React (Router v7)
public SPA.

## Mimari

```
backend/            Go 1.22 servisleri
  cmd/admin-api     Yönetim API'si (:8081)
  cmd/public-api    Veli/öğrenci/koç/koordinatör API'si (:8080)
  cmd/seed          İlk admin kullanıcısını oluşturur
  internal/...      domain / repository / service / http
  migrations/       goose SQL göç dosyaları

frontend-admin/     Vite + React 19 + TanStack Query + react-router (admin)
frontend-public/    React Router v7 (kayıt + rol panelleri)
```

## Gereksinimler

- Go 1.22+
- PostgreSQL 14+
- Node.js 20+ (npm)
- [goose](https://github.com/pressly/goose) (migrations için, `go install github.com/pressly/goose/v3/cmd/goose@latest`)

## Kurulum

### 1. Veritabanı

```bash
createdb kare_rehber
```

### 2. Backend `.env`

`backend/.env`:

```env
DATABASE_URL=postgres://localhost:5432/kare_rehber?sslmode=disable
JWT_SECRET=change-me-in-prod
ADMIN_API_PORT=8081
PUBLIC_API_PORT=8080
SMS_PROVIDER=mock
COACH_MEETING_INTERVAL_DAYS=14

SEED_ADMIN_EMAIL=admin@kare.local
SEED_ADMIN_PASSWORD=ChangeMe123!
SEED_ADMIN_FIRST_NAME=Admin
SEED_ADMIN_LAST_NAME=Kare
SEED_ADMIN_PHONE=+905550000000
SEED_ADMIN_BIRTHDATE=1990-01-01
```

### 3. Migration + seed

```bash
cd backend
make migrate-up
make seed
```

### 4. Backend çalıştır

```bash
make run-all     # admin + public birlikte
# veya tek tek:
make run-admin
make run-public
```

### 5. Frontend `.env`

`frontend-admin/.env`:

```env
VITE_ADMIN_API_URL=http://localhost:8081
```

`frontend-public/.env`:

```env
VITE_PUBLIC_API_URL=http://localhost:8080
```

### 6. Frontend çalıştır

```bash
cd frontend-admin && npm install && npm run dev   # http://localhost:5173
cd frontend-public && npm install && npm run dev  # http://localhost:5174 (varsayılan)
```

## Make komutları (backend/)

| Komut | Açıklama |
|---|---|
| `make run-admin` | Sadece admin API |
| `make run-public` | Sadece public API |
| `make run-all` | İkisi de paralel |
| `make migrate-up` | goose migrations çalıştır |
| `make seed` | İlk admin kullanıcısını oluştur (idempotent) |
| `make tidy` | `go mod tidy` |

## Faz dökümanları

Implementasyon detayları için `phases/` altındaki `phase-N-*.md` dosyalarına
bakın. Bu README sıfır repodan ayağa kalkmak için yeterli.
