# Phase'ler

scaffold.md'deki phase önerisinin somutlaştırılmış hâli. **MVP** odaklı: her phase tek bir çalışan dilimi tamamlar, gerekmedikçe abstraction / soyutlama eklenmez.

## Sıra

| # | Dosya | Hedef |
|---|---|---|
| 0 | [phase-0-setup.md](phase-0-setup.md) | Repo iskeleti, "hello world" |
| 1 | [phase-1-auth.md](phase-1-auth.md) | DB şeması + iki ayrı login akışı |
| 2 | [phase-2-users-registration.md](phase-2-users-registration.md) | Kullanıcı CRUD + öğrenci/koç kayıt + mock SMS |
| 3 | [phase-3-matching.md](phase-3-matching.md) | Öğrenci-koç ve öğrenci-koordinatör eşleştirme |
| 4 | [phase-4-meetings.md](phase-4-meetings.md) | Görüşme + admin onayı + audit + görünürlük |
| 5 | [phase-5-overdue-sms.md](phase-5-overdue-sms.md) | Geciken koç takibi + bireysel/toplu SMS |
| 6 | [phase-6-messaging.md](phase-6-messaging.md) | Veli/öğrenci → admin/koordinatör mesajlaşma |
| 7 | [phase-7-reports.md](phase-7-reports.md) | Raporlar + audit log görüntüleme + cilalama |

## Genel Kurallar

- **Bir phase tamamlanmadan diğerine geçme.** Her phase'in "Done" listesi tutmuyorsa o phase'de kal.
- **NOT YAP** bölümlerine uy — yeni dosya/abstraction/feature için karar verirken oraya bak.
- DB'ye yeni alan gerekirse yeni migration dosyası aç (mevcutu değiştirme — Phase 0 sonrası).
- Her phase backend + frontend kesitini birlikte bitirir; yarım kalan dilim bırakma.
- Yeni shadcn component'i ihtiyaç anında `npx shadcn add ...` ile eklenir, toplu indirme yapılma.
