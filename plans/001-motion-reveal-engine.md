# 001 — Fondasi: Motion + mesin animasi masuk (reveal engine)

- **Status**: DONE (19 Okt 2026)
- **Commit**: 85ba2b6
- **Severity**: HIGH
- **Category**: Cohesion & tokens / Performance / Accessibility
- **Estimated scope**: 4 file (`package.json`, `src/styles/global.css`, `src/scripts/motion.ts` baru, `src/layouts/Base.astro`), ±170 baris

## Problem

Halaman Bankli belum punya motion sama sekali untuk perpindahan antar-section: setiap section
muncul utuh begitu di-scroll, jadi tidak ada yang menjelaskan urutan baca (rail 5 langkah,
2 kartu kategori, alur pencairan) dan belum ada satu pun token gerak bersama.

Proyek ini **Astro 7 + Tailwind v4, tanpa React** (`package.json` hanya punya `astro`,
`tailwindcss`, `@tailwindcss/vite`). Jadi contoh di `motion.dev/docs/react-scroll-animations`
tidak bisa dipakai apa adanya — padanan vanilla-nya adalah `animate()`, `inView()`, dan
`scroll()` dari paket `motion`. Saat ini paket itu belum ada:

```json
// package.json:10 — current
"dependencies": {
  "astro": "^7.4.0"
},
```

Base layer `global.css` juga belum punya token gerak:

```css
/* src/styles/global.css:96 — current */
@layer base {
  html,
  body {
    height: 100%;
  }
  ...
}
```

Satu-satunya motion yang sudah ada di repo — dan harus jadi acuan gaya — adalah kartu berantre
di `About.astro`:

```html
<!-- src/components/sections/About.astro:78 — current (potongan) -->
class="... transition-[translate,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.34,1.3,0.64,1)] will-change-transform motion-reduce:transition-none ..."
```

Karena belum ada fondasi, semua animasi baru harus lewat sini dulu: satu modul, satu set token,
satu kebijakan reduced-motion. Plan 002–005 bergantung pada file ini.

## Target

1. Dependency `motion@14.3.0` (di-pin exact).
2. Token gerak di `src/styles/global.css` + keadaan awal (pre-state) reveal yang hanya aktif
   kalau JS hidup (`html.has-js`), plus pengecualian `prefers-reduced-motion`.
3. Modul baru `src/scripts/motion.ts` = satu-satunya tempat motion JS. Kontrak atribut:

   | Atribut | Arti |
   | --- | --- |
   | `data-reveal="up\|rise\|scale\|fade\|grow\|clip"` | elemen tunggal, dipicu saat masuk viewport |
   | `data-reveal-group` | container; anak `[data-reveal]` di dalamnya tampil berurutan (stagger 70ms) |
   | `data-reveal-mask` | container; anak `[data-reveal-word]` muncul per kata (stagger 35ms) |
   | `data-reveal-word` | satu kata di dalam mask |
   | `data-reveal-now` | jalankan saat load (elemen di atas lipatan), bukan saat masuk viewport |
   | `data-reveal-delay="120"` | tambahan delay dalam ms |
   | `data-reveal-duration="700"` | override durasi dalam ms |

   Nilai kind (semua lewat `EASE_OUT = cubic-bezier(0.23, 1, 0.32, 1)`, selaras AUDIT §2):

   | kind | frames | durasi |
   | --- | --- | --- |
   | `up` | `opacity [0,1]`, `translateY(16px→0)` | 0.5s |
   | `rise` | `opacity [0,1]`, `translateY(28px→0)` | 0.6s |
   | `scale` | `opacity [0,1]`, `scale(0.98) translateY(24px→0)` | 0.7s |
   | `fade` | `opacity [0,1]` | 0.5s |
   | `grow` | `scaleX(0→1)` | 0.45s |
   | `clip` | `clipPath inset(0% 50% 0% 50% → 0% 0% 0% 0%)` | 0.7s |
   | `mask` | `opacity [0,1]`, `clipPath inset(100% 0% -20% 0% → 0% 0% -20% 0%)` | 0.55s |

