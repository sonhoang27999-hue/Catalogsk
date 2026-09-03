/**
 * Nhật ký truy cập của tài khoản (đăng nhập & xem trang).
 * Người dùng chỉ ghi được nhật ký của chính mình; chỉ quản trị viên đọc được toàn bộ.
 */
import { supabase } from "@/integrations/supabase/client";

export type AccessLogRow = {
  id: string;
  user_id: string;
  email: string;
  event: string;
  path: string;
  created_at: string;
  role: string;
};

const ROLE_PRIORITY = ["admin", "manager", "dealer1", "price_viewer", "user"];

function primaryRole(roles: string[]) {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? "user";
}

/** Ghi một lượt truy cập của người dùng đang đăng nhập (bỏ qua nếu chưa đăng nhập). */
export const logAccess = async (event: "login" | "view", path: string) => {
  // getSession() đọc phiên tại chỗ (không gọi mạng) — tránh 1 round-trip /auth/v1/user
  // cho MỖI lượt xem trang. RLS phía Cloud vẫn xác thực bằng token khi insert.
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("access_logs") as any).insert({
    user_id: user.id,
    email: user.email ?? "",
    event,
    path: path.slice(0, 300),
  });
};

/** Danh sách lượt truy cập gần nhất kèm vai trò của tài khoản (chỉ quản trị viên đọc được). */
export const listAccessLogs = async (limit = 300) => {
  const [logsRes, rolesRes] = await Promise.all([
    supabase
      .from("access_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  if (logsRes.error) throw new Error(logsRes.error.message);

  const roleMap = new Map<string, string[]>();
  for (const r of (rolesRes.data ?? []) as { user_id: string; role: string }[]) {
    const list = roleMap.get(r.user_id) ?? [];
    list.push(r.role);
    roleMap.set(r.user_id, list);
  }

  return ((logsRes.data ?? []) as unknown as Omit<AccessLogRow, "role">[]).map((log) => ({
    ...log,
    role: primaryRole(roleMap.get(log.user_id) ?? []),
  }));
};
