/**
 * Nhập bảng giá từ file Excel.
 * Quy trình 2 bước: (1) đối chiếu với dữ liệu hiện có để biết dòng nào mới / dòng nào
 * đổi giá, (2) admin chọn từng mục muốn thêm hoặc cập nhật rồi mới ghi vào Cloud.
 */
import { supabase } from "@/integrations/supabase/client";
import { ensureDefaultModel, saveDealerPrice, toSlug } from "@/data/admin.api";
import type { PriceRow } from "@/lib/priceSheet";

export type ImportResult = { created: number; updated: number; skipped: number };

export type DiffStatus = "new" | "changed" | "same";

export type PriceDiff = {
  key: string;
  row: PriceRow;
  status: DiffStatus;
  productId: string | null;
  /** Giá đang có trên app (null nếu sản phẩm chưa tồn tại). */
  current: { price: number | null; salePrice: number | null; dealerPrice: number | null } | null;
  /** Danh sách thay đổi dạng chữ để hiển thị cho admin. */
  changes: string[];
};

const uniqueSlug = (base: string, taken: Set<string>) => {
  let slug = base || "muc";
  let i = 2;
  while (taken.has(slug)) slug = `${base}-${i++}`;
  taken.add(slug);
  return slug;
};

/** Gom các cách viết khác nhau của cùng một hãng về một khoá chung. */
const BRAND_ALIASES: Record<string, string> = {
  mercedesbenz: "mercedes",
  benz: "mercedes",
  mecedes: "mercedes",
  vinfastt: "vinfast",
  huyndai: "hyundai",
  vw: "volkswagen",
  landrover: "land rover",
};

const brandKey = (name: string) => {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return BRAND_ALIASES[base] ?? base;
};

type Caches = {
  cat: Map<string, string>;
  catSlugs: Set<string>;
  ser: Map<string, string>;
  serSlugs: Set<string>;
  model: Map<string, string>;
  /** modelId|tên sản phẩm (thường) -> product id */
  product: Map<string, string>;
  dealer: Map<string, number | null>;
  price: Map<string, { price: number | null; salePrice: number | null }>;
};

async function loadCaches(): Promise<Caches> {
  const [cats, sers, models, prods, dealers] = await Promise.all([
    supabase.from("categories").select("id, name, slug"),
    supabase.from("series").select("id, category_id, name, slug"),
    supabase.from("models").select("id, series_id, sort"),
    supabase.from("products").select("id, name, model_id, price, sale_price"),
    supabase.from("product_dealer_prices").select("product_id, dealer_price"),
  ]);
  const err = cats.error ?? sers.error ?? models.error ?? prods.error;
  if (err) throw new Error(err.message);

  const c: Caches = {
    cat: new Map(),
    catSlugs: new Set(),
    ser: new Map(),
    serSlugs: new Set(),
    model: new Map(),
    product: new Map(),
    dealer: new Map(),
    price: new Map(),
  };

  for (const x of cats.data ?? []) {
    const k = brandKey(x.name);
    if (!c.cat.has(k)) c.cat.set(k, x.id);
    c.catSlugs.add(x.slug);
  }
  for (const x of sers.data ?? []) {
    const k = `${x.category_id}|${brandKey(x.name)}`;
    if (!c.ser.has(k)) c.ser.set(k, x.id);
    c.serSlugs.add(x.slug);
  }
  const sorted = [...(models.data ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  for (const x of sorted) if (!c.model.has(x.series_id)) c.model.set(x.series_id, x.id);
  for (const p of prods.data ?? []) {
    if (!p.model_id) continue;
    c.product.set(`${p.model_id}|${p.name.toLowerCase()}`, p.id);
    c.price.set(p.id, { price: p.price ?? null, salePrice: p.sale_price ?? null });
  }
  for (const d of dealers.data ?? []) c.dealer.set(d.product_id, d.dealer_price ?? null);
  return c;
}

/** Đối chiếu các dòng Excel với dữ liệu hiện tại để admin xem trước thay đổi. */
export async function analyzePriceRows(rows: PriceRow[]): Promise<PriceDiff[]> {
  const c = await loadCaches();
  const out: PriceDiff[] = [];

  rows.forEach((row, i) => {
    const catId = c.cat.get(brandKey(row.brand));
    const serId = catId ? c.ser.get(`${catId}|${brandKey(row.model)}`) : undefined;
    const modelId = serId ? c.model.get(serId) : undefined;
    const productId = modelId
      ? (c.product.get(`${modelId}|${row.productName.toLowerCase()}`) ?? null)
      : null;

    if (!productId) {
      out.push({
        key: `${i}`,
        row,
        status: "new",
        productId: null,
        current: null,
        changes: [],
      });
      return;
    }

    const cur = c.price.get(productId) ?? { price: null, salePrice: null };
    const dealer = c.dealer.get(productId) ?? null;
    const changes: string[] = [];
    if (cur.price !== row.price) changes.push("Giá niêm yết");
    if ((cur.salePrice ?? null) !== (row.salePrice ?? null)) changes.push("Giá khuyến mãi");
    if (row.dealerPrice !== null && dealer !== row.dealerPrice) changes.push("Giá nhập");

    out.push({
      key: `${i}`,
      row,
      status: changes.length > 0 ? "changed" : "same",
      productId,
      current: { price: cur.price, salePrice: cur.salePrice, dealerPrice: dealer },
      changes,
    });
  });

  return out;
}

async function ensureCategory(name: string, c: Caches) {
  const key = brandKey(name);
  const hit = c.cat.get(key);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug: uniqueSlug(toSlug(name), c.catSlugs), icon: "car" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  c.cat.set(key, data.id);
  return data.id as string;
}

async function ensureSeries(categoryId: string, name: string, c: Caches) {
  const key = `${categoryId}|${brandKey(name)}`;
  const hit = c.ser.get(key);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("series")
    .insert({ category_id: categoryId, name, slug: uniqueSlug(toSlug(name), c.serSlugs) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  c.ser.set(key, data.id);
  return data.id as string;
}

/** Ghi vào Cloud đúng những mục admin đã chọn. */
export async function applyPriceRows(
  items: PriceDiff[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const c = await loadCaches();
  const result: ImportResult = { created: 0, updated: 0, skipped: 0 };

  for (let i = 0; i < items.length; i++) {
    const { row } = items[i]!;
    const categoryId = await ensureCategory(row.brand, c);
    const seriesId = await ensureSeries(categoryId, row.model, c);
    let modelId = c.model.get(seriesId);
    if (!modelId) {
      modelId = await ensureDefaultModel(seriesId, row.model);
      c.model.set(seriesId, modelId);
    }

    const values = {
      name: row.productName,
      price: row.price,
      sale_price: row.salePrice,
      form_code: row.model.slice(0, 80),
    };
    const existing = c.product.get(`${modelId}|${row.productName.toLowerCase()}`);

    if (existing) {
      const { error } = await supabase.from("products").update(values).eq("id", existing);
      if (error) throw new Error(error.message);
      if (row.dealerPrice !== null) await saveDealerPrice(existing, row.dealerPrice);
      result.updated++;
    } else {
      const { data, error } = await supabase
        .from("products")
        .insert({ ...values, model_id: modelId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      c.product.set(`${modelId}|${row.productName.toLowerCase()}`, data.id);
      if (row.dealerPrice !== null) await saveDealerPrice(data.id, row.dealerPrice);
      result.created++;
    }
    onProgress?.(i + 1, items.length);
  }

  return result;
}
