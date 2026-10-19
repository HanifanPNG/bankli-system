# 003 — Animasi masuk per section (rail, kartu, mockup)

- **Status**: DONE (19 Okt 2026)
- **Catatan eksekusi**: `data-reveal="clip"` → 2, `data-reveal="grow"` → 4 (sesuai batas), `<img>`
  mockup tidak tersentuh.
- **Deviasi**: langkah 2 **tidak** memakai `data-reveal-group` pada wrapper Kategori. `play()`
  menjumlahkan `data-reveal-delay` elemen dengan stagger grup, sehingga kartu kedua baru muncul di
  ~420ms (bukan 80ms). Delay ditulis eksplisit per elemen: kartu `i×80`, tile `i×80+240`, chip
  `i×80+160+40×j`. Payout (langkah 4) tetap memakai grup seperti rencana — anak grupnya hanya 2
  artikel dan catatan info berada di luar grup, jadi ritme `0 / 70 / 260ms` tetap utuh.
- **Commit**: 85ba2b6
- **Severity**: HIGH
- **Category**: Missed opportunities / Cohesion
- **Estimated scope**: 5 komponen (`Steps.astro`, `Categories.astro`, `Schedule.astro`, `Payout.astro`, `About.astro`), ±40 baris markup

**Bergantung pada plan 001** (mesin `src/scripts/motion.ts`, kind `rise` / `grow` / `clip`, pre-state CSS).
Judul tiap section sudah ditangani plan 002 — plan ini hanya isi/badan section.

## Problem

Setiap "badan" section muncul utuh sekaligus, jadi tidak ada yang memandu urutan baca. Padahal
layout-nya sudah sangat berurutan secara visual:

- Rail 5 langkah di Cara Kerja punya garis penghubung antar langkah, tapi garisnya ikut muncul
  tanpa menjelaskan apa pun:

```astro
<!-- src/components/sections/Steps.astro:46-52 — current (potongan) -->
<li class="flex flex-1 flex-col gap-[13px]">
  <div class="flex items-center gap-[12px]">
    <span class="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-brand-dark text-[15px] font-bold text-white">{index + 1}</span>
    {index < steps.length - 1 && <span class="hidden h-px flex-1 bg-brand-border lg:block" />}
  </div>
```

- Kartu kategori (2 kartu, masing-masing punya tile media berwarna + chip) dan kartu pencairan
  (2 opsi + catatan info) muncul berbarengan:

```astro
<!-- src/components/sections/Categories.astro:37-40 — current (potongan) -->
<article class="flex flex-1 flex-col overflow-hidden rounded-[16px] border border-line bg-card lg:rounded-card-lg">
  <div class:list={["flex h-[176px] items-center justify-center", category.media]}>
    <Icon name={category.icon} class:list={["h-[66px] w-[66px]", category.iconColor]} />
```

```astro
<!-- src/components/sections/Payout.astro:49-51 — current (potongan) -->
<div class="flex items-start gap-[10px] rounded-card bg-info-bg p-[16px_18px] lg:mx-auto lg:w-full lg:max-w-[800px]">
  <Icon name="info" class="h-[17px] w-[17px] shrink-0 text-info-fg" />
  <p class="text-[13.5px] leading-[20px] font-medium text-info-text-dark">
    Pengajuan yang disetujui belum berarti sudah dibayar. ...
```

- Kartu Jadwal di kolom kanan, deck kartu Tentang, dan dua mockup ponsel juga muncul mentah:

```astro
<!-- src/components/sections/Schedule.astro:58-60 — current (potongan) -->
<div class="flex w-full flex-1 flex-col gap-[16px] rounded-[16px] border border-line bg-card p-[20px] lg:gap-[18px] lg:rounded-card-lg lg:p-[28px_28px_26px_28px]">
```

```astro
<!-- src/components/sections/About.astro:71 — current -->
<div data-deck class="relative min-h-[250px]">
```