4. `src/layouts/Base.astro`: inline script penanda `has-js` + failsafe 2,5s, lalu import modul.

## Repo conventions to follow

- Komentar kode berbahasa Indonesia, menjelaskan *kenapa* — lihat `src/components/sections/About.astro:47-51`
  dan `src/styles/global.css:102-107`.
- Script client ditulis sebagai `<script>` biasa di dalam komponen/layout (Astro membundelnya);
  lihat `src/components/sections/About.astro:126-168`.
- Token desain hidup di blok `@theme` + `@layer base` `src/styles/global.css`; jangan buat file token baru.
- Utilitas gerak kondisional memakai varian Tailwind `motion-reduce:` / `motion-safe:`
  (contoh: `About.astro:78`).

## Steps

### 1. Pasang dependency

```bash
npm i --save-exact motion@14.3.0
```

Cek `package.json` → `"dependencies": { "astro": "^7.4.0", "motion": "14.3.0" }`.

### 2. Tambah token gerak di `src/styles/global.css`

Sisipkan di dalam blok `@theme` (setelah blok `/* Radius */`, sebelum `}` penutup `@theme` pada
baris 87):

```css
  /* Gerak — samakan nilainya dengan konstanta di src/scripts/motion.ts */
  --ease-out: cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
  --ease-spring: cubic-bezier(0.34, 1.3, 0.64, 1);
  --duration-reveal: 500ms;
  --stagger-reveal: 70ms;
```

### 3. Ganti easing kartu berantre ke token (konsolidasi, gerak tidak berubah)

Di `src/components/sections/About.astro:78`, ganti:

```
ease-[cubic-bezier(0.34,1.3,0.64,1)]
```

menjadi:

```
ease-[var(--ease-spring)]
```

Nilai kurvanya identik, jadi feel-nya sama; sekarang hanya ada satu sumber angka.

### 4. Tambah pre-state + kebijakan reduced-motion di `src/styles/global.css`

Sisipkan **di akhir** `@layer base` (setelah blok `:where(a, button, [tabindex]):focus-visible`
pada baris 128-132, sebelum `}` penutup layer):

```css
  /*
   * Keadaan awal animasi masuk. Aktif hanya kalau JS hidup (html.has-js),
   * jadi tanpa JS konten langsung terlihat. Nilai from di sini WAJIB sama
   * dengan frames di src/scripts/motion.ts.
   */
  .has-js [data-reveal="up"] {
    opacity: 0;
    transform: translateY(16px);
  }
  .has-js [data-reveal="rise"] {
    opacity: 0;
    transform: translateY(28px);
  }
  .has-js [data-reveal="scale"] {
    opacity: 0;
    transform: scale(0.98) translateY(24px);
  }
  .has-js [data-reveal="fade"] {
    opacity: 0;
  }
  .has-js [data-reveal="grow"] {
    transform: scaleX(0);
  }
  .has-js [data-reveal="clip"] {
    clip-path: inset(0% 50% 0% 50%);
  }
  .has-js [data-reveal-word] {
    opacity: 0;
    clip-path: inset(100% 0% -20% 0%);
  }

  /* Garis yang "tumbuh" selalu dari kiri (rail Cara Kerja). */
  [data-reveal="grow"] {
    transform-origin: left center;
  }

  /*
   * prefers-reduced-motion: gerak dihapus, fade tipis 180ms tetap jalan
   * supaya perubahan state tidak terasa "nge-pop".
   */
  @media (prefers-reduced-motion: reduce) {
    .has-js [data-reveal="up"],
    .has-js [data-reveal="rise"],
    .has-js [data-reveal="scale"],
    .has-js [data-reveal="grow"],
    .has-js [data-reveal-word] {
      transform: none;
    }
    .has-js [data-reveal="clip"],
    .has-js [data-reveal-word] {
      clip-path: none;
    }
  }
```

