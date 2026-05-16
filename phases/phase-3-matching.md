# Phase 3 — Eşleştirme (Öğrenci ↔ Koç / Koordinatör)

## Hedef
Admin, öğrencileri il bazlı filtreleyip toplu seçim ve toplu eşleştirme yapabilsin. Koç eşleştirmesi ve koordinatör eşleştirmesi ayrı sayfalar.

## Backend

### Migrations
- `0004_matches.sql`
  - `matches(id, student_id FK, target_id FK users, type ENUM('coach','coordinator'), assigned_at, assigned_by FK users)`
  - Unique: `(student_id, type)` — bir öğrencinin aynı anda 1 koçu + 1 koordinatörü var

### Domain & Repo
- `domain/match.go`
- `repository/match_repo.go`
  - `BulkAssign(studentIDs, targetID, type, assignedBy)` — tek transaction
  - `ListByStudent(studentID)`, `ListByTarget(targetID, type)`
  - `Unassign(studentID, type)`

### Service
- `matching_service.go`
  - `ListStudentsWithMatches(filter{city, type, unmatched bool})` → liste + mevcut eşleştirme
  - `BulkMatch(studentIDs, targetID, type)` — var olanı override eder
  - `Unmatch(studentID, type)`

### HTTP Admin
- `GET /matching/students?city=...&type=coach|coordinator&unmatched=true`
- `GET /matching/coaches` / `GET /matching/coordinators` (hedef listesi)
- `POST /matching/bulk` — body: `{student_ids, target_id, type}`
- `DELETE /matching/{student_id}?type=...`

## Frontend Admin

- `pages/matching/student-coach.tsx`
  - Üst bar: il select + "sadece eşleştirilmemiş" toggle + arama
  - Sol: öğrenci tablosu (checkbox kolonu, mevcut koç badge)
  - Sağ: koç listesi (radio)
  - Footer: "Seçilenleri Eşleştir" butonu → onay modal'ı → toast
- `pages/matching/student-coordinator.tsx` — aynı pattern, hedef koordinatör
- `api/matching.ts` — endpoint wrapper'ları
- Mevcut shadcn data-table'ı kullan, yeni layout abstraction yazma

## Done

- [ ] İl filtresi gelir, sadece o ildeki öğrenciler listelenir
- [ ] Toplu seçim + tek koça atama tek istekte gider
- [ ] Var olan eşleştirme override edilir, eski silinir
- [ ] Koordinatör eşleştirmesi de aynı şekilde çalışır
- [ ] Öğrenci panelinde (Phase 1'den kalan boş `index.tsx`) atanmış koç/koord adı görünür (basit getirme)

## NOT YAP

- Drag&drop YOK
- Eşleştirme geçmişi tablosu YOK — current state yeter (audit Phase 4'te gelecek görüşmeler için)
- Otomatik öneri/algoritma YOK — admin manuel seçer
- "Eşleştirme onayı" gibi ikinci adım YOK
