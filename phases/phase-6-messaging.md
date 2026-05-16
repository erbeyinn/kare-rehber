# Phase 6 — Mesajlaşma (Veli/Öğrenci → Admin/Koordinatör)

## Hedef
Veli ve öğrenci, admin'e veya kendi koordinatörüne mesaj gönderebilsin. Admin ve koordinatör gelen mesajları görüp cevaplayabilsin. Tüm mesajlaşma kayıt altında.

## Backend

### Migrations
- `0007_messages.sql`
  - `messages(id, sender_id FK, recipient_role ENUM('admin','coordinator'), recipient_id FK NULL, body TEXT, thread_id NULL, read_at NULL, created_at)`
  - `recipient_id`:
    - veli/öğrenci → koordinatör mesajında o öğrencinin eşleşmiş koordinatörü
    - veli/öğrenci → admin mesajında NULL (havuza düşer, herhangi bir admin görür/cevaplar)
  - `thread_id` = ilk mesajın id'si; cevaplar aynı thread'e bağlanır

### Domain & Repo
- `domain/message.go`
- `repository/message_repo.go`
  - `Create`, `ListThreadsForUser(userID, role)`, `ListByThread(threadID)`, `MarkRead(threadID, userID)`

### Service
- `message_service.go`
  - `SendFromPublic(senderID, recipientRole, body, threadID?)`
    - Sender öğrenci/veli ise: koord hedefi için eşleşmesi olmalı; admin hedefinde kontrol yok
  - `ReplyAsAdmin(adminID, threadID, body)`
  - `ReplyAsCoordinator(coordID, threadID, body)`
  - `ListInbox(userID, role)` — thread listesi (son mesaj, okunmadı sayısı)
  - `ListThread(threadID, viewerID)` — yetki kontrolü

### HTTP Public
- `GET /messages/threads`
- `GET /messages/threads/{id}`
- `POST /messages` — `{recipient_role, body, thread_id?}`
- `POST /messages/threads/{id}/read`

### HTTP Admin
- `GET /messages/threads?mine=true|false` (mine=false → admin havuzu)
- `GET /messages/threads/{id}`
- `POST /messages/threads/{id}/reply` — body: `{body}` (admin veya koord)

## Frontend Public

- `pages/veli/mesajlar.tsx` ve `pages/ogrenci/mesajlar.tsx`
  - Sol: thread listesi (alıcı rolü + son mesaj)
  - Sağ: thread görüntüleme + yeni mesaj input
  - "Yeni Mesaj" butonu → modal: alıcı rolü (admin/koordinatör) + body
- `api/messages.ts` wrapper

## Frontend Admin

- `pages/messages.tsx` (yeni, scaffold'da yok ama küçük) **veya** sidebar'a bağlanan basit inbox
  - Tab: "Bana Gelenler" / "Admin Havuzu" (koordinatör login'de sadece kendininki)
  - Sol thread liste, sağ konuşma + cevap input
- Koordinatör de aynı sayfayı görür (rol-aware), şimdilik aynı route yeter

## Done

- [ ] Veli admin'e mesaj atar → admin inbox'ında "havuz" altında çıkar
- [ ] Öğrenci koordinatöre mesaj atar → sadece o koordinatörün inbox'ına düşer
- [ ] Cevap aynı thread'e eklenir
- [ ] Okundu işaretleme çalışır, okunmadı sayısı doğru
- [ ] `messages` tablosunda tüm geçmiş tutuluyor

## NOT YAP

- Dosya/görsel ek YOK
- Realtime (WebSocket/SSE) YOK — TanStack Query refetch yeter
- Bildirim / push YOK
- Mesaj silme/düzenleme YOK
- Grup mesajı YOK
