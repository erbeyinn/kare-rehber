# Phase 0 — Setup (Repo İskeleti)

> Phase değil, **kurulum**. Üç projeyi de "hello world" seviyesinde ayağa kaldır.

## Hedef
`make run-all` ile iki Go binary ayağa kalksın, `npm run dev` ile iki frontend açılsın. Boş sayfalar dönsün, hata vermesin.

## Backend (`backend/`)

- `go mod init kare-rehber/backend`
- Boş `cmd/admin-api/main.go` ve `cmd/public-api/main.go`:
  - `http.ServeMux` ile `/healthz` → `200 OK`
  - Port `env`'den (`ADMIN_API_PORT=8081`, `PUBLIC_API_PORT=8080`)
- `internal/config/config.go` — env okuma (port, db url, jwt secret)
- `internal/http/util.go` — `writeJSON`, `writeError`
- `internal/http/middleware/{logging,recover}.go` — minimum: panic recover + access log (slog)
- `migrations/` klasörü boş, `goose` kurulumu hazır (`tools.go` veya readme'de komut yeter)
- `.env.example` doldur
- `Makefile`:
  - `run-admin`, `run-public`, `run-all` (paralel), `migrate-up`, `seed`

## Frontend Admin (`frontend-admin/`)

- Vite + React + TS scaffold
- Tailwind + `shadcn/ui` init (`components.json`)
- `vite-plugin-pages` kur → `src/pages/index.tsx` → `<h1>admin</h1>`
- `src/main.tsx` — router init
- `src/api/client.ts` — base URL env'den (`VITE_ADMIN_API_URL`)
- TanStack Query provider `_app.tsx` veya `main.tsx`'te

## Frontend Public (`frontend-public/`)

- React Router v7 (framework mode) scaffold
- Tailwind + `shadcn/ui` init
- `routes.ts` ile `app/pages/index.tsx` → `<h1>public</h1>`
- `app/api/client.ts` — base URL env'den (`VITE_PUBLIC_API_URL`)
- TanStack Query provider `root.tsx`'te

## Done

- [ ] `make run-all` iki API'yi başlatır, `curl /healthz` → 200
- [ ] `frontend-admin` `npm run dev` → `/` açılır
- [ ] `frontend-public` `npm run dev` → `/` açılır
- [ ] `.env.example` dosyaları commit'lenmiş

## NOT YAP

- Auth, DB, domain, repository — hiçbiri burada YOK
- shadcn component'lerini şimdiden indirme (ihtiyaç çıkınca tek tek)
- Sidebar/Topbar layout'u henüz çizme (Phase 1'de gelecek)