Catatan: `clip-path` dipakai untuk `mask` (bukan `overflow: hidden` + padding) supaya tinggi
baris judul tidak berubah dan descender huruf (j, y, g) tidak terpotong — penting karena
tipografi judul harus tetap sama persis dengan design.

### 5. Buat `src/scripts/motion.ts`

File baru. **Catatan pasca-eksekusi**: implementasi akhir memakai map `DURATION` + `switch` dengan
keyframes literal (bukan map `KINDS` + cast), karena tipe `DOMKeyframesDefinition` tidak
di-ekspor oleh `motion@14.3.0`. Struktur fungsi (`play`, `playMask`, `init`, `reducedMotion`, `ms`,
`VIEW`) sama seperti di bawah — plan 004/005 tetap menempel pada nama-nama itu. Versi final ada di
repo dan di bagian **Hasil eksekusi** di bawah.

```ts
/**
 * Mesin animasi scroll halaman Bankli.
 *
 * - Hanya `transform`, `opacity`, dan `clip-path` yang dianimasikan — tidak ada
 *   properti layout, jadi tidak ada CLS.
 * - Transform selalu ditulis sebagai string penuh (`translateY(16px)`), bukan
 *   shorthand `y`, supaya tetap hardware-accelerated (AUDIT §5).
 * - Nilai from WAJIB sama dengan pre-state di src/styles/global.css.
 *
 * Kontrak markup: lihat tabel atribut di plans/001-motion-reveal-engine.md.
 */
import { animate, inView } from "motion";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const STAGGER = 0.07;
const STAGGER_WORD = 0.035;

/** Margin viewport: elemen dianggap masuk setelah lewat 88% tinggi layar. */
const VIEW = { margin: "0px 0px -12% 0px" };

type Frames = Record<string, [string | number, string | number]>;

const KINDS: Record<string, { frames: Frames; duration: number }> = {
  up: {
    frames: { opacity: [0, 1], transform: ["translateY(16px)", "translateY(0px)"] },
    duration: 0.5,
  },
  rise: {
    frames: { opacity: [0, 1], transform: ["translateY(28px)", "translateY(0px)"] },
    duration: 0.6,
  },
  scale: {
    frames: {
      opacity: [0, 1],
      transform: ["scale(0.98) translateY(24px)", "scale(1) translateY(0px)"],
    },
    duration: 0.7,
  },
  fade: { frames: { opacity: [0, 1] }, duration: 0.5 },
  grow: { frames: { transform: ["scaleX(0)", "scaleX(1)"] }, duration: 0.45 },
  clip: {
    frames: { clipPath: ["inset(0% 50% 0% 50%)", "inset(0% 0% 0% 0%)"] },
    duration: 0.7,
  },
  mask: {
    frames: {
      opacity: [0, 1],
      clipPath: ["inset(100% 0% -20% 0%)", "inset(0% 0% -20% 0%)"],
    },
    duration: 0.55,
  },
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ms = (value: string | undefined, fallback: number) => (value ? Number(value) / 1000 : fallback);

function play(target: HTMLElement, kindName?: string, extraDelay = 0) {
  const kind = KINDS[kindName ?? target.dataset.reveal ?? "up"] ?? KINDS.up;
  const delay = ms(target.dataset.revealDelay, 0) + extraDelay;

  if (reducedMotion()) {
    // Gerak dihapus, sisakan fade 180ms supaya konten tidak "nge-pop".
    animate(target, { opacity: [0, 1] }, { duration: 0.18, delay, ease: "linear" });
    return;
  }

  animate(target, kind.frames as Parameters<typeof animate>[1], {
    duration: ms(target.dataset.revealDuration, kind.duration),
    delay,
    ease: EASE_OUT,
  });
}

function playMask(root: HTMLElement, baseDelay = 0) {
  root.querySelectorAll<HTMLElement>("[data-reveal-word]").forEach((word, index) => {
    play(word, "mask", baseDelay + index * STAGGER_WORD);
  });
}

function init() {
  // 1. Elemen di atas lipatan: tunggu font (maks 400ms) supaya tidak ada
  //    lompatan saat STKBureauSerif selesai dimuat.
  const above = document.fonts?.ready ?? Promise.resolve();
  const timeout = new Promise((resolve) => window.setTimeout(resolve, 400));
  Promise.race([above, timeout]).then(() => {
    document.querySelectorAll<HTMLElement>("[data-reveal-now]").forEach((el) => {
      if (el.hasAttribute("data-reveal-mask")) playMask(el);
      else play(el);
    });
  });

  // 2. Judul ber-mask: muncul per kata saat masuk viewport.
  document.querySelectorAll<HTMLElement>("[data-reveal-mask]").forEach((root) => {
    if (root.hasAttribute("data-reveal-now")) return;
    inView(root, () => playMask(root), VIEW);
  });

  // 3. Grup: anak-anaknya tampil berurutan (60-80ms, AUDIT §7).
  document.querySelectorAll<HTMLElement>("[data-reveal-group]").forEach((group) => {
    const items = Array.from(group.querySelectorAll<HTMLElement>("[data-reveal]")).filter(
      (el) => el.closest("[data-reveal-group]") === group,
    );
    inView(group, () => items.forEach((el, index) => play(el, undefined, index * STAGGER)), VIEW);
  });

  // 4. Sisanya: elemen tunggal.
  document.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
    if (el.closest("[data-reveal-group]") || el.hasAttribute("data-reveal-now")) return;
    inView(el, () => play(el), VIEW);
  });
}

// Sinyal ke failsafe di Base.astro bahwa modul berhasil jalan.
document.documentElement.setAttribute("data-motion-ready", "");
init();
```

