/**
 * Tạo tài khoản đại lý (xem giá nhập) cho trợ lý tư vấn của Javis.
 *
 * Chỉ Javis gọi, qua route /api/bot/tai-khoan-dai-ly, sau khi NHÂN VIÊN SK đã xác nhận gara.
 * - Tắt mặc định: thiếu biến môi trường BOT_DEALER_SECRET thì route trả 503.
 * - Chỉ tạo được vai trò "đại lý xem giá nhập" (price_viewer), không bao giờ admin, manager hay dealer1.
 * - Mật khẩu ngẫu nhiên do code sinh, chỉ trả về một lần trong phản hồi tạo mới.
 * - Chống trùng theo số điện thoại, giới hạn số tài khoản tạo mỗi 24 giờ.
 */
import { randomBytes, timingSafeEqual } from "node:crypto";
import { normalizeUsername, toLoginEmail } from "@/lib/username";

export const BOT_NOTE_PREFIX = "Tạo qua trợ lý tư vấn";
export const BOT_DAILY_LIMIT = 10;

const PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export type CreateDealerInput = {
  garageName: string;
  phone: string;
  confirmedBy: string;
  zaloThread?: string;
};

export type CreateDealerResult =
  | { ok: true; status: "created"; username: string; password: string }
  | { ok: true; status: "exists"; username: string }
  | { ok: false; code: 400 | 429 | 500; error: string };

export function secretMatches(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 16 || !header) return false;
  const given = Buffer.from(header.replace(/^Bearer\s+/i, "").trim());
  const want = Buffer.from(secret);
  return given.length === want.length && timingSafeEqual(given, want);
}

export function parseInput(raw: unknown): CreateDealerInput | string {
  if (!raw || typeof raw !== "object") return "Thiếu dữ liệu.";
  const r = raw as Record<string, unknown>;
  const garageName = String(r["garageName"] ?? "").replace(/\s+/g, " ").trim();
  const phone = String(r["phone"] ?? "").replace(/[\s.-]/g, "");
  const confirmedBy = String(r["confirmedBy"] ?? "").replace(/\s+/g, " ").trim();
  const zaloThread = String(r["zaloThread"] ?? "").trim().slice(0, 64);
  if (garageName.length < 2 || garageName.length > 80) return "Tên gara phải từ 2 đến 80 ký tự.";
  if (!/^0\d{8,10}$/.test(phone)) return "Số điện thoại không hợp lệ.";
  if (confirmedBy.length < 2 || confirmedBy.length > 60) return "Thiếu tên nhân viên đã xác nhận.";
  return { garageName, phone, confirmedBy, zaloThread };
}

export function makePassword(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += PASSWORD_ALPHABET[bytes[i]! % PASSWORD_ALPHABET.length];
  return out;
}

/** Tên đăng nhập từ tên gara: bỏ dấu, tối đa 20 ký tự, tối thiểu 6 (bù bằng 4 số cuối điện thoại). */
export function baseUsername(garageName: string, phone: string): string {
  let base = normalizeUsername(garageName.replace(/\s+/g, "")).slice(0, 20);
  if (base.length < 6) base = (base + phone.slice(-4)).slice(0, 20);
  if (base.length < 6) base = `gara${phone.slice(-4)}`;
  return base;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = { from: (t: string) => any; auth: { admin: any } };

export async function createDealerAccount(
  db: AnyDb,
  input: CreateDealerInput,
): Promise<CreateDealerResult> {
  // Đã có hồ sơ cùng số điện thoại: không tạo thứ hai, không lộ mật khẩu.
  const { data: dup } = await db
    .from("dealer_applications")
    .select("username")
    .eq("phone", input.phone)
    .like("note", `${BOT_NOTE_PREFIX}%`)
    .limit(1);
  if (dup && dup.length) return { ok: true, status: "exists", username: dup[0].username };

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count } = await db
    .from("dealer_applications")
    .select("id", { count: "exact", head: true })
    .like("note", `${BOT_NOTE_PREFIX}%`)
    .gte("created_at", since);
  if ((count ?? 0) >= BOT_DAILY_LIMIT)
    return { ok: false, code: 429, error: "Đã đạt giới hạn tài khoản tạo tự động hôm nay." };

  const base = baseUsername(input.garageName, input.phone);
  const password = makePassword();
  let username = "";
  let userId = "";
  for (let i = 0; i < 6; i++) {
    const candidate = i === 0 ? base : `${base.slice(0, 18)}${i + 1}`;
    const { data, error } = await db.auth.admin.createUser({
      email: toLoginEmail(candidate),
      password,
      email_confirm: true,
    });
    if (!error && data?.user) {
      username = candidate;
      userId = data.user.id;
      break;
    }
    if (error && !/already|exists|registered/i.test(error.message))
      return { ok: false, code: 500, error: error.message };
  }
  if (!userId) return { ok: false, code: 500, error: "Không tìm được tên đăng nhập còn trống." };

  const note =
    `${BOT_NOTE_PREFIX}, nhân viên xác nhận: ${input.confirmedBy}` +
    (input.zaloThread ? `, Zalo: ${input.zaloThread}` : "");
  const steps: Array<[string, PromiseLike<{ error: { message: string } | null }>]> = [
    ["user_roles", db.from("user_roles").insert({ user_id: userId, role: "price_viewer" })],
    ["dealer_price_modes", db.from("dealer_price_modes").upsert({ user_id: userId, mode: "both" })],
    // Tài khoản tự sở hữu chính nó: không thuộc đại lý cấp 1 nào.
    ["account_owners", db.from("account_owners").upsert({ user_id: userId, created_by: userId })],
    [
      "dealer_applications",
      db.from("dealer_applications").insert({
        username,
        full_name: input.garageName,
        phone: input.phone,
        status: "approved",
        note,
      }),
    ],
  ];
  for (const [name, pending] of steps) {
    const { error } = await pending;
    if (error && !/duplicate/i.test(error.message)) {
      // Dựng dở thì gỡ tài khoản vừa tạo để lần sau tạo lại sạch.
      await db.auth.admin.deleteUser(userId);
      return { ok: false, code: 500, error: `${name}: ${error.message}` };
    }
  }
  return { ok: true, status: "created", username, password };
}
