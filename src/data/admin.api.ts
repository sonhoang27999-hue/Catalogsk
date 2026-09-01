/**
 * Truy vấn CRUD dùng cho trang quản trị (/admin).
 * Chỉ tài khoản có vai trò admin mới ghi được (kiểm soát bằng chính sách bảo mật trên Cloud).
 */
import { supabase } from "@/integrations/supabase/client";

export type CategoryRow = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image_key: string | null;
  image_url: string | null;
  sort: number;
};

export type SeriesRow = {
  id: string;
  category_id: string;
  slug: string;
  name: string;
  image_key: string | null;
  image_url: string | null;
  sort: number;
};

export type ModelRow = {
  id: string;
  series_id: string;
  slug: string;
  name: string;
  years: string;
  image_key: string | null;
  image_url: string | null;
  sort: number;
};

export type ProductRow = {
  id: string;
  model_id: string;
  name: string;
  form_code: string;
  image_key: string | null;
  image_url: string | null;
  price: number;
  sale_price: number | null;
  install_price: number | null;
  price_note: string | null;
  description: string | null;
  brand: string;
  origin: string;
  video_url: string | null;
  sort: number;
};

/** Chuẩn hoá tên thành slug (không dấu) để làm mã đường dẫn. */
export const toSlug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const unwrap = <T>(res: { data: T | null; error: { message: string } | null }): T => {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
};

export const listCategories = async () =>
  unwrap(await supabase.from("categories").select("*").order("sort")) as CategoryRow[];

export const listSeries = async () =>
  unwrap(await supabase.from("series").select("*").order("sort")) as SeriesRow[];

export const listModels = async () =>
  unwrap(await supabase.from("models").select("*").order("sort")) as ModelRow[];

export const listProducts = async () =>
  unwrap(
    await supabase.from("products").select("*").order("created_at", { ascending: false }),
  ) as ProductRow[];

type Table = "categories" | "series" | "models" | "products" | "nodes" | "videos";

export const saveRow = async (table: Table, id: string | null, values: Record<string, unknown>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from(table) as any;
  const res = id ? await query.update(values).eq("id", id) : await query.insert(values);
  if (res.error) throw new Error(res.error.message);
};

export const deleteRow = async (table: Table, id: string) => {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw new Error(error.message);
};

/** Kiểm tra người dùng hiện tại có phải admin không. */
export const checkIsAdmin = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
};

/** Lưu giá nhập vào bảng riêng (chỉ admin ghi được). */
export const saveDealerPrice = async (productId: string, dealerPrice: number | null) => {
  const { error } = await supabase
    .from("product_dealer_prices")
    .upsert({ product_id: productId, dealer_price: dealerPrice });
  if (error) throw new Error(error.message);
};

/** Thêm sản phẩm và trả về id vừa tạo. */
export const insertProduct = async (values: Record<string, unknown>) => {
  const { data, error } = await supabase
    .from("products")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert(values as any)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
};

/** Di chuyển sản phẩm sang mục (node), đời xe (model) hoặc gốc của hãng xe. */
export const moveProduct = async (
  productId: string,
  target: { nodeDbId?: string | null; categoryDbId?: string | null; modelDbId?: string | null },
) => {
  const patch = target.nodeDbId
    ? { node_id: target.nodeDbId, category_id: null, model_id: null }
    : target.modelDbId
      ? { node_id: null, category_id: null, model_id: target.modelDbId }
      : { node_id: null, category_id: target.categoryDbId ?? null, model_id: null };
  const { error } = await supabase.from("products").update(patch).eq("id", productId);
  if (error) throw new Error(error.message);
};

/** Đổi thứ tự hiển thị của một bản ghi. */
export const setSort = async (table: Table, id: string, sort: number) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query = supabase.from(table) as any;
  const { error } = await query.update({ sort }).eq("id", id);
  if (error) throw new Error(error.message);
};

/** Kiểm tra người dùng có quyền xem giá nhập không (admin hoặc price_viewer). */
export const checkCanViewDealerPrice = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "price_viewer"]);
  if (error) return false;
  return (data ?? []).length > 0;
};

/** Kiểm tra người dùng có phải quản trị viên (manager) không. */
export const checkIsManager = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "manager")
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
};

/** Kiểm tra người dùng có phải đại lý cấp 1 không (được tạo tài khoản đại lý). */
export const checkIsDealer1 = async (userId: string) => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "dealer1")
    .maybeSingle();
  if (error) return false;
  return Boolean(data);
};

/** Danh sách email đang được cấp quyền xem giá nhập (chỉ admin gọi được). */
export const listPriceViewers = async () => {
  const { data, error } = await supabase.rpc("list_price_viewers");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { email: string }) => r.email);
};

/** Cấp hoặc thu hồi quyền xem giá nhập theo email. */
export const setPriceViewer = async (email: string, enabled: boolean) => {
  const { error } = await supabase.rpc("set_price_viewer", { _email: email, _enabled: enabled });
  if (error) throw new Error(error.message);
};

/** Thêm một mục trong "Cấu trúc cây linh hoạt" và trả về id vừa tạo. */
export const insertNode = async (values: {
  category_id: string;
  parent_id: string | null;
  name: string;
  image_url: string | null;
}) => {
  const { data, error } = await supabase.from("nodes").insert(values).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
};

/** Thêm video riêng (không gắn sản phẩm) vào một đời xe (model). */
export const insertVideo = async (values: { model_id: string; title: string; url: string }) => {
  const { data, error } = await supabase.from("videos").insert(values).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
};

/** Tạo nhanh một "năm sản xuất" mặc định khi đời xe chưa có mục con nào. */
export const ensureDefaultModel = async (seriesDbId: string, seriesName: string) => {
  const existing = await supabase
    .from("models")
    .select("id")
    .eq("series_id", seriesDbId)
    .order("sort")
    .limit(1)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data.id as string;

  const { data, error } = await supabase
    .from("models")
    .insert({
      series_id: seriesDbId,
      name: seriesName.slice(0, 120),
      slug: `${toSlug(seriesName).slice(0, 60)}-all`,
      years: "—",
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id as string;
};