### 6. `src/layouts/Base.astro` — penanda `has-js` + import modul

Sisipkan inline script sebagai anak terakhir `<head>` (setelah blok `<link href="https://fonts.googleapis.com...">`
pada baris 28-31, sebelum `</head>` pada baris 32):

```astro
		<script is:inline>
			// Penanda "JS hidup": pre-state reveal hanya disembunyikan kalau JS siap.
			// Failsafe: kalau modul motion gagal dimuat dalam 2,5s, konten dibiarkan tampil.
			(function () {
				var root = document.documentElement;
				root.classList.add("has-js");
				window.setTimeout(function () {
					if (!root.hasAttribute("data-motion-ready")) root.classList.remove("has-js");
				}, 2500);
			})();
		</script>
```

Lalu, di dalam `<body>` (baris 33-35), tambahkan **setelah** `<slot />`:

```astro
		<script>
			import "../scripts/motion";
		</script>
```

## Boundaries

- Jangan pasang atribut `data-reveal*` di plan ini — itu pekerjaan plan 002–005. Plan ini hanya
  fondasi; setelah selesai, belum ada satu pun elemen yang beranimasi (dan itu benar).
- **Jangan** sentuh `<script>` kartu berantre di `About.astro:126-168`, jangan ubah
  `data-card` / `data-depth` / `transform` kartu-kartu itu.
- Jangan tambah dependency lain. Jangan import `motion/react`, `motion-plus`, atau `motion/mini`.
- Jangan ubah warna, ukuran, spacing, atau copy apa pun di plan ini.
- Jangan pakai `transition: all`, jangan animasikan `width`/`height`/`top`/`left`/`margin`/`padding`.
- Kalau struktur `global.css` / `Base.astro` sudah berbeda dari yang dikutip di atas (drift sejak
  commit 85ba2b6), BERHENTI dan laporkan, jangan improvisasi.

## Verification

