# 004 — Parallax scroll-linked pada mockup hero

- **Status**: DONE (19 Okt 2026)
- **Catatan eksekusi**: `grep -o 'data-parallax="[0-9-]*"' dist/index.html | wc -l` → 1.
- **Deviasi**: `data-parallax="-28"` dipasang pada **kartu dalam** (div `max-h-[964px]
  rounded-[31px] shadow-…`), bukan pada wrapper `max-w-[1358px]` seperti di langkah 2. Wrapper itu
  sudah memakai `data-reveal="scale" data-reveal-now` dari plan 002, dan dua animasi pada properti
  `transform` yang sama akan saling menimpa. Hasil visualnya sama: kartu melayang di depan panel
  hijau saat halaman di-scroll.
- **Commit**: 85ba2b6
- **Severity**: LOW
- **Category**: Missed opportunities / Performance
- **Estimated scope**: 2 file (`src/scripts/motion.ts`, `src/components/sections/Hero.astro`), ±25 baris

**Bergantung pada plan 001.**

## Problem

Hero punya satu elemen besar yang jadi pusat perhatian: mockup dashboard 1358px di dalam panel
hijau (`Hero.astro:47-53`). Saat halaman di-scroll, semuanya bergerak sebagai satu bidang datar,
jadi tidak ada petunjuk kedalaman — mockup-nya terasa "ditempel" ke halaman, bukan mengambang
di depan panel.

```astro
<!-- src/components/sections/Hero.astro:47-53 — current -->
      <div class="mt-[58px] w-full max-w-[1358px]">
        <div
          class="max-h-[964px] overflow-hidden rounded-[31px] shadow-[0_50px_90px_-40px_rgba(15,81,50,0.45),0_18px_40px_-24px_rgba(15,23,42,0.25)]"
        >
          <DashboardMockup />
        </div>
      </div>
```

Plan ini satu-satunya yang memakai animasi **scroll-linked** (nilai terikat posisi scroll),
bukan scroll-triggered.

## Target

- Desktop saja (≥ 1024px / `lg`), karena di mobile mockup-nya di tengah blok berwarna dan
  parallax-nya hanya menambah gerak tanpa manfaat.
- Mockup bergeser naik maksimum 28px selama elemennya melewati viewport:
  `translateY(0px)` → `translateY(-28px)`, dipetakan linear terhadap travel elemen
  (`offset: ["start start", "end start"]`).
- Easing `linear` karena ini gerak kontinu yang menempel pada scroll (AUDIT §2).
- `prefers-reduced-motion: reduce` → tidak dipasang sama sekali.
- Memakai `scroll()` milik Motion supaya ikut jalur `ScrollTimeline` (hardware-accelerated)
  di browser yang mendukung.

## Repo conventions to follow

- Breakpoint `lg` = 1024px = `64rem`; di JS proyek ini pengecekan media query memakai
  `window.matchMedia(...)` — contoh `src/components/sections/About.astro:132`
  (`window.matchMedia("(min-width: 40rem)")`).
- Semua JS motion ada di `src/scripts/motion.ts` (dibuat plan 001) — jangan buat modul kedua.

## Steps

### 1. `src/scripts/motion.ts` — tambah parallax

Ubah baris import di akhir plan 001:

```ts
import { animate, inView } from "motion";
```

menjadi:

```ts
import { animate, inView, scroll } from "motion";
```

Lalu tambahkan fungsi ini **setelah** `playMask` dan **sebelum** `function init()`:

```ts
/**
 * Parallax scroll-linked: elemen bergeser pelan saat melewati viewport.
 * Dipakai mockup hero di desktop. Memakai scroll() supaya ikut jalur
 * ScrollTimeline (hardware-accelerated) di browser yang mendukung.
 */
function initParallax() {
  if (reducedMotion()) return;
  if (!window.matchMedia("(min-width: 64rem)").matches) return;

  document.querySelectorAll<HTMLElement>("[data-parallax]").forEach((el) => {
    const distance = el.dataset.parallax || "-28"; // px, negatif = naik
    const animation = animate(
      el,
      { transform: ["translateY(0px)", `translateY(${distance}px)`] },
      { ease: "linear" },
    );
    scroll(animation, { target: el, offset: ["start start", "end start"] });
  });
}
```

Terakhir, panggil di dalam `init()` — sisipkan sebagai baris terakhir `init()`
(setelah blok nomor 4):

```ts
  // 5. Parallax scroll-linked (desktop saja).
  initParallax();
```

### 2. `src/components/sections/Hero.astro` — tandai mockup desktop

Wrapper mockup desktop (baris 47) → tambahkan `data-parallax="-28"`:

```astro
<div data-parallax="-28" class="mt-[58px] w-full max-w-[1358px]">
```

Wrapper mobile (baris 47 tidak; yang mobile adalah blok `PhoneMockup` di baris 28) **tidak**
diberi atribut.

## Boundaries

- Jangan memberi `data-parallax` pada elemen lain, jangan animasi mobile, jangan animasikan
  panel hijau (`Hero.astro:35`).
- Jangan sentuh `<img>`/mockup di dalam `DashboardMockup.astro` / `PhoneMockup.astro`.
- Jarak harus tetap di bawah 58px (`mt-[58px]` + `pt-[8px]` = jarak ke baris tombol). Jangan
  naikkan nilai ini tanpa memeriksa tumpang tindih dengan tombol hero.
- Jangan tambah `will-change` — biarkan Motion mengelolanya.
- Kalau `scroll` tidak lagi diekspor oleh `motion@14.3.0` (cek `node_modules/motion/dist/index.d.ts`),
  BERHENTI dan laporkan.

## Verification

- **Mechanical**: `npm run build` sukses; `grep -c "data-parallax" dist/index.html` → 1.
- **Feel check** (`npm run dev`, lebar ≥ 1024px)
  - Scroll perlahan dari atas: mockup dashboard bergerak naik sedikit lebih cepat daripada
    halaman — halus, tanpa patah-patah, tanpa "getaran" saat scroll dibalik.
  - Di akhir hero tidak muncul celah kosong atau elemen yang menabrak tombol.
  - Perkecil lebar ke < 1024px → tidak ada parallax (mockup diam).
  - DevTools → Rendering → `prefers-reduced-motion: reduce` → reload → mockup diam.
  - DevTools → Performance → record 3 detik scroll di hero → tidak ada frame drop yang berarti,
    dan tidak ada layout thrash (`Layout` / `Recalculate Style` dominan = gagal).
  - DevTools → Animations → playback 10% → gerakan tetap linear (tidak ada easing menyusul).
- **Done when**: parallax terasa sebagai kedalaman (bukan sebagai gerakan sendiri), desktop saja,
  dan tidak ada momen di mana mockup menabrak atau meninggalkan celah.

