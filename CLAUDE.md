# CLAUDE.md

Bu dosya, projenin frontend (UI/UX) tarafında uyulması zorunlu kuralları içerir. Bu kurallar yorum değildir — sapma için açık gerekçe gerekir.

## 1. Design Token Disiplini

- Renk, tipografi, spacing, radius, shadow, easing, duration gibi tüm görsel değerler **design token** üzerinden okunur. Bileşen dosyasında ham değer (`#fff`, `16px`, `rgba(...)`, `0.3s`) yazmak yasaktır.
- Tokenlar tek kaynaklıdır (`frontend-admin/src/index.css` ve `frontend-public/app/app.css` içindeki `@theme` blokları). Aynı kavram için iki yerde değer tanımlanmaz; iki frontend de aynı semantik token setine sahip olmalıdır.
- Yeni bir görsel değere ihtiyaç varsa: **önce token tanımla**, sonra kullan. "Geçici olarak inline yazıyorum" kabul edilmez.
- İki katmanlı token mimarisi:
  - **Ham (primitive) tokenlar** — brand paletinden gelir, sadece semantik tokenları beslemek için kullanılır. Bileşende doğrudan tüketilmez.
  - **Semantik tokenlar** — bileşenlerin tükettiği seviyedir (`--color-surface-elevated`, `--color-text-muted`, `--space-section`).
- Dark mode, density ve responsive varyasyonlar token katmanında çözülür — bileşende `if dark` mantığı bulunmaz.

### 1.1 shadcn/ui Uyumu

Proje shadcn/ui (new-york, `baseColor: neutral`, `cssVariables: true`) + Tailwind v4 kullanır. Token katmanı shadcn'in beklediği değişken isimlerini **birebir** karşılamak zorundadır; ancak değerler default neutral paletten gelmez, bu projenin brand paletinden türetilir.

Zorunlu shadcn semantik değişkenleri (Tailwind v4 `@theme` içinde `--color-*` olarak yazılır):

```
background, foreground,
card, card-foreground,
popover, popover-foreground,
primary, primary-foreground,
secondary, secondary-foreground,
muted, muted-foreground,
accent, accent-foreground,
destructive, destructive-foreground,
border, input, ring,
chart-1 … chart-5,
sidebar, sidebar-foreground, sidebar-primary, sidebar-primary-foreground,
sidebar-accent, sidebar-accent-foreground, sidebar-border, sidebar-ring
```

Eksik bırakılan değişken yasak — shadcn bileşenleri eklendiğinde sessiz fallback'e düşmemeli.

### 1.2 Brand Palet ve Tema Uyumu

Ham palet `brandcolors-1778932667.css` dosyasındaki Boise State paletinden alınır. Bu dosya **kaynak** değil, **referans**tır; değerler kopyalanır, dosyaya import edilmez.

Ham token haritası (`@theme` içinde tanımlanır, `--brand-*` ile başlar):

| Token | Değer | Rol |
|---|---|---|
| `--brand-navy-900` | `#09347a` | Brand birincil (deep) |
| `--brand-blue-700` | `#0169a4` | Birincil – orta |
| `--brand-blue-500` | `#007dc3` | Birincil – parlak |
| `--brand-blue-300` | `#3399cc` | Birincil – açık |
| `--brand-orange-500` | `#f1632a` | Aksan / vurgu |
| `--brand-ink-700` | `#464646` | Koyu nötr (text) |
| `--brand-ink-300` | `#b7b7b7` | Orta nötr (border / muted) |
| `--brand-ink-50` | `#f6f6f5` | Açık nötr (surface) |

Semantik eşleme kuralları (uyumlu kalmak için bağlayıcı):

- `primary` → `--brand-navy-900`, `primary-foreground` → `--brand-ink-50`.
- `accent` / vurgu / CTA hover-ring → `--brand-orange-500`. Turuncu **dekoratif değil** — yalnız anlamlı vurgular için (CTA, focus ring, aktif state, kritik mikro etkileşim).
- `secondary` → `--brand-blue-500` veya `--brand-blue-700` (kontekste göre); `secondary-foreground` → `--brand-ink-50`.
- `muted` → `--brand-ink-50`, `muted-foreground` → `--brand-ink-700`.
- `border` → `--brand-ink-300` türevli (alpha düşürülmüş tercih edilir).
- `ring` → `--brand-orange-500` veya `--brand-blue-500` (aynı anda iki ringli stil olmaz, projede tek bir karar verilir ve sabit kalır).
- `background` (light) → `#ffffff` veya `--brand-ink-50` arasından seçilir; karışım yapılmaz.
- `destructive` brand paletinde yok — paletle uyumlu sıcak bir kırmızı türetilir (`oklch` ile turuncudan ayrıştırılır, ona yapışık görünmemeli).
- `chart-1…5` brand mavilerinden + turuncudan, eşit luminance adımlarıyla türetilir; rastgele renk yasak.

Palet bütünlüğü:

