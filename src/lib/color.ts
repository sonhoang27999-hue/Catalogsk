/** Chuyển mã màu HEX (#rrggbb) sang chuỗi oklch() dùng cho CSS variable. */
export function hexToOklch(hex: string): string | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1] ?? "";
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const srgb = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  const lin = srgb.map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = lin as [number, number, number];

  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m2 = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

  const L = 0.2104542553 * l + 0.793617785 * m2 - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m2 + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m2 - 0.808675766 * s;

  const C = Math.sqrt(A * A + B * B);
  let H = (Math.atan2(B, A) * 180) / Math.PI;
  if (H < 0) H += 360;

  const round = (n: number, d: number) => Number(n.toFixed(d));
  return `oklch(${round(L, 4)} ${round(C, 4)} ${round(H, 2)})`;
}

/** Chuyển oklch() (hoặc hex) về HEX để hiển thị trong ô chọn màu của trình duyệt. */
export function toHex(value: string, fallback: string): string {
  const v = value.trim();
  if (/^#([0-9a-f]{6})$/i.test(v)) return v;
  const m = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/i.exec(v);
  if (!m) return fallback;
  const L = Number(m[1]);
  const C = Number(m[2]);
  const H = (Number(m[3]) * Math.PI) / 180;
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);

  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m2 = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;

  const lr = 4.0767416621 * l - 3.3077115913 * m2 + 0.2309699292 * s;
  const lg = -1.2684380046 * l + 2.6097574011 * m2 - 0.3413193965 * s;
  const lb = -0.0041960863 * l - 0.7034186147 * m2 + 1.707614701 * s;

  const enc = (c: number) => {
    const v2 = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(v2 * 255)))
      .toString(16)
      .padStart(2, "0");
  };
  return `#${enc(lr)}${enc(lg)}${enc(lb)}`;
}
