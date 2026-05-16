# Phase 1 — DB Şeması + Auth

## Hedef
Kullanıcı tablosu + iki ayrı login akışı çalışsın. Admin email+şifre, public telefon+doğum tarihi+şifre ile girer; JWT döner; her iki frontend'de "login → boş dashboard" akışı kapanır.

## Backend

### Migrations
- `0001_init.sql`
  - `users(id, role, first_name, last_name, phone, birthdate, email NULL, password_hash, created_at, updated_at)`
  - `role` enum: `admin | coordinator | coach | student | parent`
  - Unique: `(phone, birthdate)` ve `email` (NULL'lar hariç)

### Domain
- `internal/domain/user.go` — `User` struct + `Role` tipi

### Repository (sqlc)
- `internal/repository/user_repo.go`
  - `GetByEmail`, `GetByPhoneAndBirthdate`, `GetByID`, `Create`

### Auth
- `internal/auth/password.go` — bcrypt hash/verify
- `internal/auth/jwt.go` — `Issue(userID, role)`, `Parse(token)`
- `internal/auth/admin_auth.go` — `LoginByEmail(email, pwd)` → JWT
- `internal/auth/public_auth.go` — `LoginByPhone(phone, dob, pwd)` → JWT
- `internal/http/middleware/auth.go` — `RequireRole(roles...)`

### HTTP
- `internal/http/admin/handlers/auth.go` — `POST /auth/login` (email+pwd)
- `internal/http/public/handlers/auth.go` — `POST /auth/login` (phone+dob+pwd)
- `GET /me` (her iki API'de) → token sahibi user

### Seed
- `cmd/seed/main.go` — ilk admin (env'den email/pwd)

## Frontend Admin

- `pages/login.tsx` — RHF + Zod (email, password)
- `api/auth.ts` — `login`, `me`
- `AuthCtx` (`_app.tsx`) — token localStorage, `user` state
- `pages/_layout.tsx` — token yoksa `/login`'e redirect, varsa boş AdminShell (Sidebar + Topbar placeholder)
- `pages/dashboard.tsx` — `<h1>Hoşgeldin {user.first_name}</h1>`
- `pages/index.tsx` — `/dashboard`'a redirect

## Frontend Public

- `pages/login.tsx` — RHF + Zod (phone, birthdate, password)
- `api/auth.ts` — `login`, `me`
- `AuthCtx` (`root.tsx`) — token localStorage
- Login sonrası `role`'e göre redirect:
  - `student` → `/ogrenci`
  - `parent` → `/veli`
  - `coach` → `/koc`
  - `coordinator` → `/koordinator`
- Her panel için boş `_layout.tsx` + `index.tsx` (`<h1>...</h1>`)

## Done

- [ ] Migration uygulanır, seed ilk admin'i atar
- [ ] Admin login çalışır, `/me` döner
- [ ] DB'ye elle 1 koç + 1 öğrenci insert edilince public login çalışır
- [ ] Geçersiz şifre → 401
- [ ] Frontend'lerde token saklama + reload sonrası oturum kalıyor

## NOT YAP

- Kayıt formu YOK (Phase 2)
- SMS YOK (Phase 2)
- Refresh token, password reset YOK (MVP dışı)
- Role bazlı yetki guard'ı sadece middleware, frontend'de minimal
