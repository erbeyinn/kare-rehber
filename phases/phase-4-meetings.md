# Phase 4 — Görüşme + Onay + Audit + Görünürlük

## Hedef
Koç görüşme yazar (taslak/onay-bekliyor), admin onaylar veya günceller, değişiklikler audit_log'a düşer. Görünürlük:
- **Veli & Öğrenci:** sadece **onaylı**
- **Koordinatör:** **tümünü** admin onayı beklemeden görür
- **Admin:** tümü

## Backend

### Migrations
- `0005_meetings.sql`
  - `meetings(id, student_id, coach_id, meeting_date, content TEXT, evaluation TEXT, status ENUM('draft','pending','approved'), created_at, updated_at)`
- `0006_audit_logs.sql`
  - `audit_logs(id, entity_type, entity_id, action, actor_id, diff JSONB, created_at)`

### Domain & Repo
- `domain/meeting.go`, `domain/audit_log.go`
- `repository/meeting_repo.go`, `audit_repo.go`

### Service
- `meeting_service.go`
  - `CreateDraft(coachID, payload)` → status=draft
  - `Submit(meetingID, coachID)` → draft→pending
  - `Approve(meetingID, adminID)` → pending→approved (+ audit)
  - `Update(meetingID, actorID, patch)` → admin her statüde update edebilir; her update audit log'a düşer (eski→yeni diff)
  - `ListForCoach(coachID, studentID?)`
  - `ListForStudent(studentID)` — sadece approved
  - `ListForParent(parentID)` — child(ler)in approved görüşmeleri
  - `ListForCoordinator(coordID)` — eşleşmiş öğrencilerin **tüm** statüleri
  - `ListPendingForAdmin()`
- `audit_service.go` — `LogChange(entity, id, actor, before, after)` (meeting_service tarafından çağrılır)

### HTTP Admin
- `GET /meetings?status=pending|all`
- `GET /meetings/{id}`
- `PUT /meetings/{id}` (audit'le)
- `POST /meetings/{id}/approve`

### HTTP Public
- **Koç:** `GET /coach/students`, `GET /coach/students/{id}/meetings`, `POST /coach/meetings`, `PUT /coach/meetings/{id}`, `POST /coach/meetings/{id}/submit`
- **Öğrenci:** `GET /student/meetings` (approved)
- **Veli:** `GET /parent/meetings` (approved, child(ler))
- **Koordinatör:** `GET /coordinator/students`, `GET /coordinator/students/{id}/meetings` (tümü)

## Frontend Admin

- `pages/meetings/index.tsx` — tablo + tab/filter: "Onay Bekleyen" / "Tümü", satırda Onayla butonu
- `pages/meetings/[id].tsx` — detay + edit form (RHF+Zod) + Onayla
- Audit log görünümü Phase 7'ye bırak (burada sadece kaydedilmesi yeter)

## Frontend Public

- **Koç (`pages/koc/`)**
  - `index.tsx` — atanmış öğrenci listesi
  - `ogrenci.[id].tsx` — öğrencinin görüşme geçmişi + "Yeni Görüşme" butonu
  - `gorusme.[id].tsx` — id=`new` ise create, değilse edit; "Taslak Kaydet" + "Gönder (onaya)"
- **Öğrenci (`pages/ogrenci/index.tsx`)** — onaylı görüşme listesi (read-only)
- **Veli (`pages/veli/index.tsx`)** — aynı, çocuklarınki
- **Koordinatör (`pages/koordinator/`)**
  - `index.tsx` — atanmış öğrenci listesi
  - `ogrenci.[id].tsx` — öğrencinin **tüm** görüşmeleri (statü badge'li)

## Done

- [ ] Koç görüşme oluşturur → draft; gönderir → pending
- [ ] Veli/öğrenci panelinde görünmez
- [ ] Koordinatör panelinde anında görünür
- [ ] Admin onaylar → veli/öğrenci panelinde görünür
- [ ] Admin update yapar → `audit_logs`'a satır düşer
- [ ] Update'te diff JSON'u eski/yeni alan farklarını içerir

## NOT YAP

- Yorum/iliştirme/dosya yükleme YOK
- Versiyonlama tablosu YOK — audit yeter
- Bildirim YOK
