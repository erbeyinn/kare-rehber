# KARE-REHBER — Scaffold

## Teknoloji Seçimleri

| Katman | Teknoloji |
|---|---|
| Backend (admin + public) | Go |
| Frontend admin | React (Vite) + shadcn/ui |
| Frontend public | React Router v7 (framework mode) + shadcn/ui |
| DB | PostgreSQL (mock/varmış gibi) |
| Migration | goose |
| Query | sqlc |
| Router (Go) | stdlib mux (Go 1.22+) veya chi |
| Auth | JWT — admin: email+password, public: phone+birthdate+password |
| SMS | Interface tabanlı, şimdilik mock provider |
| Frontend state | TanStack Query (auth = context) |
| Form | React Hook Form + Zod |
| Tablo | TanStack Table + shadcn data-table |

---

## Monorepo Yapısı

```
kare-rehber/
├── backend/                 # Go backend (admin-api + public-api)
├── frontend-admin/          # React (Vite) + shadcn — admin paneli
├── frontend-public/         # React Router v7 + shadcn — kayıt + öğrenci/veli/koç/koordinatör
├── kare-rehber.md           # gereksinim dokümanı
└── scaffold.md
```

**Not — kayıt akışı:** Öğrenci kayıt formunda (`kayit/ogrenci`) hem öğrencinin hem velinin bilgileri (telefon + doğum tarihi) alınır. Kesin kayıt onaylanınca iki ayrı kullanıcı kaydı oluşur; ikisi de aynı login akışını (telefon + doğum tarihi + şifre) kullanır.

---

## 1. Backend (Go)

İki ayrı binary, ortak `internal/` paylaşımı.

```
backend/
├── cmd/
│   ├── admin-api/
│   │   └── main.go          # admin servisi entry
│   └── public-api/
│       └── main.go          # public servisi entry
│
├── internal/
│   ├── domain/              # entity'ler — User tek tablo, rol enum ile ayrılır
│   │   ├── user.go          # id, role, phone, birthdate, email, password_hash, ...
│   │   ├── student.go       # öğrenciye özel alanlar (okul, sınıf, parent_id, city)
│   │   ├── coach.go         # koça özel alanlar (uzmanlık vb.)
│   │   ├── meeting.go       # görüşme + durum (taslak/onay-bekliyor/onaylı)
│   │   ├── match.go         # student-coach / student-coordinator
│   │   ├── message.go
│   │   ├── sms_log.go
│   │   └── audit_log.go     # tüm değişiklik geçmişi (revision'ı da kapsar)
│   │
│   ├── auth/
│   │   ├── admin_auth.go    # email + password
│   │   ├── public_auth.go   # phone + birthdate + password
│   │   ├── password.go      # bcrypt hash
│   │   ├── jwt.go
│   │   └── middleware.go    # role guard
│   │
│   ├── repository/          # concrete Postgres impl (interface katmanı yok)
│   │   ├── user_repo.go
│   │   ├── student_repo.go
│   │   ├── coach_repo.go
│   │   ├── meeting_repo.go
│   │   ├── match_repo.go
│   │   ├── message_repo.go
│   │   ├── audit_repo.go
│   │   └── sms_log_repo.go
│   │
│   ├── service/             # iş kuralları
│   │   ├── registration_service.go    # ön kayıt + onay (öğrenci/koç)
│   │   ├── matching_service.go        # eşleştirme (il filtre + toplu)
│   │   ├── meeting_service.go         # CRUD + onay + gecikme listesi + görünürlük
│   │   ├── message_service.go
│   │   ├── sms_service.go
│   │   ├── audit_service.go
│   │   └── report_service.go
│   │
│   ├── http/
│   │   ├── admin/
│   │   │   ├── router.go
│   │   │   └── handlers/
│   │   │       ├── auth.go
│   │   │       ├── users.go
│   │   │       ├── matching.go
│   │   │       ├── meetings.go        # onay/güncelleme + geciken koçlar
│   │   │       ├── sms.go             # bireysel/toplu
│   │   │       ├── logs.go
│   │   │       └── reports.go
│   │   ├── public/
│   │   │   ├── router.go
│   │   │   └── handlers/
│   │   │       ├── auth.go            # login (phone+dob+pwd)
│   │   │       ├── student_register.go    # öğrenci + veli birlikte oluşur
│   │   │       ├── coach_register.go
│   │   │       ├── student_panel.go
│   │   │       ├── parent_panel.go
│   │   │       ├── coach_panel.go
│   │   │       ├── coordinator_panel.go
│   │   │       └── messages.go
│   │   ├── middleware/
│   │   │   ├── logging.go
│   │   │   ├── recover.go
│   │   │   └── auth.go
│   │   └── util.go          # json yazma + error helper'ları
│   │
│   ├── sms/
│   │   ├── provider.go      # interface
│   │   └── mock.go
│   │
│   └── config/
│       └── config.go
│
├── cmd/
│   └── seed/
│       └── main.go          # geliştirme verisi + ilk admin
│
├── migrations/
│   ├── 0001_init.sql
│   ├── 0002_meetings.sql
│   └── ...
│
├── .env.example
├── go.mod
├── go.sum
└── Makefile                 # run-admin, run-public, migrate, seed
```

