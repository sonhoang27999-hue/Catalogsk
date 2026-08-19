/**
 * Server functions cho luồng đăng ký đại lý:
 * - Mật khẩu mặc định chính là tên đăng nhập (tài khoản tạo ngay, chưa có quyền xem giá nhập).
 * - Admin duyệt hồ sơ thì cấp quyền xem giá nhập cho tài khoản đó.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { toLoginEmail, normalizeUsername } from "@/lib/username";

export const submitDealerApplication = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password?: string; fullName: string; phone: string }) => {
    const username = normalizeUsername(data.username);
    if (username.length < 6) throw new Error("Tên đăng nhập tối thiểu 6 ký tự.");
    const password = (data.password ?? "").trim();
    if (password && password.length < 6) throw new Error("Mật khẩu tối thiểu 6 ký tự.");
    if (!/^0\d{8,10}$/.test(data.phone.trim())) throw new Error("Số điện thoại không hợp lệ.");
    const fullName = data.fullName.trim();
    if (fullName.length < 2) throw new Error("Nhập họ tên.");
    return { username, password: password || username, fullName, phone: data.phone.trim() };
  })


  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = toLoginEmail(data.username);
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
    });
    if (error) {
      throw new Error(
        /already|exists|registered/i.test(error.message)
          ? "Tên đăng nhập đã tồn tại, vui lòng chọn tên khác."
          : error.message,
      );
    }
    const { error: appErr } = await supabaseAdmin.from("dealer_applications").insert({
      username: data.username,
      full_name: data.fullName,
      phone: data.phone,
      status: "pending",
    });
    if (appErr) throw new Error(appErr.message);
    return { ok: true as const, username: data.username };
  });

export const setDealerApproval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { username: string; approved: boolean }) => data)
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as {
      supabase: { rpc: (fn: string, args: unknown) => Promise<{ data: unknown; error: unknown }> };
      userId: string;
    };
    const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
      _user_id: ctx.userId,
      _role: "admin",
    });
    if (isAdmin !== true) throw new Error("Chỉ quản trị viên mới thực hiện được.");
    const { error } = await ctx.supabase.rpc("set_price_viewer", {
      _email: toLoginEmail(data.username),
      _enabled: data.approved,
    });
    if (error) throw new Error((error as { message?: string }).message ?? "Không cấp quyền được.");
    return { ok: true as const };
  });
