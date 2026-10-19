# 002 — Reveal teks: judul per kata + urutan masuk hero

- **Status**: DONE (19 Okt 2026)
- **Catatan eksekusi**: 21 `data-reveal-word` (2 judul hero + 1 CTA band), 3 `data-reveal-mask`,
  9 `data-reveal-now`. Spasi antar kata tetap teks asli (bukan `whitespace-pre`), jadi
  pembungkusan baris identik dengan sebelum plan ini.
- **Commit**: 85ba2b6
- **Severity**: HIGH
- **Category**: Missed opportunities / Cohesion
- **Estimated scope**: 4 komponen (`Hero.astro`, `ui/SectionHeading.astro`, `CtaBand.astro`, `Schedule.astro`), ±60 baris markup

**Bergantung pada plan 001** (mesin `src/scripts/motion.ts` + token + pre-state CSS).

## Problem

Semua teks muncul sekaligus: judul section, subjudul, dan CTA tidak punya urutan baca. Yang paling
terasa: judul hero di atas lipatan tidak punya animasi masuk sama sekali, dan judul CTA (46px)
muncul utuh saat di-scroll.

Judul hero sekarang satu simpul teks, jadi mustahil dianimasikan per kata:

```astro
<!-- src/components/sections/Hero.astro:20 — current -->
<h1 id="hero-headline" class="text-[37px] leading-[1.1] font-medium text-strong">{headline}</h1>
```

Section heading (dipakai 4 section: Tentang, Cara Kerja, Kategori, Pencairan) juga tanpa motion:

```astro
<!-- src/components/ui/SectionHeading.astro:33-52 — current (potongan) -->
<div class={classes}>
  {eyebrow && (<p class="text-[11px] font-bold ...">{eyebrow}</p>)}
  {title && (<h2 class={`w-full text-[28px] ...`}>{title}</h2>)}
  {sub && <p class={`w-full text-[15px] ...`}>{sub}</p>}
</div>
```

Judul CTA band dan kolom teks Jadwal juga mengalir sekaligus:

```astro
<!-- src/components/sections/CtaBand.astro:7-11 — current -->
<h2 class="w-full max-w-[900px] text-center text-[30px] leading-[1.13] font-medium text-white lg:text-[46px] lg:leading-[52px]">
  Mulai kelola hasil setoran sampahmu bersama Bankli.
</h2>
```

```astro
<!-- src/components/sections/Schedule.astro:30-39 — current (potongan) -->
<p class="text-[11px] font-bold tracking-[1.4px] text-brand-dark uppercase ...">Jadwal Layanan</p>
<h2 class="text-[28px] leading-[1.16] font-medium tracking-[-0.6px] text-strong lg:text-[40px] lg:leading-[47px]">
  Pelayanan mengikuti jam operasional stand.
</h2>
<p class="text-[15px] leading-[1.6] text-body lg:text-[16.5px] lg:leading-[26px]">Setoran yang memerlukan pengurus ...</p>
```

## Target

1. **Judul per kata (mask).** Judul hero dan judul CTA band dipecah menjadi kata; tiap kata dapat
   `data-reveal-word`, induknya `data-reveal-mask`. Kata muncul dari bawah (`clip-path`, bukan
   `overflow: hidden`, supaya tinggi baris & descender tidak berubah) dengan stagger 35ms.
2. **Urutan masuk hero** (atas lipatan → `data-reveal-now`, dipicu setelah font siap, maks 400ms):
   kata judul (mulai 0ms) → subjudul (+350ms) → tombol (+450ms) → catatan kecil (+550ms) →
   mockup dashboard/telepon (+500ms, kind `scale`, 700ms).
3. **Setiap `SectionHeading`** jadi grup: eyebrow → judul → sub, stagger 70ms, kind `up` (16px).
4. **Kolom teks Jadwal** juga grup dengan urutan yang sama.
5. Tidak ada perubahan copy, ukuran, warna, atau urutan elemen.

## Repo conventions to follow

- Variabel copy didefinisikan di frontmatter lalu dipakai di markup — contoh `Hero.astro:7-9`
  (`const headline = ...`).
