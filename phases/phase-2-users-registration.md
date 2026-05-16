# Phase 2 — Kullanıcı CRUD + Kayıt Akışları

## Hedef
Admin 4 rolü de yönetebilir; öğrenci+veli birlikte, koç tek başına ön kayıt yapar; admin onaylayınca mock SMS atılır.

## Backend

### Migrations
- `0002_user_details.sql`
  - `students(user_id PK FK, school, grade, city, parent_id FK users)`
  - `coaches(user_id PK FK, specialty, is_approved BOOL DEFAULT false)`
  - `users.is_active BOOL DEFAULT false` (onay sonrası true)
- `0003_sms_log.sql`
  - `sms_logs(id, user_id NULL, phone, body, status, sent_at)`

### Domain & Repo
- `domain/student.go`, `domain/coach.go`, `domain/sms_log.go`
- `repository/student_repo.go`, `coach_repo.go`, `sms_log_repo.go`

### SMS
- `internal/sms/provider.go` — `interface { Send(phone, body string) error }`
- `internal/sms/mock.go` — stdout'a log + `sms_logs` tablosuna yaz

### Service
- `registration_service.go`
  - `RegisterStudent(payload)` → öğrenci + veli `users` + `students` (is_active=false)
  - `RegisterCoach(payload)` → koç user + `coaches` (is_approved=false)
  - `ApproveStudent(id)` → öğrenci & veli is_active=true, şifre üret, SMS gönder (öğrenci+veli ayrı)
  - `ApproveCoach(id)` → is_approved=true, is_active=true, şifre üret, SMS
  - `CreateCoordinator(payload)` / `CreateAdmin(payload)` — direkt aktif, SMS YOK (koordinatör için manuel buton var)

### HTTP Admin (`/users` prefix)
- `GET /users/students?status=pending|active`
- `POST /users/students/{id}/approve`
- `GET /users/coaches?status=pending|active`
- `POST /users/coaches/{id}/approve`
- `GET/POST/PUT /users/coordinators`
- `GET/POST/PUT /users/admins`
- `POST /users/{id}/send-credentials` — koordinatör için manuel SMS

### HTTP Public
- `POST /register/student` (öğrenci + veli payload tek body)
- `POST /register/coach`

## Frontend Admin

- `pages/users/students/index.tsx` — tab: bekleyen/aktif, tabloda "Onayla" butonu
- `pages/users/students/[id].tsx` — detay (modal değil, sayfa)
- `pages/users/coaches/...` — aynı pattern
- `pages/users/coordinators/index.tsx` — Yeni Ekle (modal), satırda "Giriş Bilgileri Gönder" butonu
- `pages/users/admins/index.tsx` — Yeni Ekle (modal)
- `api/users.ts` — endpoint wrapper'ları
- TanStack Table + shadcn data-table (paylaşılan minimal wrapper, abartma)

## Frontend Public

- `pages/kayit/ogrenci.tsx` — RHF + Zod, tek formda öğrenci alanları + veli alanları
- `pages/kayit/koc.tsx` — RHF + Zod
- Submit sonrası "kaydınız alındı, SMS bekleyin" ekranı

## Done

- [x] Öğrenci kayıt formu doldurulur → DB'de öğrenci+veli user pending oluşur
- [x] Admin "Onayla" basınca her ikisine de SMS log'u düşer
- [x] Koç aynı şekilde
- [x] Koordinatör elle eklenir, butonla SMS gider
- [x] Admin elle eklenir, SMS yok
- [x] Aktif olan kullanıcı Phase 1 login akışıyla girebilir

## NOT YAP

- Gerçek SMS provider YOK
- Şifre üretimi: 8 karakter random yeter, politika abartma
- Soft delete YOK, edit/disable yeter
