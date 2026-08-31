/**
 * Tìm kiếm toàn catalog THỰC HIỆN Ở DATABASE.
 *
 * Trước đây trang chủ phải tải toàn bộ cây catalog (categories + series + models +
 * products + videos) xuống trình duyệt chỉ để lọc bằng JavaScript. Từ nay mỗi lần
 * tìm kiếm chỉ chạy 4 truy vấn `ilike` có LIMIT, chỉ lấy đúng các cột hiển thị.
 *
 * - Không nạp video, không nạp giá nhập, không nạp specs/variants.
 * - Không N+1: quan hệ cha (đời xe → hãng xe) lấy kèm trong cùng một truy vấn.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "./catalog";
import { normalize, type SearchResult } from "./catalog.repository";

/** Giữ chuỗi select ở dạng `string` để TypeScript không phải phân tích kiểu (tăng tốc typecheck). */
const sel = (s: string): string => s;

export const SEARCH_MIN_LENGTH = 2;
const LIMIT_PER_LEVEL = 12;
const TOTAL_LIMIT = 30;

/** Thoát ký tự đặc biệt của `ilike` và bọc `%...%`. */
const like = (term: string) => `%${term.replace(/[%_,()]/g, " ").trim()}%`;

type CatRow = {
  id: string;
  slug: string;
  name: string;
  image_key: string | null;
  image_url: string | null;
};
type SeriesRow = CatRow & { categories: { slug: string; name: string } | null };
type ModelRow = {
  id: string;
  slug: string;
  name: string;
  years: string;
  image_key: string | null;
  image_url: string | null;
  series: { slug: string; name: string; categories: { slug: string } | null } | null;
};
type ProdRow = {
  id: string;
  name: string;
  brand: string;
  form_code: string;
  image_key: string | null;
  image_url: string | null;
  node_id: string | null;
  categories: { slug: string } | null;
  models: {
    slug: string;
    series: { slug: string; name: string; categories: { slug: string } | null } | null;
  } | null;
};

/**
 * Tìm kiếm ở database.
 * Hỗ trợ: hãng/nhóm (categories), đời xe (series), năm sản xuất (models),
 * sản phẩm (name, brand, mã form/SKU).
 */
export async function searchCatalogServer(query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < SEARCH_MIN_LENGTH) return [];
  const p = like(term);

  const [catsRes, seriesRes, modelsRes, prodsRes] = await Promise.all([
    supabase
      .from("categories")
      .select(sel("id, slug, name, image_key, image_url"))
      .ilike("name", p)
      .order("sort")
      .limit(LIMIT_PER_LEVEL)
      .returns<CatRow[]>(),
    supabase
      .from("series")
      .select(sel("id, slug, name, image_key, image_url, categories!inner(slug, name)"))
      .ilike("name", p)
      .order("sort")
      .limit(LIMIT_PER_LEVEL)
      .returns<SeriesRow[]>(),
    supabase
      .from("models")
      .select(
        sel(
          "id, slug, name, years, image_key, image_url, series!inner(slug, name, categories!inner(slug))",
        ),
      )
      .or(`name.ilike.${p},years.ilike.${p}`)
      .order("sort")
      .limit(LIMIT_PER_LEVEL)
      .returns<ModelRow[]>(),
    supabase
      .from("products")
      .select(
        sel(
          "id, name, brand, form_code, image_key, image_url, node_id, categories(slug), models(slug, series(slug, name, categories(slug)))",
        ),
      )
      .or(`name.ilike.${p},brand.ilike.${p},form_code.ilike.${p}`)
      .order("sort")
      .limit(LIMIT_PER_LEVEL)
      .returns<ProdRow[]>(),
  ]);

  const err = catsRes.error ?? seriesRes.error ?? modelsRes.error ?? prodsRes.error;
  if (err) throw new Error(err.message);

  const out: SearchResult[] = [];

  for (const c of catsRes.data ?? []) {
    out.push({
      id: `c-${c.slug}`,
      title: c.name,
      subtitle: "Hãng / nhóm phụ kiện",
      image: resolveImage(c.image_url, c.image_key),
      level: "category",
      params: { categoryId: c.slug },
    });
  }

  for (const s of seriesRes.data ?? []) {
    if (!s.categories) continue;
    out.push({
      id: `s-${s.categories.slug}-${s.slug}`,
      title: s.name,
      subtitle: `Đời xe · ${s.categories.name}`,
      image: resolveImage(s.image_url, s.image_key),
      level: "series",
      params: { categoryId: s.categories.slug, seriesId: s.slug },
    });
  }

  for (const m of modelsRes.data ?? []) {
    const catSlug = m.series?.categories?.slug;
    if (!catSlug || !m.series) continue;
    out.push({
      id: `m-${m.id}`,
      title: m.years ? `${m.name} · ${m.years}` : m.name,
      subtitle: `Năm sản xuất · ${m.series.name}`,
      image: resolveImage(m.image_url, m.image_key),
      level: "model",
      params: { categoryId: catSlug, seriesId: m.series.slug, modelId: m.slug },
    });
  }

  for (const pr of prodsRes.data ?? []) {
    const viaModel = pr.models?.series;
    const catSlug = viaModel?.categories?.slug ?? pr.categories?.slug;
    if (!catSlug) continue;
    out.push({
      id: `p-${pr.id}`,
      title: pr.name || pr.form_code || pr.brand || "Sản phẩm",
      subtitle: viaModel ? `Sản phẩm · ${viaModel.name}` : "Sản phẩm",
      image: resolveImage(pr.image_url, pr.image_key),
      level: "product",
      params: {
        categoryId: catSlug,
        ...(viaModel ? { seriesId: viaModel.slug } : {}),
        ...(pr.node_id ? { nodeId: pr.node_id } : {}),
        productId: pr.id,
      },
    });
  }

  // Ưu tiên: khớp đầu chuỗi trước, rồi theo tầng (hãng → đời xe → năm SX → sản phẩm).
  const q = normalize(term);
  const rank: Record<SearchResult["level"], number> = {
    category: 0,
    series: 1,
    model: 2,
    product: 3,
  };
  out.sort((a, b) => {
    const sa = normalize(a.title).startsWith(q) ? 0 : 1;
    const sb = normalize(b.title).startsWith(q) ? 0 : 1;
    return sa - sb || rank[a.level] - rank[b.level];
  });

  return out.slice(0, TOTAL_LIMIT);
}

/** Cache ngắn: gõ lại cùng từ khoá không bắn thêm request. */
export const searchQueryOptions = (term: string) =>
  queryOptions({
    queryKey: ["catalog", "search", term.trim().toLowerCase()],
    queryFn: () => searchCatalogServer(term),
    enabled: term.trim().length >= SEARCH_MIN_LENGTH,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
