# 005 — Teks berjalan (text scroll) mengikuti scroll halaman

- **Status**: DIBATALKAN (19 Okt 2026) — dibongkar atas permintaan pemilik proyek
- **Alasan**: pemilik proyek tidak ingin ada teks di pembatas hero ↔ Tentang. Bagian-bagian plan ini
  (komponen `TextMarquee.astro`, `.text-outline`, `initMarquee`, `<TextMarquee />` di `index.astro`)
  sudah dihapus dari repo. Kode lengkapnya tetap ada di bawah kalau nanti mau dipakai lagi.
- **Catatan**: sebelumnya sempat terpasang dan lolos verifikasi mekanis (`data-marquee` → 2, 3 salinan
  per baris), lalu dibongkar di sesi yang sama — jadi halaman kembali ke urutan Hero → Tentang.
- **Commit**: 85ba2b6
- **Severity**: MEDIUM
- **Category**: Missed opportunities / Cohesion
- **Estimated scope**: 1 komponen baru (`src/components/sections/TextMarquee.astro`), `index.astro`, `src/styles/global.css`, `src/scripts/motion.ts`, ±90 baris

**Bergantung pada plan 001.**

## Problem

Halaman belum punya satu pun momen "teks bergerak" — padahal itu yang diminta: efek *Text scroll*
dari `motion.dev/docs/react-scroll-animations` (baris-baris teks besar yang bergerak horizontal
mengikuti scroll vertikal, satu baris searah dan satu baris berlawanan).

