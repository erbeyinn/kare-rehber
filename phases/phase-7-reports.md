# Phase 7 — Raporlama / İstatistik + Cilalama

## Hedef
Admin'in karar verirken bakacağı temel raporlar + audit log görüntüleme + dashboard rakamları. MVP — grafik kütüphanesi opsiyonel, basit kart/tablolar yeter.

## Backend

### Service (`report_service.go` genişletir)
- `Overview()` →
  - toplam öğrenci (aktif/pasif), koç, koordinatör sayısı
  - bu hafta yapılan görüşme sayısı
  - bekleyen onay sayısı
- `StudentStats(filter{city?, coach_id?})` →
  - öğrenci başına görüşme sayısı, son görüşme tarihi, statü
- `CoachStats()` →
  - koç başına atanmış öğrenci sayısı, toplam görüşme, son 30 gün görüşme
- `CityDistribution()` →
  - `[{city, student_count, coach_count}]`
- `MeetingStats(from, to)` →
  - günlük/haftalık toplam görüşme sayısı
  - statü dağılımı (draft/pending/approved)
- `MissingMeetings()` — Phase 5 `OverdueCoaches`'a benzer ama öğrenci perspektifinden (uzun süredir görüşülmemiş öğrenci)

### HTTP Admin
- `GET /reports/overview`
- `GET /reports/students?city=&coach_id=`
- `GET /reports/coaches`
- `GET /reports/cities`
- `GET /reports/meetings?from=&to=`
- `GET /reports/missing-meetings`
- `GET /logs?entity_type=&entity_id=&from=&to=&actor_id=` — `audit_logs` üzerinden

## Frontend Admin

- `pages/dashboard.tsx` — Overview kartları (sayılar)
- `pages/reports/index.tsx` — alt sayfalara link kartları
- `pages/reports/students.tsx` — il/koç filtre + tablo
- `pages/reports/coaches.tsx` — performans tablosu
- `pages/reports/cities.tsx` — il dağılımı tablosu (basit bar gerekirse `recharts`)
- `pages/reports/meetings.tsx` — tarih aralığı + günlük sayı tablosu
- `pages/logs.tsx`
  - Filtreler: entity_type, entity_id, actor, tarih
  - Tablo: zaman, actor, action, entity, "diff" → modal'da JSON pretty print
- `api/reports.ts`, `api/logs.ts`

## Cilalama (MVP düzeyinde)

- Boş durum (empty state) mesajları (tablo boşken)
- Loading skeleton — basit `<Skeleton>` yeter
- Hata toast'ları (TanStack Query `onError` global)
- Form validation mesajları Türkçeleştir
- Sidebar'da rol bazlı menü gizleme (koordinatör login'de admin sayfaları görünmesin) — public frontend için
- 401 yakalanınca login'e at + token temizle
- README: kurulum, `make` komutları, .env örnek

## Done

- [ ] Dashboard'da 4 sayı doğru gelir
- [ ] Her rapor sayfası filtreli çalışır
- [ ] Audit log filtrelenip diff modal'ı açılır
- [ ] Tüm sayfalar mobile'da kırılmıyor (basit responsive)
- [ ] 401 → login redirect
- [ ] README ile boş repo'dan ayağa kalkış adımları tamam

## NOT YAP

- PDF/Excel export YOK
- Cron'la günlük rapor email'i YOK
- Karmaşık BI grafikleri YOK — kart + tablo + tek bar grafik yeter
- Çoklu dil YOK — sadece Türkçe
- Tema değiştirici YOK — shadcn default
