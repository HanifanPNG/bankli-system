# Plans — animasi scroll Bankli

Hasil recon + audit: `improve-animations` (skill), 19 Okt 2026.
Commit acuan: `85ba2b6`.

Stack: **Astro 7 + Tailwind v4, tanpa React**. Semua contoh React di
`motion.dev/docs/react-scroll-animations` diterjemahkan ke API vanilla `motion`
(`animate`, `inView`, `scroll`). Paket `motion` belum terpasang sebelum plan 001.

## Daftar plan

| # | Judul | Severity | Status | File |
| --- | --- | --- | --- | --- |
| 001 | Fondasi: Motion + mesin animasi masuk (reveal engine) | HIGH | DONE (19 Okt 2026) | [001-motion-reveal-engine.md](001-motion-reveal-engine.md) |
| 002 | Reveal teks: judul per kata + urutan masuk hero | HIGH | DONE (19 Okt 2026) | [002-text-reveal-mask.md](002-text-reveal-mask.md) |
| 003 | Animasi masuk per section (rail, kartu, mockup) | HIGH | DONE (19 Okt 2026) | [003-section-entrances.md](003-section-entrances.md) |
| 004 | Parallax scroll-linked pada mockup hero | LOW | DONE (19 Okt 2026) | [004-scroll-linked-parallax.md](004-scroll-linked-parallax.md) |
| 005 | Teks berjalan (text scroll) mengikuti scroll halaman | MEDIUM | DIBATALKAN (19 Okt 2026) | [005-text-scroll-marquee.md](005-text-scroll-marquee.md) |

## Urutan eksekusi

1. **001** — wajib lebih dulu; 002–005 semua bergantung padanya (mesin + token + pre-state CSS).
2. **002** — struktur teks (judul per kata + urutan masuk hero).
3. **003** — badan tiap section.
4. **005** — band teks berjalan (fitur "text scroll" yang diminta; keputusan penempatan + copy
   perlu persetujuan pemilik proyek sebelum dikerjakan).
5. **004** — opsional, sentuhan terakhir (satu frasa scroll-linked di hero).

Jalankan satu plan per waktu, satu worktree per plan, dan jangan lanjut ke plan berikutnya sebelum
bagian **Verification** plan sebelumnya lulus.

## Catatan pasca plan 001

- Mesin reveal sudah aktif, tetapi **belum ada satu pun elemen yang beranimasi** — elemen baru
  bergerak setelah plan 002/003 memasang atribut `data-reveal*`. Itu memang keadaan yang benar.
- `motion@14.3.0` menambah **64,5 KB raw / 23,2 KB gzip** ke bundle client. Root export-nya
  re-export `framer-motion/dom` (core hybrid, bukan versi mini). Kalau ukuran ini jadi masalah,
  alternatif yang jauh lebih kecil adalah CSS scroll-driven animation (`animation-timeline`),
  bukan `motion/mini` (mini tidak punya `scroll()`).
- Kontrak atribut + nama fungsi (`play`, `playMask`, `init`, `reducedMotion`, `ms`, `VIEW`) sudah
  final; plan 004/005 menempel pada nama-nama itu.

## Keputusan yang sudah final (jangan diutak-atik plan)

- Animasi masuk memakai tween `--ease-out = cubic-bezier(0.23, 1, 0.32, 1)`, durasi 0.45–0.7s,
  stagger 40–80ms. Bukan spring: semua gerak di sini *predetermined*, bukan gesture.
- Hanya `transform` / `opacity` / `clip-path` yang dianimasikan; transform selalu string penuh
  (`translateY(16px)`), bukan shorthand `x`/`y`/`scale` (AUDIT §5).
- `prefers-reduced-motion: reduce` → gerak dihapus, fade 180ms tetap ada (AUDIT §6).
- Sweep 500ms pada tombol (`Button.astro`, `sweep` prop) **dibiarkan** — itu keputusan desain yang
  sudah disetujui pemilik proyek, bukan temuan yang perlu diperbaiki.
- Kartu berantre di `About.astro` (klik/Tab untuk majukan kartu) dibiarkan apa adanya; motion baru
  tidak boleh menyentuh `[data-card]` / `transform` kartu-kartu itu.

## Catatan pasca plan 002–005

Semua plan selesai di satu pohon kerja (bukan worktree terpisah), karena dev server pengecekan
visual berjalan di direktori ini.

- **002** — 21 kata ber-mask (2 judul hero + 1 CTA band); spasi antar kata tetap teks asli, jadi
  pembungkusan baris tidak berubah. Urutan masuk hero: judul 0ms → sub 350ms → tombol 450ms →
  mockup 500ms (semua `data-reveal-now`, menunggu font maks 400ms).