- Renkler `oklch()` ile yazılır (Tailwind v4 standardı). HEX yalnız ham token tanımında, semantik katmanda `oklch` kullanılır — bu, dark mode ve alpha varyasyonlarının tutarlı kalmasını sağlar.
- Tüm metin/yüzey eşlemeleri WCAG AA kontrastını sağlar. Navy üstünde turuncu metin yasak (kontrast yetersiz); turuncu üstünde navy metin tercih edilir.
- Aynı sayfada iki farklı mavi tonu yan yana kullanılacaksa aralarında en az bir nötr katman bulunur — mavi tonları birbirine yapıştırılmaz.
- Dark mode, ham paleti değiştirmeden semantik eşlemelerin yeniden haritalanmasıyla yapılır (örn. `primary` dark'ta `--brand-blue-500` olur, navy değil).

## 2. Görsel Dil: Sanatsal Kompozisyon

- Düz shadcn / Tailwind default görünümü **yasaktır**. Her ekran bir kompozisyon olarak tasarlanır: hiyerarşi, ritim, nefes alanı, odak noktası bilinçli kurulur.
- Card → grid → card → grid tekrarı kabul edilmez. Sayfa düzeni farklı ağırlıkta bloklardan oluşmalı; asimetri, overlap, layering, decorative element (blur, grain, gradient mesh, soft shape, çizgi, mikro-illustrasyon) kullan.
- Tipografi ifadelidir: display ↔ body kontrastı belirgin, satır yüksekliği ve harf aralığı amaca göre seçilir. Tek font weight / tek font size ile sayfa kurulmaz.
- Renk paleti minimum 1 belirgin aksan + nötr katmanlardan oluşur. Aksan rengi anlamlı şekilde (CTA, durum, vurgu) kullanılır; dekoratif değildir.
- Boş alan (whitespace) bir tasarım elemanıdır — doldurulmaya çalışılmaz.
- Boundaryler: 1px gri border yerine surface seviyeleri (elevation), inner shadow, ya da soft divider tercih edilir.

## 3. Hareket ve Animasyon

UI hareketli, akıcı ve modern hissettirmelidir. Animasyon dekorasyon değil, kullanıcıyı yönlendiren ana katmandır.

- **Her interaktif element** state geçişlerinde animasyonlu olur: hover, focus, active, disabled, loading, success, error. Anlık (instant) geçiş kullanılmaz.
- **Sayfa ve route geçişleri** animasyonludur (fade + subtle translate / shared element). Beyaz flash yasak.
- **Liste ve grid** mount/unmount'ta staggered animasyon ile gelir. Skeleton → content geçişi cross-fade ile olur, pop-in değil.
- **Scroll-driven** etkileşimler kullanılır: parallax katmanlar, viewport'a giren elementlerde reveal, sticky header'da blur/shrink, scroll progress göstergeleri.
- **Mikro etkileşimler** zorunludur: buton press'te ölçek + shadow değişimi, input focus'ta ring expand, toggle'da spring, ikon morph, sayı sayaçlarda count-up.
- **Cursor / hover affordance**: kart hover'da magnetic / tilt / glow / gradient follow gibi modern teknikler — her sayfada en az bir "imza" mikro-etkileşim olmalı.
- **Easing**: `linear` ve default `ease` yasak. Token'lardan gelen `ease-out-expo`, `ease-spring`, `ease-emphasized` kullanılır. Süreler genelde 150–400ms; karakter gerektiren yerlerde spring config.
- **Performans**: animasyonlar `transform` ve `opacity` üzerinden yapılır (layout-thrash yok). 60fps altına düşen animasyon kabul değildir. `prefers-reduced-motion` her zaman desteklenir — kapatıldığında animasyonlar disable değil, *sade* alternatife düşer.
- Animasyon kütüphanesi seçildikten sonra (Framer Motion / Motion One / GSAP vb.) **tek bir** kütüphane kullanılır, karıştırılmaz.

## 4. Bileşen ve Erişilebilirlik

- Bileşenler "headless logic + tokenize edilmiş görsel" prensibiyle yazılır. Logic ve görünüm birbirine yapışmaz.
- Her interaktif bileşen klavye ile tam kullanılabilir, focus-visible state'i belirgin (token'dan gelen ring) olur.
- Renk kontrastı WCAG AA minimumdur; aksan rengi yalnız büyük tipografide AA'yı geçiyorsa küçük metinde kullanılmaz.
- Form alanlarında label her zaman görünür (placeholder = label anti-pattern). Hata mesajları animasyonlu olarak belirir, ARIA ile bağlanır.

## 5. Yapısal Disiplin

- Aynı görsel pattern iki yerde tekrarlandıysa bileşene çıkarılır — ama erken soyutlama yapılmaz (3. tekrarda).
- Inline `style={{ ... }}` yalnızca runtime'da hesaplanan değer için (örn. cursor pozisyonu, scroll progress) kullanılır; statik stiller için yasak.
- Magic number yok: her offset, delay, duration token'dan gelir.
- `!important` yasak. Specificity savaşı bileşen yapısıyla çözülür.

## 6. Kabul Kriteri

Bir ekran "tamam" sayılmaz, eğer:
- Token dışı ham değer kullanıyorsa,
- Tüm interaktif elemanlarda geçişler animasyonsuzsa,
- Sayfa boş bırakıldığında (loading / empty state) hâlâ kompozisyon hissi vermiyorsa,
- Default shadcn / Tailwind starter görünümünden ayırt edilemiyorsa.
