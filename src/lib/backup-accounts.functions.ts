/**
 * Sao lưu / khôi phục tài khoản đăng nhập và hồ sơ đại lý (chỉ quản trị viên).
 * Mật khẩu không thể xuất ra được, nên khi khôi phục tài khoản mới sẽ dùng
 * mật khẩu mặc định bằng tên đăng nhập (giống luồng đăng ký đại lý).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type AccountBackup = {
  email: string;
  createdAt: string | null;
  roles: string[];
};

export type ApplicationBackup = {
  username: string;
  full_name: string;
  phone: string;
  status: string;
  note: string | null;
  email: string | null;
  created_at: string | null;
};

type Ctx = {
  supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> };
  userId: string;
};

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Chỉ quản trị viên mới thực hiện được.");
}

/** Mật khẩu mặc định khi tạo lại tài khoản: tên đăng nhập (tối thiểu 6 ký tự). */
const defaultPassword = (email: string) => {
  const name = email.split("@")[0] ?? "";
  return name.length >= 6 ? name : `${name}123456`.slice(0, 12);
};

export const exportAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: apps } = await supabaseAdmin
      .from("dealer_applications")
      .select("username, full_name, phone, status, note, email, created_at");

    const accounts: AccountBackup[] = users.users.map((u) => ({
      email: u.email ?? "",
      createdAt: u.created_at ?? null,
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => String(r.role)),
    }));

    return { accounts, applications: (apps ?? []) as ApplicationBackup[] };
  });

export const restoreAccounts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { accounts: AccountBackup[]; applications: ApplicationBackup[] }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listErr) throw new Error(listErr.message);
    const idByEmail = new Map<string, string>();
    for (const u of existing.users) if (u.email) idByEmail.set(u.email.toLowerCase(), u.id);

    let created = 0;
    let restoredRoles = 0;

    for (const acc of data.accounts) {
      const email = (acc.email ?? "").trim().toLowerCase();
      if (!email.includes("@")) continue;

      let userId = idByEmail.get(email);
      if (!userId) {
        const { data: made, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: defaultPassword(email),
          email_confirm: true,
        });
        if (error || !made.user) continue;
        userId = made.user.id;
        idByEmail.set(email, userId);
        created += 1;
      }

      for (const role of acc.roles ?? []) {
        const { error } = await supabaseAdmin
          .from("user_roles")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert({ user_id: userId, role: role as any });
        if (!error) restoredRoles += 1;
      }
    }

    // Hồ sơ đại lý: chỉ thêm những tên đăng nhập chưa có.
    const { data: currentApps } = await supabaseAdmin
      .from("dealer_applications")
      .select("username");
    const have = new Set((currentApps ?? []).map((r) => r.username.toLowerCase()));
    const missing = (data.applications ?? []).filter(
      (a) => a.username && !have.has(a.username.toLowerCase()),
    );
    if (missing.length > 0) {
      const { error } = await supabaseAdmin.from("dealer_applications").insert(
        missing.map((a) => ({
          username: a.username,
          full_name: a.full_name,
          phone: a.phone,
          status: a.status || "pending",
          note: a.note,
          email: a.email,
        })),
      );
      if (error) throw new Error(error.message);
    }

    return { created, restoredRoles, applications: missing.length };
  });
