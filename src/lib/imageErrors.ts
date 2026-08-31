/**
 * Nhật ký ảnh lỗi phía trình duyệt: lưu vào localStorage để admin xem thống kê
 * theo nguồn (tên miền) và theo thời điểm, giúp tìm nhanh link ảnh hỏng.
 */
export type ImageErrorEntry = {
  /** Thời điểm (ms). */
  t: number;
  /** Tên miền nguồn ảnh. */
  host: string;
  /** Link ảnh lỗi. */
  url: string;
  /** Mô tả vị trí (alt của ảnh). */
  label: string;
};

const KEY = "sk.image-errors";
const LIMIT = 500;
const listeners = new Set<() => void>();

const canUse = () => typeof window !== "undefined" && !!window.localStorage;

export const hostOf = (url: string) => {
  try {
    return new URL(url, window.location.origin).hostname || "khác";
  } catch {
    return "khác";
  }
};

export function readImageErrors(): ImageErrorEntry[] {
  if (!canUse()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as ImageErrorEntry[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function logImageError(url: string, label: string) {
  if (!canUse() || !url) return;
  const list = readImageErrors();
  list.push({ t: Date.now(), host: hostOf(url), url, label });
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(-LIMIT)));
  } catch {
    /* bỏ qua khi hết dung lượng */
  }
  listeners.forEach((fn) => fn());
}

export function clearImageErrors() {
  if (!canUse()) return;
  window.localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn());
}

export function subscribeImageErrors(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
