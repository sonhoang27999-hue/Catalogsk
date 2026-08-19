/**
 * Server functions quản lý tài khoản (chỉ dành cho quản trị viên).
 * Cho phép tạo tài khoản bằng tên đăng nhập + mật khẩu, không cần email thật.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> }; userId: string };

async function assertAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (data !== true) throw new Error("Chỉ quản trị viên mới thực hiện được.");
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? "",
      createdAt: u.created_at,
      roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
    }));
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string; password: string; priceViewer: boolean }) => {
    if (!data.email.includes("@")) throw new Error("Tên đăng nhập không hợp lệ.");
    if (data.password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự.");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (data.priceViewer && created.user) {
      const { error: rErr } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: created.user.id, role: "price_viewer" });
      if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);
    }
    return { ok: true as const };
  });

export const setAccountPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; password: string }) => {
    if (data.password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự.");
    return data;
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

export const setAccountPriceViewer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; enabled: boolean }) => data)
  .handler(async ({ data, context }) => {
    await assertAdmin(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: "price_viewer" });
      if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "price_viewer");
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    await assertAdmin(ctx);
    if (data.userId === ctx.userId) throw new Error("Không thể xoá chính tài khoản đang dùng.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