Catatan penting: contoh resminya memakai komponen `Ticker` dari **Motion+ (berbayar)** — itu tidak
boleh dipakai di proyek ini. Padanan gratisnya: menumpuk beberapa salinan konten dalam satu track
`flex`, lalu menggeser track itu dengan `scroll()` (vanilla) seperti contoh
[`scroll`](https://motion.dev/docs/scroll). Karena salinan 2 dan 3 identik, perpindahan sebesar
satu "segmen" secara visual tidak terasa sebagai lompatan.

Efek ini juga butuh tempat: section-section sekarang menempel langsung Hero → Tentang, dan tidak
ada satu pun bendera visual di antara keduanya.

## Target

1. Section baru `TextMarquee` (dekoratif, `aria-hidden="true"`) diletakkan **setelah `<Hero />`**
   di `src/pages/index.astro` — jembatan antara hero hijau dan konten putih.
2. Dua baris teks besar (serif, sama seperti judul hero supaya terasa satu suara):
   - baris 1 solid (`text-strong`), bergerak ke kiri saat halaman di-scroll ke bawah;
   - baris 2 outline (`.text-outline`), bergerak ke kanan.
3. Gerak terikat scroll, `linear`, tanpa easing (AUDIT §2: gerak konstan = linear), memakai
   `scroll()` supaya ikut jalur `ScrollTimeline` bila didukung.
4. Tepi kiri-kanan baris dilembutkan dengan `mask-image` statis (bukan animasi).
5. `prefers-reduced-motion: reduce` → baris diam (tetap terbaca).
6. Copy hanya kata brand yang sudah ada di halaman (tanpa angka, jadwal, atau klaim baru), karena
   seluruh section `aria-hidden` dan tidak boleh jadi satu-satunya sumber informasi apa pun.

## Repo conventions to follow

- Section = komponen di `src/components/sections/`, dirender dari `src/pages/index.astro:15-28`.
- Data statis didefinisikan di frontmatter lalu di-map di markup (lihat `Payout.astro:5-18`).
- `class:list` untuk kelas bersyarat (lihat `Categories.astro:38-39`).
- Semua JS motion di `src/scripts/motion.ts`.

## Steps

### 1. `src/styles/global.css` — gaya teks outline

Sisipkan **setelah** blok `@font-face` (baris 89-94) dan sebelum `@layer base`:

```css
/*
 * Teks garis (outline) untuk baris marquee — ref: contoh "Text scroll" di
 * docs Motion. Hanya dipakai di section dekoratif (aria-hidden="true").
 */
.text-outline {
  color: transparent;
  -webkit-text-stroke: 1.2px var(--color-faint);
}

@supports not (-webkit-text-stroke: 1px #000) {
  .text-outline {
    color: var(--color-faint);
  }
}
```

### 2. `src/components/sections/TextMarquee.astro` (baru)

Isi lengkap:

```astro
---
/**
 * Teks berjalan (text scroll): dua baris teks besar yang bergerak horizontal
 * mengikuti scroll halaman. Murni dekorasi — seluruh section aria-hidden,
 * jadi tidak menambah beban pembaca layar, dan tidak ada informasi (angka,
 * jadwal, klaim) yang hanya ada di sini.
 *
 * Teknis: setiap baris berisi 3 salinan konten identik dalam satu track flex.
 * JS (src/scripts/motion.ts → initMarquee) menggeser track sejauh satu
 * "segmen" selama baris melewati viewport, sehingga tidak pernah ada celah.
 */
const COPIES = 3;

const rows = [
  {
    words: ["Setor sampah", "Ditimbang", "Dicatat", "Nilai otomatis"],
    direction: -1,
    outline: false,
  },
  {
    words: ["Saldo terpantau", "Riwayat rapi", "Pengajuan pencairan", "Satu sistem"],
    direction: 1,
    outline: true,
  },
];
---

<section aria-hidden="true" class="w-full overflow-hidden border-t border-line py-[24px] lg:py-[36px]">
  <div
    class="flex flex-col gap-[6px] lg:gap-[12px]"
    style="mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, #000 6%, #000 94%, transparent);"
  >
    {
      rows.map((row) => (
        <div data-marquee data-direction={String(row.direction)} class="flex w-max will-change-transform">
          {Array.from({ length: COPIES }).map(() => (
            <div class="flex shrink-0 items-center">
              {row.words.map((word) => (
                <>
                  <span
                    class:list={[
                      "font-serif text-[30px] leading-none whitespace-nowrap lg:text-[48px]",
                      row.outline ? "text-outline" : "text-strong",
                    ]}
                  >
                    {word}
                  </span>
                  <span class="px-[18px] text-[20px] text-brand-primary lg:px-[26px] lg:text-[30px]">·</span>
                </>
              ))}
            </div>
          ))}
        </div>
      ))
    }
  </div>
</section>
```

Pola tiap salinan = `kata · kata · kata · kata ·` (diakhiri pemisah), jadi sambungan antar-salinan
tetap berirama sama.

### 3. `src/pages/index.astro` — pasang setelah Hero

```astro
  <main>
    <Hero />
    <TextMarquee />
    <About />
```

Tambahkan juga `import TextMarquee from "../components/sections/TextMarquee.astro";` di blok
import (baris 5-12).

### 4. `src/scripts/motion.ts` — penggerak marquee

Tambahkan fungsi berikut **setelah** `initParallax` (plan 004) dan **sebelum** `function init()`:

```ts
/**
 * Teks berjalan: menggeser track [data-marquee] sejauh satu segmen (lebar satu
 * salinan konten) selama baris melewati viewport. Arah dari data-direction
 * (-1 = ke kiri, 1 = ke kanan). Dipasang ulang saat resize karena lebar
 * segmen ikut berubah.
 */
function initMarquee() {
  const bands = Array.from(document.querySelectorAll<HTMLElement>("[data-marquee]"));
  if (!bands.length) return;

  // Simpan pembongkar agar tidak ada dua animasi menempel di elemen yang sama.
  const active = new Map<HTMLElement, () => void>();

  function build(band: HTMLElement) {
    const set = band.firstElementChild as HTMLElement | null;
    if (!set) return;

    active.get(band)?.();
    active.delete(band);

    // data-marquee-shift="0.6" (opsional) memperlambat gerak.
    const shift = Number(band.dataset.marqueeShift ?? "1");
    const segment = set.getBoundingClientRect().width * shift;
    const direction = Number(band.dataset.direction ?? "-1");
    const from = direction < 0 ? 0 : -segment;
    const to = direction < 0 ? -segment : 0;

    band.style.transform = `translateX(${from}px)`;
    if (reducedMotion() || segment === 0) return;

    const animation = animate(
      band,
      { transform: [`translateX(${from}px)`, `translateX(${to}px)`] },
      { ease: "linear" },
    );
    const stopScroll = scroll(animation, { target: band, offset: ["start end", "end start"] });

    active.set(band, () => {
      stopScroll();
      animation.cancel();
    });
  }

  const timers = new Map<HTMLElement, number>();

  bands.forEach((band) => {
    build(band);
    window.addEventListener("resize", () => {
      window.clearTimeout(timers.get(band));
      timers.set(band, window.setTimeout(() => build(band), 150));
    });
  });
}
```

Panggil di dalam `init()` setelah `initParallax();`:

```ts
  // 6. Teks berjalan (marquee) yang terikat scroll.
  initMarquee();
```

Import `scroll` sudah ada sejak plan 004. Kalau plan 004 belum dikerjakan, ubah importnya jadi
`import { animate, inView, scroll } from "motion";`.

## Boundaries

- **Jangan** install `motion-plus` / `@motion-plus/ticker` (berbayar) atau dependency apa pun.
- Jangan tampilkan angka, harga, jadwal, atau klaim baru di marquee. Kata harus sudah ada di
  halaman.
- Jangan pakai marquee untuk informasi yang tidak ada di tempat lain — section-nya `aria-hidden`.
- Jangan tambahkan `overflow-x` di `body`/`html` sebagai "perbaikan"; yang menahan luapan adalah
  `overflow-hidden` pada `<section>` marquee.
- Jangan ubah section lain; jangan pindahkan urutan section lain selain menyisipkan
  `<TextMarquee />` setelah `<Hero />`.
- Kalau setelah dikerjakan lebar satu salinan < 50% lebar viewport pada 1920px, tambahkan kata
  pada baris tersebut (jangan menambah `COPIES` melebihi 3 tanpa mengecek ulang rumus celah).

## Verification

- **Mechanical**
  - `npm run build` sukses.
  - `grep -c 'data-marquee' dist/index.html` → 2.
  - `grep -o 'aria-hidden="true"' dist/index.html | wc -l` bertambah 1 (section marquee).
  - `grep -c 'text-outline' dist/_astro/*.css` → ada.
- **Feel check** (`npm run dev`, http://localhost:4321)
  - Scroll perlahan melewati band: baris 1 bergerak ke kiri, baris 2 ke kanan, dan tidak ada
    saat di mana terlihat celah kosong atau teks "melompat" satu segmen.
  - Scroll cepat naik-turun: tidak ada patah/getaran, dan tidak ada halaman yang bisa di-scroll
    horizontal (geser trackbar horizontal → tidak bergerak).
  - Resize jendela lebar↔sempit: band tetap mulus (tidak ada celah, tidak ada dua animasi
    bertumpuk yang bikin teks berkedip).
  - DevTools → Rendering → `prefers-reduced-motion: reduce` → reload → baris diam tapi tetap
    terbaca.
  - Network → block JS → reload → band tampil statis (rapi, tidak tergeser setengah).
  - DevTools → Performance → record 3 detik scroll melewati band → tidak ada frame drop berat.
- **Done when**: dua baris bergerak berlawanan arah mengikuti scroll tanpa celah, tidak ada
  luapan horizontal, dan section lain tidak berubah posisinya.