```astro
<!-- src/components/sections/About.astro:107-117 — current (potongan) -->
<div class="aspect-[1/2] overflow-hidden">
  <img
    src={screen.src}
    ...
    style={`--zoom:${screen.zoom};--shift-x:${screen.shiftX};--shift-y:${screen.shiftY}`}
    class="w-full origin-top scale-[var(--zoom)] translate-x-[var(--shift-x)] translate-y-[var(--shift-y)]"
  />
</div>
```

## Target

| Section | Animasi |
| --- | --- |
| Cara Kerja | tiap `<li>` naik 28px (kind `rise`), stagger 60ms; garis penghubung `grow` (scaleX dari kiri) |
| Kategori | 2 kartu `rise` stagger 80ms; tile media `up` +240ms; chip `up` stagger 40ms |
| Jadwal | kartu kanan `rise` +100ms |
| Pencairan | 2 kartu `rise` stagger 80ms; catatan info `up` paling akhir (+260ms) karena itu bagian terpenting |
| Tentang | container deck `rise`; 2 frame mockup `clip` (terbuka dari tengah, 0.7s) |

Semua hanya `transform` / `opacity` / `clip-path`. Tidak ada animasi pada `[data-card]`
(kartu deck punya mekanika sendiri dari CSS) dan **tidak ada** animasi pada `<img>` mockup
(transform-nya dipakai untuk cropping zoom dari design).

## Repo conventions to follow

- Atribut `data-*` sebagai kontrak perilaku — contoh `data-deck` / `data-card` di `About.astro:71-78`.
- Struktur section: `<section>` → `div.mx-auto.max-w-[1200px]` → heading → konten
  (lihat `Payout.astro:21-47`).
- Utilitas gerak CSS memakai varian `motion-reduce:` (`About.astro:78`).

## Steps

### 1. `src/components/sections/Steps.astro` — rail 5 langkah

- `<ol>` (baris 43) → tambahkan `data-reveal-group`.
- Tiap `<li>` (baris 46) → `data-reveal="rise"`.
- Span garis penghubung (baris 51) → `data-reveal="grow"`:

```astro
{index < steps.length - 1 && <span data-reveal="grow" class="hidden h-px flex-1 bg-brand-border lg:block" />}
```

Stagger bawaan grup (70ms) otomatis memberi urutan 1→5. Garis `grow` mengikuti urutan yang sama,
jadi garisnya "tumbuh" mendahului langkah berikutnya.

### 2. `src/components/sections/Categories.astro` — 2 kartu + chip

- Wrapper kartu `div.flex.flex-col.gap-[16px].lg:flex-row` (baris 34) → `data-reveal-group`.
- `<article>` (baris 37) → `data-reveal="rise"`.
- Tile media (baris 38) → `data-reveal="up" data-reveal-delay="240"`.
- Chip `<ul>` (baris 47) → **tidak** diberi `data-reveal-group`; cukup biarkan polos.
- Tiap `<li>` chip (baris 49) → `data-reveal="up"` + `data-reveal-delay` berurutan, karena chip
  harus menyusul tile media:

```astro
{category.chips.map((chip, chipIndex) => (
  <li
    data-reveal="up"
    data-reveal-delay={String(160 + chipIndex * 40)}
    class="rounded-[99px] border border-line-soft bg-chip px-[12px] py-[6px] text-[12.5px] font-medium text-label"
  >
    {chip}
  </li>
))}
```

Alasan tidak memakai grup: `motion.ts` mengurutkan anak grup dengan stagger bawaan (70ms) dan
mengabaikan `data-reveal-delay` milik anak, sedangkan di sini ritme yang diinginkan berbeda
(160ms + 40ms per chip). Chip tetap elemen tunggal yang dijadwalkan sendiri.

### 3. `src/components/sections/Schedule.astro` — kartu kanan

Kartu kanan (baris 58-60) → `data-reveal="rise" data-reveal-delay="100"`. Kolom kiri tidak
disentuh lagi (sudah grup dari plan 002).

### 4. `src/components/sections/Payout.astro` — 2 kartu + catatan