- **003** — rail Cara Kerja (li `rise` + garis `grow`), kartu & chip Kategori, kartu kanan Jadwal,
  2 kartu + catatan Pencairan, deck & 2 frame mockup Tentang (`clip` dari tengah).
- **005** — `TextMarquee` sempat dipasang tepat **setelah `<Hero />`**, lalu **dibongkar** di sesi
  yang sama: pemilik proyek tidak ingin ada teks di pembatas hero ↔ Tentang. Yang dihapus:
  `src/components/sections/TextMarquee.astro`, `.text-outline` di `global.css`, `initMarquee()` di
  `src/scripts/motion.ts`, dan `<TextMarquee />` di `index.astro`.
- **004** — parallax dipakai (keputusan pemilik proyek).

Deviasi yang perlu diketahui:

1. **Kategori tanpa grup.** `play()` menjumlahkan `data-reveal-delay` elemen dengan stagger grup,
   jadi kalau wrapper Kategori memakai `data-reveal-group`, kartu kedua baru muncul di ~420ms
   (bukan 80ms yang direncanakan). Delay ditulis eksplisit per elemen: kartu `i×80`, tile
   `i×80+240`, chip `i×80+160+40j`. Payout tetap memakai grup (anak grupnya hanya 2 artikel, dan
   catatan info ada di luar grup).
2. **Parallax di kartu dalam.** `data-parallax="-28"` dipasang di `<div class="max-h-[964px]
   rounded-[31px]">`, bukan di wrapper `max-w-[1358px]`, karena wrapper itu sudah memakai
   `data-reveal="scale"` dari plan 002 — dua animasi pada properti `transform` yang sama akan
   saling menimpa. Hasil visualnya sama: kartu melayang di depan panel hijau.
3. **Jaring pengaman tambahan.** `init()` dibungkus `try/catch`: kalau ada satu animasi gagal,
   kelas `has-js` dilepas supaya konten tidak pernah tertinggal tersembunyi.

Ukuran bundle akhir: **71,5 KB raw / 25,8 KB gzip** (reveal + group + mask + parallax).

## Permintaan langsung pemilik proyek (setelah plan 001–004)

1. **Band teks di pembatas hero ↔ Tentang dihapus** (lihat catatan 005 di atas).
2. **Ponsel di Tentang mengambang naik-turun** — CSS murni, bukan Motion: token
   `--animate-phone-float: phone-float 1s ease-in-out infinite` + `@keyframes phone-float`
   di `@theme` `global.css`. Dipakai di `About.astro` sebagai pembungkus baru di dalam frame
   `aspect-[1/2]`: `<div class="animate-phone-float motion-reduce:animate-none">`.
   **Kenapa pembungkus, bukan `<img>`:** Tailwind v4 menulis cropping mockup sebagai properti
   individual (`scale: var(--zoom)`, `translate: …`), dan `transform` di dalamnya akan dikalikan
   zoom (2×) — amplitudonya jadi payah dilacak. `motion-reduce:animate-none` mematikan
   gerak saat `prefers-reduced-motion: reduce`.
   **Revisi (19 Okt 2026, permintaan pemilik proyek):** rentang gerak dipindah ke BAWAH posisi diam
   — `0%/100% → translateY(16px)`, `50% → translateY(0)` — karena kalau naik di atas 0, kepala
   ponsel terpotong tepi atas frame (`overflow-hidden`). Durasi juga diminta cepat: **1s** per
   siklus. Catatan: pada 1s, `ease-in-out` membuat tiap titik balik terasa tersendat; kalau
   terlihat kasar, pertimbangkan 1,5–2 detik lagi.

Yang masih perlu mata manusia (browser tidak tersedia di sandbox ini): rasa tiap urutan masuk,
potongan ponsel di Tentang tidak bergeser setelah `clip`, mengambangnya ponsel terasa pelan dan
tidak "menggantung" di titik balik, deck Tentang tetap berperilaku sama, dan tampilan
`prefers-reduced-motion: reduce` / JS diblokir.

## Ruang lingkup yang sengaja tidak dikerjakan

- Judul per baris (per-line) — pembungkusan teks bergantung lebar viewport, jadi dipakai per kata.
- Navbar/TopBar sticky + shadow saat scroll, progress bar bacaan — navigasi belum sticky, jadi
  belum ada alasan.
- Parallax pada pola grid latar (`html`) — animasi `background-position` memicu paint, bukan
  composite, dan akan membuat grid tidak lagi sejajar dengan container 1200px.
- Marquee CSS murni (`@keyframes`) sebagai pengganti versi scroll-linked — efek yang diminta
  memang terikat posisi scroll. (Moot: band teksnya sudah dibatalkan pemilik proyek.)