**Önemli noktalar**
- İki API binary aynı `internal/` kodu kullanır → DRY
- `service` katmanı HTTP'den bağımsız (test edilebilir)
- `audit_service` görüşme update'lerini otomatik loglar (ayrıca revision tablosu YOK)
- `sms` arayüz tabanlı → ileride gerçek sağlayıcı eklenir
- Admin/Parent/Coordinator ayrı struct DEĞİL — `User` + role yeterli; öğrenci ve koç sadece ek alanları olduğu için ayrıldı

---

## 2. Frontend Admin (React + Vite + shadcn) — Next.js `pages/` mantığı

File-system based routing kullanılacak. `vite-plugin-pages` (veya `generouted`) ile `src/pages/` altındaki dosyalar otomatik route'a dönüşür.

Kurallar (Next.js Pages Router):
- `pages/index.tsx` → `/`
- `pages/login.tsx` → `/login`
- `pages/users/index.tsx` → `/users`
- `pages/users/[id].tsx` → `/users/:id`
- `pages/users/[id]/edit.tsx` → `/users/:id/edit`
- `pages/_app.tsx` → global layout/provider sarmalayıcısı
- `pages/_layout.tsx` (klasör başına) → o klasör için ortak layout

```
frontend-admin/
├── src/
│   ├── main.tsx                       # router init
│   ├── pages/
│   │   ├── _app.tsx                   # global providers (QueryClient, Theme, Toast, AuthCtx)
│   │   ├── _layout.tsx                # admin shell (sidebar/topbar) — login dışı her şey
│   │   ├── index.tsx                  # /  → dashboard'a redirect
│   │   ├── login.tsx                  # /login
│   │   ├── dashboard.tsx              # /dashboard
│   │   │
│   │   ├── users/
│   │   │   ├── students/
│   │   │   │   ├── index.tsx          # /users/students
│   │   │   │   └── [id].tsx           # /users/students/:id   (yeni kayıt modal ile)
│   │   │   ├── coaches/
│   │   │   │   ├── index.tsx
│   │   │   │   └── [id].tsx
│   │   │   ├── coordinators/
│   │   │   │   ├── index.tsx
│   │   │   │   └── [id].tsx
│   │   │   └── admins/
│   │   │       ├── index.tsx
│   │   │       └── [id].tsx
│   │   │
│   │   ├── matching/
│   │   │   ├── student-coach.tsx
│   │   │   └── student-coordinator.tsx
│   │   │
│   │   ├── meetings/
│   │   │   ├── index.tsx              # tümü + "onay bekleyen" tab/filter
│   │   │   └── [id].tsx
│   │   │
│   │   ├── sms/
│   │   │   ├── bulk.tsx
│   │   │   └── individual.tsx
│   │   │
│   │   ├── overdue-coaches.tsx        # /overdue-coaches
│   │   ├── logs.tsx                   # /logs
│   │   │
│   │   └── reports/
│   │       ├── index.tsx
│   │       ├── students.tsx
│   │       ├── coaches.tsx
│   │       ├── cities.tsx
│   │       └── meetings.tsx
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn
│   │   └── layout/                    # AdminShell, Sidebar, Topbar
│   │
│   ├── api/
│   │   ├── client.ts
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   ├── matching.ts
│   │   ├── meetings.ts
│   │   ├── sms.ts
│   │   ├── logs.ts
│   │   └── reports.ts
│   │
│   ├── hooks/
│   ├── lib/
│   │   └── utils.ts
│   └── types/
│
├── components.json
├── tailwind.config.ts
├── vite.config.ts                     # vite-plugin-pages konfigürasyonu
├── tsconfig.json
└── package.json
```

**Sadeleştirme notları:**
- Tek `_layout.tsx` (kök): admin shell. Her klasöre tekrar koymadık.
- `new.tsx` sayfaları kaldırıldı → yeni kayıt liste sayfasında modal/dialog ile.
- `pending.tsx` ayrı sayfa değil → `meetings/index.tsx` içinde filtre.
- `overdue-coaches/`, `logs/` klasörleri tek dosyaya indi.
- `components/forms`, `components/tables`, `components/guards` yok → ihtiyaç çıkınca eklenir.
- `stores/` yok → auth context yeter.

---

## 3. Frontend Public (React Router v7 + shadcn) — Next.js `pages/` mantığı

React Router v7'nin default klasör adı `app/routes/`. Onu Next.js stiline çekmek için iki opsiyon:

- **A)** `routes.ts` config'i ile manuel olarak `pages/` dizinini bağla (önerilen — RR v7 native).
- **B)** `@react-router/fs-routes` + `flatRoutes({ rootDirectory: "pages" })` ile dosya tabanlı routing.

