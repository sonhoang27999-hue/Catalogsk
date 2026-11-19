/**
 * Thông tin tư vấn riêng của đại lý cấp 1 (bảng dealer_profiles trên Cloud).
 * Khách vãng lai không đọc thẳng bảng; mọi tra cứu đi qua hàm bảo mật trên Cloud.
 */
import { supabase } from "@/integrations/supabase/client";

/** Thông tin hiển thị cho người xem catalog. */
export type DealerContact = {
  code: string;
  shopName: string;
  phone: string;
  zalo: string;
  /** Ghi chú cuối trang sản phẩm; rỗng nếu đại lý chưa đặt hoặc người xem chưa đăng nhập. */
  note: string;
};

/** Bản ghi đầy đủ để đại lý cấp 1 / quản trị viên chỉnh sửa. */
export type DealerProfile = {
  userId: string;
  code: string;
  shopName: string;
  phone: string;
  zalo: string;
  productNote: string;
  active: boolean;
};

export type DealerProfileInput = Omit<DealerProfile, "active"> & { active?: boolean };

type Rpc = (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

// Các hàm/bảng mới chưa có trong types.ts tự sinh nên gọi qua kiểu lỏng.
const rpc: Rpc = (fn, args) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (supabase.rpc as any)(fn, args);

const text = (value: unknown) => (typeof value === "string" ? value : "");

function toContact(data: unknown): DealerContact | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const code = text(row["code"]);
  const phone = text(row["phone"]);
  if (!code || !phone) return null;
  return {
    code,
    phone,
    zalo: text(row["zalo"]) || phone,
    shopName: text(row["shop_name"]),
    note: text(row["note"]),
  };
}

function toProfile(data: unknown): DealerProfile | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  const userId = text(row["user_id"]);
  if (!userId) return null;
  return {
    userId,
    code: text(row["code"]),
    shopName: text(row["shop_name"]),
    phone: text(row["phone"]),
    zalo: text(row["zalo"]),
    productNote: text(row["product_note"]),
    active: row["active"] !== false,
  };
}

async function contactFrom(fn: string, args?: Record<string, unknown>) {
  const { data, error } = await rpc(fn, args);
  if (error) throw new Error(error.message);
  return toContact(data);
}

/** Tra theo mã trên link đại lý. */
export const fetchDealerContactByCode = (code: string) =>
  contactFrom("get_dealer_contact", { _code: code });

/** Theo tài khoản đang đăng nhập: chính đại lý cấp 1, hoặc đại lý cấp 1 đã tạo tài khoản này. */
export const fetchMyDealerContact = () => contactFrom("get_my_dealer_contact");

/** Theo danh sách "Gửi khách": chỉ có khi người tạo danh sách là đại lý cấp 1. */
export const fetchShareDealerContact = (shareId: string) =>
  contactFrom("get_share_dealer_contact", { _id: shareId });

/** Đọc bản ghi để sửa (đại lý cấp 1 chỉ đọc được của mình; quản trị viên đọc được tất cả). */
export async function fetchDealerProfile(userId: string): Promise<DealerProfile | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("dealer_profiles" as any) as any)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return toProfile(data);
}

/** Lưu thông tin tư vấn. `active` chỉ có tác dụng khi người gọi là quản trị viên. */
export async function saveDealerProfile(input: DealerProfileInput): Promise<DealerProfile> {
  const { data, error } = await rpc("save_dealer_profile", {
    _user_id: input.userId,
    _code: input.code,
    _shop_name: input.shopName,
    _phone: input.phone,
    _zalo: input.zalo,
    _product_note: input.productNote,
    _active: input.active ?? null,
  });
  if (error) throw new Error(error.message);
  const saved = toProfile(data);
  if (!saved) throw new Error("Không lưu được thông tin đại lý.");
  return saved;
}
