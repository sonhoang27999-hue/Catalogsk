/**
 * Link riêng của đại lý cấp 1: `catalog.sklight.vn/d/<mã>`.
 * Mã được giữ trên thanh địa chỉ dưới dạng `?dl=<mã>` và nhớ trong trình duyệt,
 * để người nhận xem tiếp hay gửi lại trang con vẫn ra đúng thông tin đại lý.
 */

/** Tham số trên URL mang mã đại lý. */
export const DEALER_PARAM = "dl";
/** Khoá lưu mã đại lý gần nhất trong trình duyệt. */
export const DEALER_STORAGE_KEY = "sk.dealer";
/** `?dl=off` xoá mã đang nhớ (dùng khi cần xem lại trang gốc). */
export const DEALER_CLEAR = "off";

const CODE_PATTERN = /^[a-z][a-z0-9-]{1,28}[a-z0-9]$/;
// Các từ bộ đọc URL hiểu thành kiểu khác (true/false/null) hoặc dành cho hệ thống.
const RESERVED = new Set(["true", "false", "null", DEALER_CLEAR, "admin", "auth"]);

/** Chuẩn hoá mã người dùng gõ: bỏ dấu, chữ thường, khoảng trắng/ký tự lạ thành gạch nối. */
export function normalizeDealerCode(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/g, "");
}

/** Mã hợp lệ: 3–30 ký tự, chữ thường không dấu/số/gạch nối, bắt đầu bằng chữ. */
export function isDealerCode(value: unknown): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value) && !RESERVED.has(value);
}

/** Đọc mã đại lý từ chuỗi query của URL. Trả "off" nếu là lệnh xoá, null nếu không có/không hợp lệ. */
export function dealerCodeFromSearch(search: string): string | null {
  const raw = new URLSearchParams(search).get(DEALER_PARAM);
  if (raw == null) return null;
  const value = raw.trim().toLowerCase();
  if (value === DEALER_CLEAR) return DEALER_CLEAR;
  return isDealerCode(value) ? value : null;
}

/** Link đầy đủ để đại lý gửi cho cấp dưới. */
export function dealerLink(origin: string, code: string): string {
  return `${origin.replace(/\/+$/, "")}/d/${code}`;
}

/** Số điện thoại chỉ còn chữ số và dấu + (dùng cho `tel:`). */
export const telHref = (phone: string) => `tel:${phone.replace(/[^+\d]/g, "")}`;

/** Link mở Zalo theo số điện thoại. */
export const zaloHref = (zalo: string) => `https://zalo.me/${zalo.replace(/\D/g, "")}`;

/** Hiển thị số dễ đọc: 0912345678 → 0912 345 678 (số khác giữ nguyên). */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/[^+\d]/g, "");
  return /^0\d{9}$/.test(digits)
    ? `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`
    : digits;
}
