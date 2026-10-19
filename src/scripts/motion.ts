/**
 * Mesin animasi scroll halaman Bankli.
 *
 * - Hanya `transform`, `opacity`, dan `clip-path` yang dianimasikan — tidak ada
 *   properti layout, jadi tidak ada CLS.
 * - Transform selalu ditulis sebagai string penuh (`translateY(16px)`), bukan
 *   shorthand `x`/`y`/`scale`, supaya tetap di jalur hardware-accelerated.
 * - Nilai "from" WAJIB sama dengan pre-state di src/styles/global.css.
 *
 * Kontrak markup (dipasang di plan 002-004):
 *   data-reveal="up|rise|scale|fade|grow|clip"  elemen tunggal, dipicu inView
 *   data-reveal-group                          container; anak [data-reveal]
 *                                              tampil berurutan (stagger 70ms)
 *   data-reveal-mask                           container; anak [data-reveal-word]
 *                                              muncul per kata (stagger 35ms)
 *   data-reveal-word                           satu kata di dalam mask
 *   data-reveal-now                            jalankan saat load (di atas lipatan)
 *   data-reveal-delay="120"                    tambahan delay (ms)
 *   data-reveal-duration="700"                 override durasi (ms)
 */
import { animate, inView, scroll } from "motion";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];
const STAGGER = 0.07;
const STAGGER_WORD = 0.035;

/** Margin viewport: elemen dianggap masuk setelah lewat 88% tinggi layar. */
const VIEW = { margin: "0px 0px -12% 0px" } as const;

/** Durasi bawaan per jenis animasi (detik). */
const DURATION: Record<string, number> = {
  up: 0.5,
  rise: 0.6,
  scale: 0.7,
  fade: 0.5,
  grow: 0.45,
  clip: 0.7,
  mask: 0.55,
};

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const ms = (value: string | undefined, fallback: number) => (value ? Number(value) / 1000 : fallback);

function play(target: HTMLElement, kindName?: string, extraDelay = 0) {
  const kind = kindName ?? target.dataset.reveal ?? "up";
  const delay = ms(target.dataset.revealDelay, 0) + extraDelay;
  const duration = ms(target.dataset.revealDuration, DURATION[kind] ?? DURATION.up);

  if (reducedMotion()) {
    // Gerak dihapus, sisakan fade 180ms supaya konten tidak "nge-pop".
    animate(target, { opacity: [0, 1] }, { duration: 0.18, delay, ease: "linear" });
    return;
  }

  const options = { duration, delay, ease: EASE_OUT };

  switch (kind) {
    case "rise":
      animate(target, { opacity: [0, 1], transform: ["translateY(28px)", "translateY(0px)"] }, options);
      break;
    case "scale":
      animate(
        target,
        { opacity: [0, 1], transform: ["scale(0.98) translateY(24px)", "scale(1) translateY(0px)"] },
        options,
      );
      break;
    case "fade":
      animate(target, { opacity: [0, 1] }, options);
      break;
    case "grow":
      animate(target, { transform: ["scaleX(0)", "scaleX(1)"] }, options);
      break;
    case "clip":
      animate(target, { clipPath: ["inset(0% 50% 0% 50%)", "inset(0% 0% 0% 0%)"] }, options);
      break;
    case "mask":
      animate(
        target,
        { opacity: [0, 1], clipPath: ["inset(100% 0% -20% 0%)", "inset(0% 0% -20% 0%)"] },
        options,
      );
      break;
    default:
      animate(target, { opacity: [0, 1], transform: ["translateY(16px)", "translateY(0px)"] }, options);
  }
}

function playMask(root: HTMLElement, baseDelay = 0) {
  root.querySelectorAll<HTMLElement>("[data-reveal-word]").forEach((word, index) => {
    play(word, "mask", baseDelay + index * STAGGER_WORD);
  });
}

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

function init() {
  // 1. Elemen di atas lipatan: tunggu font (maks 400ms) supaya tidak ada
  //    lompatan saat STKBureauSerif selesai dimuat.
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const fallback = new Promise<void>((resolve) => window.setTimeout(resolve, 400));

  Promise.race([fonts, fallback]).then(() => {
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

  // 3. Kelompok: anak-anaknya tampil berurutan (60-80ms per langkah).
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

  // 5. Parallax scroll-linked (desktop saja).
  initParallax();
}

// Sinyal ke failsafe di Base.astro bahwa modul berhasil jalan.
document.documentElement.setAttribute("data-motion-ready", "");

try {
  init();
} catch (error) {
  // Animasi tidak boleh menyembunyikan konten: kalau ada yang gagal, buka
  // kembali pre-state (lihat .has-js di global.css).
  document.documentElement.classList.remove("has-js");
  console.error("[motion] animasi dinonaktifkan:", error);
}
