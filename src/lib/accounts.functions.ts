/**
 * Server functions quản lý tài khoản.
 * Phân cấp: quản trị viên (admin) > đại lý cấp 1 (dealer1) > đại lý (price_viewer).
 * Đại lý cấp 1 chỉ được xem và quản lý những tài khoản do chính mình tạo.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = {
  supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown }> };
  userId: string;
};

type Actor = { userId: string; isAdmin: boolean; isDealer1: boolean };

/** Xác định vai trò của người gọi; chặn nếu không phải admin hoặc đại lý cấp 1. */
async function getManager(context: Ctx): Promise<Actor> {
  const [admin, dealer1] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "dealer1" }),
  ]);
  const isAdmin = admin.data === true;
  const isDealer1 = dealer1.data === true;
  if (!isAdmin && !isDealer1) throw new Error("Bạn không có quyền quản lý tài khoản.");
  return { userId: context.userId, isAdmin, isDealer1 };
}

/** Đại lý cấp 1 chỉ được thao tác trên tài khoản do chính mình tạo. */
async function assertCanManageUser(
  actor: Actor,
  targetUserId: string,
  admin: { from: (t: string) => any }, // eslint-disable-line @typescript-eslint/no-explicit-any
) {
  if (actor.isAdmin) return;
  const { data } = await admin
    .from("account_owners")
    .select("created_by")
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (!data || data.created_by !== actor.userId)
    throw new Error("Bạn chỉ quản lý được tài khoản do mình tạo.");
}

export const listAccounts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const actor = await getManager(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error(error.message);
    const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const { data: owners } = await supabaseAdmin
      .from("account_owners")
      .select("user_id, created_by");

    const ownerOf = new Map((owners ?? []).map((o) => [o.user_id, o.created_by]));

    return data.users
      .filter((u) => (actor.isAdmin ? true : ownerOf.get(u.id) === actor.userId))
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        createdAt: u.created_at,
        roles: (roles ?? []).filter((r) => r.user_id === u.id).map((r) => r.role as string),
      }));
  });

/** Cho biết người dùng hiện tại có quyền quản lý tài khoản hay không. */
export const getAccountManagerRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ctx = context as unknown as Ctx;
    const [admin, dealer1] = await Promise.all([
      ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" }),
      ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "dealer1" }),
    ]);
    return { isAdmin: admin.data === true, isDealer1: dealer1.data === true };
  });

export const createAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      email: string;
      password: string;
      priceViewer: boolean;
      dealer1?: boolean;
      role?: "admin" | "manager" | "dealer1" | "dealer" | "user";
    }) => {
      if (!data.email.includes("@")) throw new Error("Tên đăng nhập không hợp lệ.");
      if (data.password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự.");
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const actor = await getManager(context as unknown as Ctx);
    // Chỉ quản trị viên mới được tạo tài khoản quản trị viên / đại lý cấp 1.
    const role = data.role ?? (data.dealer1 ? "dealer1" : data.priceViewer ? "dealer" : "user");
    const finalRole = actor.isAdmin
      ? role
      : role === "admin" || role === "manager" || role === "dealer1"
        ? "dealer"
        : role;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (created.user) {
      const roles: { user_id: string; role: string }[] = [];
      if (finalRole === "admin") roles.push({ user_id: created.user.id, role: "admin" });
      if (finalRole === "manager") roles.push({ user_id: created.user.id, role: "manager" });
      if (finalRole === "dealer1") roles.push({ user_id: created.user.id, role: "dealer1" });
      if (finalRole === "dealer1" || finalRole === "dealer" || data.priceViewer)
        roles.push({ user_id: created.user.id, role: "price_viewer" });
      if (roles.length) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rErr } = await (supabaseAdmin.from("user_roles") as any).insert(roles);
        if (rErr && !rErr.message.includes("duplicate")) throw new Error(rErr.message);
      }

      const { error: oErr } = await supabaseAdmin
        .from("account_owners")
        .upsert({ user_id: created.user.id, created_by: actor.userId });
      if (oErr) throw new Error(oErr.message);
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
    const actor = await getManager(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertCanManageUser(actor, data.userId, supabaseAdmin);
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
    const actor = await getManager(context as unknown as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertCanManageUser(actor, data.userId, supabaseAdmin);
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

/** Cấp hoặc thu hồi quyền đại lý cấp 1 (chỉ quản trị viên). */
export const setAccountDealer1 = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; enabled: boolean }) => data)
  .handler(async ({ data, context }) => {
    const actor = await getManager(context as unknown as Ctx);
    if (!actor.isAdmin) throw new Error("Chỉ quản trị viên mới cấp được quyền đại lý cấp 1.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.enabled) {
      // Đại lý cấp 1 luôn xem được giá nhập.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin.from("user_roles") as any).upsert(
        [
          { user_id: data.userId, role: "dealer1" },
          { user_id: data.userId, role: "price_viewer" },
        ],
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin.from("user_roles") as any)
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "dealer1");
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });

export type AccountRole = "admin" | "manager" | "dealer1" | "dealer" | "user";

/**
 * Đặt lại vai trò của một tài khoản (chỉ admin).
 * admin = toàn quyền, manager = quản trị viên nội dung, dealer1 = đại lý cấp 1,
 * dealer = đại lý xem giá nhập, user = người dùng thường.
 */
export const setAccountRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string; role: AccountRole }) => {
    if (!["admin", "manager", "dealer1", "dealer", "user"].includes(data.role))
      throw new Error("Vai trò không hợp lệ.");
    return data;
  })
  .handler(async ({ data, context }) => {
    const actor = await getManager(context as unknown as Ctx);
    if (!actor.isAdmin) throw new Error("Chỉ quản trị viên mới được đổi vai trò tài khoản.");
    if (data.userId === actor.userId)
      throw new Error("Không thể tự đổi vai trò của chính mình.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const next: string[] =
      data.role === "admin"
        ? ["admin"]
        : data.role === "manager"
          ? ["manager"]
          : data.role === "dealer1"
          ? ["dealer1", "price_viewer"]
          : data.role === "dealer"
            ? ["price_viewer"]
            : [];

    const { error: dErr } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .in("role", ["admin", "manager", "dealer1", "price_viewer"]);
    if (dErr) throw new Error(dErr.message);

    if (next.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabaseAdmin.from("user_roles") as any).upsert(
        next.map((role) => ({ user_id: data.userId, role })),
        { onConflict: "user_id,role", ignoreDuplicates: true },
      );
      if (error) throw new Error(error.message);
    }
    return { ok: true as const };
  });


export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { userId: string }) => data)
  .handler(async ({ data, context }) => {
    const actor = await getManager(context as unknown as Ctx);
    if (data.userId === actor.userId) throw new Error("Không thể xoá chính tài khoản đang dùng.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertCanManageUser(actor, data.userId, supabaseAdmin);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("account_owners").delete().eq("user_id", data.userId);
    return { ok: true as const };
  });