Her iki durumda da klasör/dosya adlandırması Next.js Pages Router konvansiyonuna sadık kalır:

```
frontend-public/
├── app/
│   ├── root.tsx                              # global providers (QueryClient, Theme, AuthCtx)
│   ├── routes.ts                             # pages/ → route eşlemesi
│   ├── entry.client.tsx
│   ├── entry.server.tsx
│   │
│   ├── pages/
│   │   ├── index.tsx                         # /  (landing → login)
│   │   ├── login.tsx                         # /login
│   │   │
│   │   ├── kayit/
│   │   │   ├── ogrenci.tsx                   # öğrenci + veli birlikte alınır
│   │   │   └── koc.tsx
│   │   │
│   │   ├── ogrenci/                          # öğrenci paneli
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx                     # dashboard + onaylı görüşmeler
│   │   │   └── mesajlar.tsx
│   │   │
│   │   ├── veli/                             # veli paneli (login akışı öğrenci ile aynı)
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx                     # dashboard + onaylı görüşmeler
│   │   │   └── mesajlar.tsx
│   │   │
│   │   ├── koc/                              # koç paneli
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx                     # öğrenci listesi
│   │   │   ├── ogrenci.[id].tsx              # /koc/ogrenci/:id  (görüşme geçmişi)
│   │   │   └── gorusme.[id].tsx              # /koc/gorusme/:id  (yeni için id=new)
│   │   │
│   │   └── koordinator/                      # koordinatör paneli
│   │       ├── _layout.tsx
│   │       ├── index.tsx                     # öğrenci listesi
│   │       └── ogrenci.[id].tsx              # /koordinator/ogrenci/:id  (tüm görüşmeler)
│   │
│   ├── components/
│   │   ├── ui/                               # shadcn
│   │   └── layout/                           # role bazlı shell
│   │
│   ├── api/
│   ├── lib/
│   ├── hooks/
│   └── types/
│
├── public/
├── components.json
├── tailwind.config.ts
├── react-router.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

**Sadeleştirme notları:**
- Her panel kendi `_layout.tsx`'sini tutuyor (sidebar farklı, mantıklı).
- `gorusmeler/` altklasör çıkarıldı: liste zaten dashboard'da, detay görüşme sayfasıyla aynı yere düşüyor.
- Koç tarafında `ogrenciler/` ve `gorusme/` klasörleri tek dosyaya indi.
- `components/forms`, `components/guards` yok.

**Routing özet kuralları (her iki frontend için ortak):**
- `index.tsx` → klasörün kök URL'i
- `[param].tsx` → dinamik segment (`:param`)
- `_layout.tsx` → klasör için ortak layout (Outlet ile)
- `_app.tsx` (admin) / `root.tsx` (public) → global sarmalayıcı
- Tire-kebab dosya adları URL'de bire bir kullanılır (`student-coach.tsx` → `/matching/student-coach`)

---

## 4. Çapraz Konular

| Konu | Karar |
|---|---|
| Auth taşıma | JWT, `Authorization: Bearer` header |
| API base | admin-api: `:8081`, public-api: `:8080` (env'den) |
| DB | PostgreSQL (varmış gibi yapılacak) |
| Migration | goose |
| ORM | sqlc (typed queries) |
| Logging | slog (stdlib) |
| Validation | go-playground/validator |
| Frontend state | TanStack Query (server) + Context (auth) |
| Form | React Hook Form + Zod |
| Tablo | TanStack Table + shadcn data-table |

---

## 5. Çevre Dosyaları & Komutlar

```
backend/.env.example
  ADMIN_API_PORT=8081
  PUBLIC_API_PORT=8080
  DATABASE_URL=postgres://...
  JWT_SECRET=...
  SMS_PROVIDER=mock
```

Makefile hedefleri:
- `make migrate` — DB migration
- `make seed` — geliştirme verisi
- `make run-admin` — admin-api başlat
- `make run-public` — public-api başlat
- `make run-all` — ikisini birden

---

## 6. Phase Önerisi (taslak)

**Setup (phase değil)** — Repo iskeleti, boş `main.go`'lar, Vite/RR projeleri ayağa kalkar.

- **Phase 1** — DB şeması + auth (admin: email/pwd, public: phone+dob+pwd)
- **Phase 2** — Kullanıcı CRUD + kayıt akışları (öğrenci+veli birlikte, koç, mock SMS)
- **Phase 3** — Eşleştirme (il filtre + toplu seçim/eşleştirme)
- **Phase 4** — Görüşme + admin onayı + audit log + görünürlük kuralları (veli=onaylı, koord=tümü)
- **Phase 5** — Koç gecikme takibi + SMS yönetimi (bireysel/toplu)
- **Phase 6** — Mesajlaşma (veli/öğrenci → admin/koord)
- **Phase 7** — Raporlama / istatistik + cilalama
