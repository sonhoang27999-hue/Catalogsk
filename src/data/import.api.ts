/**
 * Nhập bảng giá từ file Excel: tự tạo hãng xe, đời xe (năm sản xuất)
 * và thêm mới / ghi đè sản phẩm kèm 3 mức giá.
 */
import { supabase } from "@/integrations/supabase/client";
import { ensureDefaultModel, saveDealerPrice, toSlug } from "@/data/admin.api";
import type { PriceRow } from "@/lib/priceSheet";

/**
 * overwrite   = trùng tên thì ghi đè giá
 * insert-only = chỉ thêm sản phẩm chưa có trên app, bỏ qua sản phẩm trùng
 */
export type ImportMode = "overwrite" | "insert-only";

export type ImportResult = { created: number; updated: number; skipped: number };

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

async function ensureCategory(name: string, cache: Map<string, string>, slugs: Set<string>) {
  const key = brandKey(name);
  const hit = cache.get(key);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("categories")
    .insert({ name, slug: uniqueSlug(toSlug(name), slugs), icon: "car" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  cache.set(key, data.id);
  return data.id as string;
}

async function ensureSeries(
  categoryId: string,
  name: string,
  cache: Map<string, string>,
  slugs: Set<string>,
) {
  const key = `${categoryId}|${brandKey(name)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const { data, error } = await supabase
    .from("series")
    .insert({ category_id: categoryId, name, slug: uniqueSlug(toSlug(name), slugs) })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  cache.set(key, data.id);
  return data.id as string;
}

export async function importPriceRows(
  rows: PriceRow[],
  mode: ImportMode,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const [cats, sers, prods] = await Promise.all([
    supabase.from("categories").select("id, name, slug"),
    supabase.from("series").select("id, category_id, name, slug"),
    supabase.from("products").select("id, name, model_id"),
  ]);
  const err = cats.error ?? sers.error ?? prods.error;
  if (err) throw new Error(err.message);

  const catCache = new Map<string, string>();
  const catSlugs = new Set<string>();
  for (const c of cats.data ?? []) {
    const k = brandKey(c.name);
    if (!catCache.has(k)) catCache.set(k, c.id);
    catSlugs.add(c.slug);
  }
  const serCache = new Map<string, string>();
  const serSlugs = new Set<string>();
  for (const s of sers.data ?? []) {
    const k = `${s.category_id}|${brandKey(s.name)}`;
    if (!serCache.has(k)) serCache.set(k, s.id);
    serSlugs.add(s.slug);
  }
  const productKey = new Map<string, string>();
  for (const p of prods.data ?? []) {
    if (p.model_id) productKey.set(`${p.model_id}|${p.name.toLowerCase()}`, p.id);
  }

  const modelCache = new Map<string, string>();
  const result: ImportResult = { created: 0, updated: 0, skipped: 0 };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const categoryId = await ensureCategory(row.brand, catCache, catSlugs);
    const seriesId = await ensureSeries(categoryId, row.model, serCache, serSlugs);
    let modelId = modelCache.get(seriesId);
    if (!modelId) {
      modelId = await ensureDefaultModel(seriesId, row.model);
      modelCache.set(seriesId, modelId);
    }

    const values = {
      name: row.productName,
      price: row.price,
      sale_price: row.salePrice,
      form_code: row.model.slice(0, 80),
    };
    const existing = productKey.get(`${modelId}|${row.productName.toLowerCase()}`);

    if (existing) {
      if (mode === "insert-only") {
        result.skipped++;
        onProgress?.(i + 1, rows.length);
        continue;
      }
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
      productKey.set(`${modelId}|${row.productName.toLowerCase()}`, data.id);
      if (row.dealerPrice !== null) await saveDealerPrice(data.id, row.dealerPrice);
      result.created++;
    }
    onProgress?.(i + 1, rows.length);
  }

  return result;
}
