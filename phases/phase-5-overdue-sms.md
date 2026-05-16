# Phase 5 — Koç Gecikme Takibi + SMS Yönetimi

## Hedef
Admin, görüşmesi geciken koçları görür ve bireysel veya toplu SMS gönderir. SMS log'u tutulur.

## Backend

### Konfig
- `internal/config/config.go` — `COACH_MEETING_INTERVAL_DAYS` (default 14)

### Service
- `report_service.go` (yeni)
  - `OverdueCoaches(intervalDays int)` →
    - Her aktif koç için: atanmış öğrenci sayısı, son görüşme tarihi, gün farkı
    - Filtre: `son_görüşme IS NULL` veya `now - son_görüşme > interval`
    - Dönüş: `[]{coach, student_count, last_meeting_at, days_overdue}`
- `sms_service.go`
  - `SendIndividual(userID, body)` → tek SMS + log
  - `SendBulk(userIDs, body)` → loop + log (her biri ayrı satır)
  - `SendToOverdueCoaches(body)` → `OverdueCoaches`'tan ID'leri alıp `SendBulk`

### HTTP Admin
- `GET /reports/overdue-coaches?days=14`
- `POST /sms/individual` — `{user_id, body}`
- `POST /sms/bulk` — `{user_ids: [...], body}`
- `POST /sms/overdue-coaches` — `{body}` (kısayol)
- `GET /sms/logs?user_id=&from=&to=` — opsiyonel, geçmiş

## Frontend Admin

- `pages/overdue-coaches.tsx`
  - Üstte "Gün eşiği" input (default 14) + Yenile
  - Tablo kolonları: ad, telefon, öğrenci sayısı, son görüşme, gün, checkbox
  - Tablo altı: seçilenler için "SMS Gönder" + "Hepsine SMS Gönder" butonları → SMS modal'ı (body textarea)
- `pages/sms/individual.tsx`
  - Kullanıcı arama/seçme (basit combobox: ad/telefon ile arar)
  - Body textarea + Gönder
- `pages/sms/bulk.tsx`
  - Filtreler: rol (koç/öğrenci/veli/koord) + il
  - Eşleşen kullanıcı sayısı önizleme
  - Body textarea + "Tümüne Gönder"
- `api/sms.ts`, `api/reports.ts` wrapper'ları

## Done

- [ ] 14 gün görüşme yapmamış koç listede çıkar
- [ ] Hiç görüşmesi olmayan koç da listede çıkar
- [ ] Bireysel SMS log'a düşer (mock provider stdout)
- [ ] Toplu SMS her alıcı için ayrı log satırı oluşturur
- [ ] "Geciken koçların hepsine SMS" tek tıkla çalışır

## NOT YAP

- Şablon/template sistemi YOK — düz metin yeter
- Zamanlama (scheduled SMS) YOK
- Teslim raporu / okundu bilgisi YOK (mock zaten)
- Karakter limiti uyarısı opsiyonel, abartma
- Otomatik hatırlatma cron'u YOK — admin manuel tetikler
