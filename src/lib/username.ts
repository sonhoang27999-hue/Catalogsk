/**
 * Cho phép đăng nhập bằng "tên đăng nhập" thay vì email.
 * Tên đăng nhập được quy đổi thành một địa chỉ email nội bộ cố định.
 */
export const LOGIN_DOMAIN = "app.local";

/** Chuẩn hoá tên đăng nhập: bỏ dấu, chỉ giữ chữ thường, số, dấu chấm/gạch. */
export const normalizeUsername = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9._-]/g, "");

/** Quy đổi tên đăng nhập (hoặc email) thành email dùng cho hệ thống xác thực. */
export const toLoginEmail = (value: string) => {
  const raw = value.trim();
  if (raw.includes("@")) return raw.toLowerCase();
  return `${normalizeUsername(raw)}@${LOGIN_DOMAIN}`;
};

/** Hiển thị ngược lại: ẩn phần đuôi nội bộ khi hiện cho người dùng. */
export const displayLogin = (email: string) =>
  email.toLowerCase().endsWith(`@${LOGIN_DOMAIN}`) ? email.split("@")[0]! : email;