- Kelas utilitas panjang ditulis satu baris, urut: layout → spacing → tipografi → warna
  (lihat `Hero.astro:38-42`). Jangan ubah urutan/isi kelas yang tidak disebut plan ini.
- Atribut `data-*` dipakai sebagai kontrak perilaku, bukan kelas CSS — contoh
  `data-card` / `data-depth` di `About.astro:74-78`.

## Steps

### 1. `src/components/sections/Hero.astro` — judul hero per kata

Ganti `<h1>` mobile (baris 20) **dan** `<h1>` desktop (baris 37-41) dengan markup berikut
(kelas lain di judul desktop — `mt-[95px] w-full max-w-[1010px] text-center font-serif
text-[64px] leading-[1.05] font-medium tracking-[-1px] text-hero-headline` — tetap apa adanya):

```astro
<h1 id="hero-headline" data-reveal-mask data-reveal-now class="...kelas yang sudah ada...">
  {
    headline.split(" ").map((word, index) => (
      <>
        {index > 0 && " "}
        <span data-reveal-word class="inline-block">
          {word}
        </span>
      </>
    ))
  }
</h1>
```

Penting: pemisah antar kata adalah spasi teks biasa (bukan `whitespace-pre`, bukan
`inline-flex` + gap), supaya pembungkusan baris (line wrapping) identik dengan sebelumnya di
semua lebar layar.

Soal `id`: saat ini `id="hero-headline"` hanya ada di `<h1>` **mobile** (baris 20), sedangkan
`<h1>` desktop tidak punya `id` (dan `<section>` memakai `aria-labelledby="hero-headline"`).
Pertahankan persis seperti itu — jangan menambah atau memindahkan `id`.

### 2. Hero — urutan masuk elemen lain

Mobile (`Hero.astro:21-29`):

| Elemen | Atribut tambahan |
| --- | --- |
| `<p>` subjudul (baris 21) | `data-reveal="up" data-reveal-now data-reveal-delay="350"` |
| wrapper 2 tombol `div.flex.w-full.flex-col` (baris 22) | `data-reveal="up" data-reveal-now data-reveal-delay="450"` |
| `<p>` catatan `Setoran ditimbang…` (baris 26) | `data-reveal="up" data-reveal-now data-reveal-delay="550"` |
| `div.flex.justify-center.bg-brand-tint` + `<PhoneMockup />` (baris 28-30) | `data-reveal="scale" data-reveal-now data-reveal-delay="500"` di `<div>` pembungkusnya |

Desktop (`Hero.astro:42-53`):

| Elemen | Atribut tambahan |
| --- | --- |
| `<p>` subjudul (baris 42) | `data-reveal="up" data-reveal-now data-reveal-delay="350"` |
| `div.mt-[50px].flex.items-center` (baris 43) | `data-reveal="up" data-reveal-now data-reveal-delay="450"` |
| `div.mt-[58px].w-full.max-w-[1358px]` (baris 47) | `data-reveal="scale" data-reveal-now data-reveal-delay="500"` |

Kelas `mt-[50px]`, `mt-[58px]`, dan `pt-[8px]` tidak diubah — jarak antar elemen harus tetap
sama dengan design.

### 3. `src/components/ui/SectionHeading.astro` — grup judul

Di `classes` (baris 26-30), tambahkan `"… data-reveal-group"`? **Bukan** — atribut `data-*`
tidak boleh ditulis di dalam array kelas. Ubah root jadi:

```astro
<div class={classes} data-reveal-group>
  {
    eyebrow && (
      <p data-reveal="up" class="text-[11px] font-bold tracking-[1.4px] text-brand-dark uppercase lg:text-[12px] lg:tracking-[1.6px]">
        {eyebrow}
      </p>
    )
  }
  {
    title && (
      <h2 data-reveal="up" class={`w-full text-[28px] leading-[1.16] font-medium tracking-[-0.6px] text-strong lg:text-[42px] ${titleClass}`}>
        {title}
      </h2>
    )
  }
  {
    sub && <p data-reveal="up" class={`w-full text-[15px] leading-[1.6] text-body lg:text-[17px] ${subClass}`}>{sub}</p>
  }
</div>
```

