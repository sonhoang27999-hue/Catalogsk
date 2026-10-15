/**
 * Theme engine: generates harmonious palettes in OKLCH, checks WCAG contrast and
 * turns stored site settings into one CSS string. Used by ThemeApplier (SSR) and
 * by the admin live preview so both always render identically.
 */
import { THEME_ALLOWED_KEYS, THEME_RADIUS_KEY, THEME_VARS } from "@/data/settings.api";
import { hexToOklch, toHex } from "@/lib/color";

export const THEME_MODE_KEY = "theme_mode";
export const THEME_ACCENT_KEY = "theme_accent";
export const THEME_BG_LEVEL_KEY = "theme_bg_level";
export const THEME_EFFECTS_KEY = "theme_effects";
export const THEME_FX_SPEED_KEY = "theme_fx_speed";
export const THEME_TITLE_GRADIENT_KEY = "theme_title_gradient";
export const THEME_PRESET_KEY = "theme_preset";

/** Every key the theme editor may write (export/import uses this allow list). */
export const THEME_ALL_KEYS: readonly string[] = THEME_ALLOWED_KEYS;

export type ThemeMode = "dark" | "light" | "auto";
export type FxSpeed = "slow" | "medium" | "fast";
export type EffectId = "title" | "ambient" | "edge" | "shimmer" | "particles";
export type Effects = Record<EffectId, { on: boolean; level: number }>;

export const EFFECT_LIST: { id: EffectId; label: string; hint: string }[] = [
  { id: "title", label: "Ánh sáng quét qua tiêu đề", hint: "Vệt sáng ánh kim chạy qua chữ" },
  { id: "ambient", label: "Quầng sáng nền trôi", hint: "Ánh đèn mờ trôi chậm phía sau" },
  { id: "edge", label: "Viền thẻ chạy gradient", hint: "Viền thẻ sáng chạy vòng định kỳ" },
  { id: "shimmer", label: "Quét sáng khi chạm thẻ", hint: "Lướt sáng khi chạm/di chuột" },
  { id: "particles", label: "Hạt sáng ở ảnh bìa", hint: "Đốm sáng nhỏ lơ lửng" },
];

export const DEFAULT_EFFECTS: Effects = {
  title: { on: true, level: 80 },
  ambient: { on: true, level: 100 },
  edge: { on: true, level: 70 },
  shimmer: { on: true, level: 80 },
  particles: { on: true, level: 60 },
};

export const DEFAULT_TITLE_GRADIENT = ["#f0509a", "#9b5cf6", "#3fa9f5", "#f5a142"];

const HEX = /^#[0-9a-f]{6}$/i;
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

export function parseEffects(raw?: string): Effects {
  const out: Effects = JSON.parse(JSON.stringify(DEFAULT_EFFECTS));
  if (!raw) return out;
  try {
    const obj = JSON.parse(raw) as Partial<Record<EffectId, { on?: unknown; level?: unknown }>>;
    for (const { id } of EFFECT_LIST) {
      const e = obj?.[id];
      if (!e) continue;
      if (typeof e.on === "boolean") out[id].on = e.on;
      if (typeof e.level === "number") out[id].level = clamp(Math.round(e.level), 0, 100);
    }
  } catch {
    /* ignore malformed */
  }
  return out;
}

export function parseTitleGradient(raw?: string): string[] {
  if (!raw) return DEFAULT_TITLE_GRADIENT;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      const ok = arr.filter((c): c is string => typeof c === "string" && HEX.test(c));
      if (ok.length >= 2) return ok.slice(0, 4);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_TITLE_GRADIENT;
}

export const parseMode = (raw?: string): ThemeMode =>
  raw === "light" || raw === "auto" ? raw : "dark";
export const parseSpeed = (raw?: string): FxSpeed =>
  raw === "slow" || raw === "fast" ? raw : "medium";

/* ---------- color math ---------- */

type Lch = { L: number; C: number; H: number };

export function hexToLch(hex: string): Lch {
  const s = hexToOklch(hex) ?? "oklch(0.6 0.15 260)";
  const m = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)\)/.exec(s);
  return { L: Number(m?.[1] ?? 0.6), C: Number(m?.[2] ?? 0.15), H: Number(m?.[3] ?? 260) };
}