- **Mechanical**
  - `npm run build` → sukses, tetap `1 page(s) built`.
  - `grep -o "has-js\[data-reveal" dist/_astro/*.css | head` → ada hasil (pre-state ikut ter-build).
  - `grep -c "data-motion-ready" dist/index.html dist/_astro/*.js` → penanda & modul ikut ter-build.
  - Cek ukuran bundle baru: `ls -la dist/_astro/*.js`. Ekspektasi ±26 KB raw
    (docs Motion: hybrid `animate` 22 KB + `scroll` 3,8 KB + `inView` 0,5 KB).
    Kalau jauh di atas itu, laporkan ukurannya.
- **Feel check** (`npm run dev`, buka http://localhost:4321)
  - Halaman tampil normal, tidak ada bedanya dengan sebelum plan ini — **kecuali** kartu berantre
    di Tentang, yang harus masih terasa sama (kurva easing identik).
  - DevTools → Rendering → `prefers-reduced-motion: reduce` → reload → semua konten tetap terlihat
    (tidak ada yang tersembunyi).
  - DevTools → Network → block `*.js` → reload → semua konten terlihat (failsafe `has-js` bekerja).
  - Uji manual satu elemen: sementara tambahkan `data-reveal="rise"` di satu `<div>` di
    `src/components/sections/Steps.astro`, reload, scroll → elemen naik + memudar masuk, lalu
    **hapus lagi** atributnya sebelum menutup plan ini.
- **Done when**: build lolos, modul + pre-state + failsafe ada di output, dan tidak ada perubahan
  visual pada halaman (kecuali kurva kartu Tentang yang nilai-nilainya identik).

## Hasil eksekusi (19 Okt 2026)

Yang terpasang:

- `motion@14.3.0` (exact) di `dependencies`. Root export = re-export `framer-motion/dom`, jadi
  `animate` / `inView` / `scroll` tersedia tanpa React (React hanya peer *optional*).
- Token gerak di `@theme` `global.css`; easing kartu Tentang kini `ease-[var(--ease-spring)]`.
- Pre-state `.has-js [data-reveal=…]` + blok `prefers-reduced-motion` di `@layer base`.
- `src/scripts/motion.ts` (±140 baris): `play()` dengan `switch` per kind, `playMask()`, `init()`
  untuk `data-reveal-now` / mask / group / tunggal.
- `src/layouts/Base.astro`: inline `has-js` + failsafe 2500ms, lalu
  `<script>import "../scripts/motion";</script>` setelah `<slot />`.

Deviasi dari plan:

1. Map `KINDS` + cast `Parameters<typeof animate>[1]` diganti `DURATION` + `switch`, karena
   `DOMKeyframesDefinition` tidak di-ekspor dari `motion` (hanya diimpor dari `motion-dom`).
2. Ukuran bundle lebih besar dari perkiraan: **64,5 KB raw / 23,2 KB gzip** (bukan ±26 KB raw),
   karena `motion@14` membawa seluruh core hybrid `framer-motion/dom`. Catatan untuk pemilik
   proyek: kalau angka ini mengganggu, jalur yang jauh lebih kecil adalah CSS scroll-driven
   animation (`animation-timeline`), tetapi itu mengubah pilihan library yang sudah diputuskan.
3. `stagger` ternyata tetap ada di runtime `motion@14.3.0`, tetapi tidak dipakai — stagger dihitung
   manual (`index * STAGGER`) supaya `data-reveal-delay` per elemen tetap bisa menimpa urutan grup.

Verifikasi yang sudah dijalankan:

- `npm run build` → sukses, 1 page.
- `dist/_astro/*.css` memuat 7 pre-state + blok `prefers-reduced-motion:reduce`.
- `dist/index.html` memuat inline `has-js` + `data-motion-ready`; dev server membalas 200 dan
  memuat `Base.astro?astro&type=script…` (modul ikut ter-wire).
- Smoke test Node: `animate`, `inView`, `scroll` semuanya `function`.

Belum diverifikasi (butuh browser): feel dari satu elemen uji, failsafe dengan JS diblokir, dan
tampilan `prefers-reduced-motion`. Ini masuk langkah feel-check plan 002–005 saat elemen pertama
benar-benar diberi atribut.