Ini otomatis berlaku di Tentang, Cara Kerja, Kategori, dan Pencairan.

### 4. `src/components/sections/CtaBand.astro` — judul per kata

Pindahkan copy ke frontmatter (di bawah `import Button`, baris 1-3):

```astro
---
import Button from "./Button.astro";

const headline = "Mulai kelola hasil setoran sampahmu bersama Bankli.";
---
```

Lalu ganti isi `<h2>` (baris 7-11) dengan:

```astro
<h2
  data-reveal-mask
  class="w-full max-w-[900px] text-center text-[30px] leading-[1.13] font-medium text-white lg:text-[46px] lg:leading-[52px]"
>
  {
    headline.split(" ").map((word, index) => (
      <>
        {index > 0 && " "}
        <span data-reveal-word class="inline-block">
          {word}
        </span>
      </>
    ))
  }
</h2>
```

Tambahkan juga `data-reveal="up"` pada `<p>` subjudul (baris 12-17) dan `data-reveal-group`
pada `<div class="mx-auto flex w-full max-w-[1200px] flex-col items-center gap-[16px] lg:gap-[22px]">`
(baris 6). Karena `[data-reveal-mask]` **bukan** `[data-reveal]`, mask tidak ikut terhitung
sebagai anak grup — itu memang yang diinginkan (mask punya ritme kata sendiri).

### 5. `src/components/sections/Schedule.astro` — kolom teks

Pada `div.flex.w-full.flex-col.gap-[16px].lg:w-[520px]` (baris 29) tambahkan `data-reveal-group`,
lalu `data-reveal="up"` pada: eyebrow (baris 30), `<h2>` (baris 33), `<p>` (baris 36), dan pada
tiap `div.flex.items-start.gap-[12px].py-[2px]` di dalam `notes.map` (baris 44).

## Boundaries

- Jangan ubah copy, `class`, ukuran font, warna, atau urutan elemen mana pun.
- Jangan pakai `overflow: hidden`, `padding-bottom` + `margin-bottom` negatif, `display: flex`,
  atau `gap` untuk memecah judul — pemisah kata harus spasi teks biasa, dan masking memakai
  `clip-path` (diurus plan 001). Ini yang menjaga tinggi baris & descender judul sama persis.
- Jangan tambahkan `data-reveal` pada kartu deck Tentang (`[data-card]`) atau elemen mockup —
  itu plan 003/004.
- Jangan sentuh `<script>` di `About.astro`.
- Kalau markup di file-file ini sudah berbeda dari kutipan di atas (drift sejak 85ba2b6),
  BERHENTI dan laporkan.

## Verification

- **Mechanical**: `npm run build` sukses. `grep -c "data-reveal-word" dist/index.html` → 2 judul
  × jumlah kata (hero 7 kata + CTA 8 kata = 15).
- **Feel check** (`npm run dev`, http://localhost:4321)
  - Bandingkan pembungkusan judul hero di lebar 1440px dan 390px dengan sebelum plan ini
    (mis. screenshot sebelum/sesudah): **jumlah baris dan posisi atas `<h1>` harus identik**,
    dan huruf berekor (j, y, g pada "jadi", "yang") tidak boleh terpotong.
  - Reload → judul muncul kata demi kata, lalu sub → tombol → mockup. Total ±1,2s, tidak ada
    jeda menggantung setelah kata terakhir.
  - Scroll ke bawah → tiap judul section muncul eyebrow → judul → sub berurutan.
  - Judul CTA band muncul per kata.
  - DevTools → Animations → playback 10% → perhatikan: tidak ada elemen yang "melompat" karena
    pre-state dan frame awal tidak sinkron.
  - Rendering → `prefers-reduced-motion: reduce` → reload → semua teks terlihat, hanya fade tipis.
  - Network → block JS → reload → semua teks terlihat.
- **Done when**: terlihat berurutan, tidak ada CLS (judul tidak bergeser saat animasi jalan), dan
  layout judul sama persis dengan design di 1440px.