export function lchToHex({ L, C, H }: Lch): string {
  // Reduce chroma until the colour is inside sRGB (keeps hue + lightness).
  let c = C;
  for (let i = 0; i < 24; i++) {
    const hex = toHex(`oklch(${clamp(L, 0, 1)} ${c} ${((H % 360) + 360) % 360})`, "#000000");
    if (inGamut(L, c, H) || c < 0.002) return hex;
    c *= 0.88;
  }
  return toHex(`oklch(${L} 0 0)`, "#000000");
}

function inGamut(L: number, C: number, Hdeg: number) {
  const H = (Hdeg * Math.PI) / 180;
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return rgb.every((v) => v >= -0.001 && v <= 1.001);
}

export function luminance(hex: string): number {
  const h = HEX.test(hex) ? hex.slice(1) : "000000";
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}

export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Moves lightness away from `bg` until the colour reaches `min` contrast. */
function ensureContrast(c: Lch, bg: string, min: number, lighten: boolean): string {
  let cur = { ...c };
  for (let i = 0; i < 40; i++) {
    const hex = lchToHex(cur);
    if (contrast(hex, bg) >= min) return hex;
    cur = { ...cur, L: clamp(cur.L + (lighten ? 0.02 : -0.02), 0, 1) };
  }
  return lchToHex(cur);
}

/** Text colour (black/white-ish) readable on top of `bg`. */
export function readableOn(bg: string): string {
  return contrast("#ffffff", bg) >= contrast("#111114", bg) ? "#ffffff" : "#111114";
}

/**
 * Builds the full palette from one primary colour.
 * `level` 0–100: dark mode → deeper..lifted background; light mode → white..soft grey.
 */
export function generatePalette(
  accent: string,
  mode: "dark" | "light",
  level: number,
): Record<string, string> {
  const a = hexToLch(HEX.test(accent) ? accent : "#3f6fd8");
  const t = clamp(level, 0, 100) / 100;
  const tint = Math.min(a.C, 0.06) * 0.35;
  const goldHue = a.H * 0.25 + 82 * 0.75;

  if (mode === "dark") {
    const bgL = 0.11 + t * 0.15;
    const bg = lchToHex({ L: bgL, C: tint, H: a.H });
    const card = lchToHex({ L: bgL + 0.055, C: tint * 1.2, H: a.H });
    const border = lchToHex({ L: bgL + 0.16, C: tint * 1.4, H: a.H });
    const fg = ensureContrast({ L: 0.97, C: 0.008, H: a.H }, card, 7, true);
    const muted = ensureContrast({ L: 0.8, C: 0.02, H: a.H }, card, 4.6, true);
    const brand = ensureContrast({ L: clamp(a.L, 0.6, 0.74), C: a.C, H: a.H }, bg, 3.2, true);
    const gold = ensureContrast({ L: 0.8, C: 0.14, H: goldHue }, bg, 4.5, true);
    return pack(bg, card, fg, muted, border, gold, brand);
  }
  const bgL = 0.995 - t * 0.12;
  const bg = lchToHex({ L: bgL, C: tint * 0.5, H: a.H });
  const card = lchToHex({ L: Math.min(1, bgL + 0.04), C: tint * 0.3, H: a.H });
  const border = lchToHex({ L: bgL - 0.11, C: tint, H: a.H });
  const fg = ensureContrast({ L: 0.2, C: 0.015, H: a.H }, bg, 7, false);
  const muted = ensureContrast({ L: 0.46, C: 0.025, H: a.H }, bg, 4.6, false);
  const brand = ensureContrast({ L: clamp(a.L, 0.42, 0.56), C: a.C, H: a.H }, bg, 4.5, false);
  const gold = ensureContrast({ L: 0.6, C: 0.13, H: goldHue }, bg, 3.2, false);
  return pack(bg, card, fg, muted, border, gold, brand);
}

function pack(
  bg: string,
  card: string,
  fg: string,
  muted: string,
  border: string,
  gold: string,
  brand: string,
): Record<string, string> {
  return {
    theme_background: bg,
    theme_card: card,
    theme_foreground: fg,
    theme_muted_foreground: muted,
    theme_border: border,
    theme_gold: gold,
    theme_brand: brand,
    theme_primary: brand,
  };
}

/* ---------- CSS ---------- */