- Wrapper kartu `div.flex.flex-col.gap-[14px].lg:flex-row` (baris 30) → `data-reveal-group`.
- `<article>` (baris 33) → `data-reveal="rise"`.
- Catatan info (baris 49) → `data-reveal="up" data-reveal-delay="260"`.

Catatan info sengaja paling akhir dan hanya naik 16px: itu penegasan "disetujui belum berarti
sudah dibayar", jadi harus terbaca terakhir, bukan beranimasi paling ramai.

### 5. `src/components/sections/About.astro` — deck + 2 mockup

- Deck container (baris 71) → `data-reveal="rise"`:

```astro
<div data-deck data-reveal="rise" class="relative min-h-[250px]">
```

- Frame mockup (baris 104-121) → beri `data-reveal="clip"` pada pembungkus `aspect-[1/2]`
  (bukan pada `<img>`):

```astro
<div data-reveal="clip" class="aspect-[1/2] overflow-hidden">
```

`clip` membuka gambar dari tengah ke samping (`inset(0% 50% 0% 50%)` → `inset(0% 0% 0% 0%)`)
dan **tidak mengubah geometri frame**, jadi potongan ponsel di tepi bawah section tetap di
posisi yang sama seperti design.

**Jangan** menambahkan atribut apa pun pada `<img>` — `class` pada img itu
(`scale-[var(--zoom)] translate-x-[var(--shift-x)] translate-y-[var(--shift-y)]`) adalah mekanika
cropping design; kalau motion menulis `transform` inline di elemen itu, cropping-nya rusak.

## Boundaries

- Jangan ubah copy, `class` (kecuali menambah atribut `data-*`), ukuran, atau urutan elemen.
- Jangan sentuh `<script>` di `About.astro:126-168` dan jangan beri `data-reveal*` pada
  `[data-card]` / `[data-card-toggle]` / `[data-deck]` selain yang tertulis di atas.
- Jangan sentuh `<img>` mockup (`About.astro:108-117`) atau mockup dashboard/telepon
  (`src/components/mockup/*`) — itu plan 004.
- Jangan tambah kind baru di `src/scripts/motion.ts`; semua kind yang dipakai sudah ada di plan 001.
- Kalau markup berbeda dari kutipan (drift sejak 85ba2b6), BERHENTI dan laporkan.

## Verification

- **Mechanical**: `npm run build` sukses. `grep -c 'data-reveal="clip"' dist/index.html` → 2.
  `grep -c 'data-reveal="grow"' dist/index.html` → 4 (5 langkah − 1, dan hanya render lg… cek
  hasilnya: 4 di markup karena `hidden lg:block`, bukan karena plan).
- **Feel check** (`npm run dev`, http://localhost:4321)
  - Cara Kerja: langkah 1→5 muncul berurutan, garis penghubung tumbuh dari kiri ke kanan.
  - Kategori: kartu naik berdampingan (±80ms), lalu tile media, lalu chip menyusul.
  - Pencairan: 2 kartu, lalu catatan biru terakhir.
  - Tentang: deck naik sebagai satu blok; **kartu di dalamnya tidak boleh beranimasi sendiri** —
    klik kartu belakang dan pastikan animasi maju-ke-depan yang lama (500ms, sedikit memantul)
    masih utuh.
  - Tentang: dua ponsel terbuka dari tengah ke samping, **potongan di tepi bawah section tidak
    bergeser** (bandingkan garis potong sebelum/sesudah).
  - DevTools → Animations → playback 10% → tidak ada elemen yang bergeser posisi akhir
    (artinya pre-state = frame awal).
  - Rendering → `prefers-reduced-motion: reduce` → konten terlihat, tanpa gerak; garis rail dan
    frame ponsel langsung tampil.
  - Network → block JS → semua konten terlihat.
- **Done when**: tiap section punya urutan masuk yang terbaca, tidak ada CLS, kartu deck & cropping
  mockup berperilaku persis seperti sebelum plan ini.