const isSafeCssValue = (value: string) => /^[a-zA-Z0-9#(),.%\s/-]+$/.test(value);
const SPEED_FACTOR: Record<FxSpeed, number> = { slow: 1.6, medium: 1, fast: 0.6 };

/** Palette declarations (+ derived surfaces for light palettes). */
function paletteDecls(values: Record<string, string>): string[] {
  const decls: string[] = [];
  for (const item of THEME_VARS) {
    const v = values[item.key]?.trim();
    if (v && isSafeCssValue(v)) decls.push(`${item.cssVar}:${v}`);
  }
  const bgHex = toHex(values["theme_background"] ?? "", "");
  const cardHex = toHex(values["theme_card"] ?? "", "");
  if (cardHex) decls.push(`--sk-surface:${cardHex}`, "--popover:var(--card)");
  const primaryHex = toHex(values["theme_primary"] ?? "", "");
  if (primaryHex) decls.push(`--primary-foreground:${readableOn(primaryHex)}`);
  const goldHex = toHex(values["theme_gold"] ?? "", "");
  if (goldHex) decls.push(`--gold-foreground:${readableOn(goldHex)}`);
  if (bgHex && luminance(bgHex) > 0.45) {
    decls.push(
      "--card-foreground:var(--foreground)",
      "--popover-foreground:var(--foreground)",
      "--secondary:color-mix(in oklab,var(--foreground) 7%,var(--background))",
      "--secondary-foreground:var(--foreground)",
      "--muted:color-mix(in oklab,var(--foreground) 6%,var(--background))",
      "--accent:color-mix(in oklab,var(--foreground) 8%,var(--background))",
      "--accent-foreground:var(--foreground)",
      "--input:var(--border)",
      "--ring:var(--brand)",
      "color-scheme:light",
    );
  }
  return decls;
}

/** Converts stored (or draft) settings into CSS. Pure → safe for SSR. */
export function buildThemeCss(data: Record<string, string> | undefined): string {
  const s = data ?? {};
  const mode = parseMode(s[THEME_MODE_KEY]);
  const fx = parseEffects(s[THEME_EFFECTS_KEY]);
  const speed = SPEED_FACTOR[parseSpeed(s[THEME_FX_SPEED_KEY])];
  const grad = parseTitleGradient(s[THEME_TITLE_GRADIENT_KEY]);

  const base = paletteDecls(s);
  const radius = s[THEME_RADIUS_KEY]?.trim();
  if (radius && isSafeCssValue(radius)) base.push(`--radius:${radius}`);

  base.push(
    `--sk-fx-speed:${speed}`,
    `--sk-fx-title:${(fx.title.level / 100).toFixed(2)}`,
    `--sk-fx-ambient:${(fx.ambient.level / 100).toFixed(2)}`,
    `--sk-fx-edge:${(fx.edge.level / 100).toFixed(2)}`,
    `--sk-fx-shimmer:${(fx.shimmer.level / 100).toFixed(2)}`,
    `--sk-fx-particles:${(fx.particles.level / 100).toFixed(2)}`,
  );
  if (s[THEME_TITLE_GRADIENT_KEY]) {
    base.push(`--sk-spectrum:linear-gradient(110deg,${[...grad, grad[0]].join(",")})`);
  }

  let css = `:root.dark,:root{${base.join(";")}}`;

  if (mode === "auto") {
    const accent = HEX.test(s[THEME_ACCENT_KEY] ?? "")
      ? s[THEME_ACCENT_KEY]!
      : toHex(s["theme_brand"] ?? "", "#3f6fd8");
    const lvl = Number(s[THEME_BG_LEVEL_KEY] ?? 20);
    const light = generatePalette(accent, "light", Number.isFinite(lvl) ? lvl : 20);
    css += `@media (prefers-color-scheme: light){:root.dark,:root{${paletteDecls(light).join(";")}}}`;
  }

  const off: string[] = [];
  if (!fx.title.on) off.push(".sk-title-sweep::after{display:none!important}");
  if (!fx.ambient.on) off.push(".sk-public-stage::before{display:none!important}");
  if (!fx.edge.on)
    off.push(
      ".sk-catalog .sk-product-card,.sk-theme-preview .sk-product-card{animation:none!important}",
    );
  if (!fx.shimmer.on) off.push(".sk-shimmer::after{display:none!important}");
  if (!fx.particles.on) off.push(".sk-particles{display:none!important}");
  return css + off.join("");
}
