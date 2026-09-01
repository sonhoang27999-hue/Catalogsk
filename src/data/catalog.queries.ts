/**
 * Truy vấn catalog theo PHẠM VI (scoped queries).
 *
 * Trước đây mọi trang đều nạp toàn bộ catalog (`catalogQueryOptions`).
 * Từ nay mỗi trang chỉ nạp đúng dữ liệu mình cần:
 *   - Trang chủ: chỉ danh sách hãng xe (categories).
 *   - Trang hãng xe: series + nodes gốc + sản phẩm gắn thẳng vào hãng.
 *   - Trang đời xe (series): models + products + videos của đúng series đó.
 *   - Trang node: cây nodes của hãng (nhẹ) + sản phẩm của đúng node đó.
 *
 * Kiểu dữ liệu trả về vẫn là `Category / Series / Model / Product / CatalogNode`
 * như cũ để không phải sửa giao diện.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveImage,
  type CatalogNode,
  type Category,
  type Model,
  type Product,
  type Series,
  type Spec,
  type Variant,
  type Video,
} from "./catalog";

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** Chỉ lấy đúng các cột giao diện dùng tới. */
const CATEGORY_COLS = "id, slug, name, icon, image_key, image_url, sort, layout";
const SERIES_COLS = "id, category_id, slug, name, image_key, image_url, sort";
const MODEL_COLS = "id, series_id, slug, name, years, image_key, image_url, sort";
const NODE_COLS = "id, category_id, parent_id, name, image_url, sort";
const PRODUCT_COLS =
  "id, model_id, node_id, category_id, name, form_code, image_key, image_url, price, sale_price, install_price, price_note, description, brand, origin, video_url, detail_url, specs, variants, sort";

/* -------------------------------------------------------------------------- */
/* Query keys                                                                 */
/* -------------------------------------------------------------------------- */

export const catalogKeys = {
  /** Gốc: dùng để invalidate toàn bộ catalog khi cần. */
  all: ["catalog"] as const,
  categories: ["catalog", "categories"] as const,
  categoryRoot: ["catalog", "category"] as const,
  category: (slug: string) => ["catalog", "category", slug] as const,
  seriesRoot: ["catalog", "series"] as const,
  series: (categorySlug: string, seriesSlug: string) =>
    ["catalog", "series", categorySlug, seriesSlug] as const,
  nodeRoot: ["catalog", "node"] as const,
  node: (categorySlug: string, nodeId: string) =>
    ["catalog", "node", categorySlug, nodeId] as const,
  dealerPrices: ["dealer-prices"] as const,
};

/* -------------------------------------------------------------------------- */
/* Mapping row -> type                                                        */
/* -------------------------------------------------------------------------- */

type ProductRowLite = {
  id: string;
  name: string;
  form_code: string;
  image_key: string | null;
  image_url: string | null;
  price: number | string | null;
  sale_price: number | string | null;
  install_price: number | string | null;
  price_note: string | null;
  description: string | null;
  brand: string;
  origin: string;
  video_url: string | null;
  detail_url?: string | null;
  specs: unknown;
  variants: unknown;
};

const toProduct = (p: ProductRowLite): Product => ({
  id: p.id,
  dbId: p.id,
  name: p.name,
  formCode: p.form_code,
  image: resolveImage(p.image_url, p.image_key),
  price: Number(p.price ?? 0),
  salePrice: p.sale_price === null || p.sale_price === undefined ? null : Number(p.sale_price),
  // Giá nhập luôn được nạp riêng ở client (xem `useDealerPrices`) vì phụ thuộc quyền.
  dealerPrice: null,
  installPrice:
    p.install_price === null || p.install_price === undefined ? null : Number(p.install_price),
  priceNote: p.price_note,
  description: p.description,
  brand: p.brand,
  origin: p.origin,
  videoUrl: p.video_url,
  detailUrl: p.detail_url ?? null,
  specs: asArray<Spec>(p.specs),
  variants: asArray<Variant>(p.variants),
});

type CategoryRowLite = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  image_key: string | null;
  image_url: string | null;
  layout: string;
};

const toCategory = (
  c: CategoryRowLite,
  extra: { series?: Series[]; nodes?: CatalogNode[]; rootProducts?: Product[] } = {},
): Category => ({
  id: c.slug,
  dbId: c.id,
  name: c.name,
  icon: c.icon,
  image: resolveImage(c.image_url, c.image_key),
  layout: (c.layout === "tree" ? "tree" : "classic") as "tree" | "classic",
  series: extra.series ?? [],
  nodes: extra.nodes ?? [],
  rootProducts: extra.rootProducts ?? [],
});

type NodeRowLite = {
  id: string;
  parent_id: string | null;
  name: string;
  image_url: string | null;
};

/** Dựng cây nodes (chỉ tên/ảnh, sản phẩm nạp riêng theo từng tầng). */
const buildNodeTree = (rows: NodeRowLite[]) => {
  const childrenOf = new Map<string | null, NodeRowLite[]>();
  for (const n of rows) {
    const list = childrenOf.get(n.parent_id) ?? [];
    list.push(n);
    childrenOf.set(n.parent_id, list);
  }
  const build = (n: NodeRowLite): CatalogNode => ({
    id: n.id,
    name: n.name,
    image: resolveImage(n.image_url, null),
    children: (childrenOf.get(n.id) ?? []).map(build),
    products: [],
  });
  return (childrenOf.get(null) ?? []).map(build);
};

const findInTree = (
  nodes: CatalogNode[],
  id: string,
  depth = 1,
): { node: CatalogNode; depth: number } | undefined => {
  for (const n of nodes) {
    if (n.id === id) return { node: n, depth };
    const hit = findInTree(n.children, id, depth + 1);
    if (hit) return hit;
  }
  return undefined;
};

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

/* -------------------------------------------------------------------------- */
/* Fetchers                                                                   */
/* -------------------------------------------------------------------------- */

/** Trang chủ: chỉ danh sách hãng xe. */
export async function fetchCategories(): Promise<Category[]> {
  const res = await supabase.from("categories").select(CATEGORY_COLS).order("sort");
  fail(res.error);
  return (res.data ?? []).map((c) => toCategory(c as CategoryRowLite));
}

async function fetchCategoryRow(slug: string): Promise<CategoryRowLite | null> {
  const res = await supabase
    .from("categories")
    .select(CATEGORY_COLS)
    .eq("slug", slug)
    .maybeSingle();
  fail(res.error);
  return (res.data as CategoryRowLite | null) ?? null;
}

/** Trang hãng xe: series + cây nodes + sản phẩm gắn thẳng vào hãng. */
export async function fetchCategoryDetail(slug: string): Promise<Category | null> {
  const row = await fetchCategoryRow(slug);
  if (!row) return null;

  const [seriesRes, nodesRes, rootProductsRes] = await Promise.all([
    supabase.from("series").select(SERIES_COLS).eq("category_id", row.id).order("sort"),
    supabase.from("nodes").select(NODE_COLS).eq("category_id", row.id).order("sort"),
    supabase
      .from("products")
      .select(PRODUCT_COLS)
      .eq("category_id", row.id)
      .is("node_id", null)
      .order("sort"),
  ]);
  fail(seriesRes.error ?? nodesRes.error ?? rootProductsRes.error);

  const series: Series[] = (seriesRes.data ?? []).map((s) => ({
    id: s.slug,
    dbId: s.id,
    name: s.name,
    image: resolveImage(s.image_url, s.image_key),
    models: [],
  }));

  return toCategory(row, {
    series,
    nodes: buildNodeTree((nodesRes.data ?? []) as NodeRowLite[]),
    rootProducts: (rootProductsRes.data ?? []).map((p) => toProduct(p as ProductRowLite)),
  });
}

/** Trang đời xe: models + products + videos của đúng series đó. */
export async function fetchSeriesDetail(
  categorySlug: string,
  seriesSlug: string,
): Promise<{ category: Category; series: Series } | null> {
  const row = await fetchCategoryRow(categorySlug);
  if (!row) return null;

  const seriesRes = await supabase
    .from("series")
    .select(SERIES_COLS)
    .eq("category_id", row.id)
    .eq("slug", seriesSlug)
    .maybeSingle();
  fail(seriesRes.error);
  const s = seriesRes.data;
  if (!s) return null;

  const modelsRes = await supabase
    .from("models")
    .select(MODEL_COLS)
    .eq("series_id", s.id)
    .order("sort");
  fail(modelsRes.error);
  const modelRows = modelsRes.data ?? [];
  const modelIds = modelRows.map((m) => m.id);

  // Không N+1: lấy toàn bộ products/videos của các model bằng 2 truy vấn `in(...)`.
  const [productsRes, videosRes] = await Promise.all([
    modelIds.length
      ? supabase.from("products").select(PRODUCT_COLS).in("model_id", modelIds).order("sort")
      : Promise.resolve({ data: [], error: null }),
    modelIds.length
      ? supabase
          .from("videos")
          .select("id, model_id, title, url, sort")
          .in("model_id", modelIds)
          .order("sort")
      : Promise.resolve({ data: [], error: null }),
  ]);
  fail(productsRes.error ?? videosRes.error);

  const productsByModel = new Map<string, Product[]>();
  for (const p of (productsRes.data ?? []) as (ProductRowLite & { model_id: string | null })[]) {
    if (!p.model_id) continue;
    const list = productsByModel.get(p.model_id) ?? [];
    list.push(toProduct(p));
    productsByModel.set(p.model_id, list);
  }
  const videosByModel = new Map<string, Video[]>();
  for (const v of (videosRes.data ?? []) as {
    id: string;
    model_id: string;
    title: string;
    url: string;
  }[]) {
    const list = videosByModel.get(v.model_id) ?? [];
    list.push({ id: v.id, dbId: v.id, title: v.title, url: v.url });
    videosByModel.set(v.model_id, list);
  }

  const models: Model[] = modelRows.map((m) => ({
    id: m.slug,
    dbId: m.id,
    name: m.name,
    years: m.years,
    image: resolveImage(m.image_url, m.image_key),
    products: productsByModel.get(m.id) ?? [],
    videos: videosByModel.get(m.id) ?? [],
  }));

  const series: Series = {
    id: s.slug,
    dbId: s.id,
    name: s.name,
    image: resolveImage(s.image_url, s.image_key),
    models,
  };

  return { category: toCategory(row, { series: [series] }), series };
}

/** Trang node: cây nodes của hãng (nhẹ) + sản phẩm của đúng node đang xem. */
export async function fetchNodeDetail(
  categorySlug: string,
  nodeId: string,
): Promise<{ category: Category; node: CatalogNode; depth: number } | null> {
  const row = await fetchCategoryRow(categorySlug);
  if (!row) return null;

  const [nodesRes, productsRes] = await Promise.all([
    supabase.from("nodes").select(NODE_COLS).eq("category_id", row.id).order("sort"),
    supabase.from("products").select(PRODUCT_COLS).eq("node_id", nodeId).order("sort"),
  ]);
  fail(nodesRes.error ?? productsRes.error);

  const tree = buildNodeTree((nodesRes.data ?? []) as NodeRowLite[]);
  const hit = findInTree(tree, nodeId);
  if (!hit) return null;

  const node: CatalogNode = {
    ...hit.node,
    products: (productsRes.data ?? []).map((p) => toProduct(p as ProductRowLite)),
  };

  return { category: toCategory(row, { nodes: tree }), node, depth: hit.depth };
}

/* -------------------------------------------------------------------------- */
/* Query options                                                              */
/* -------------------------------------------------------------------------- */

/** Dữ liệu điều hướng ít đổi → cache lâu hơn. */
const NAV_CACHE = { staleTime: 5 * 60_000, gcTime: 30 * 60_000 };
/** Dữ liệu sản phẩm đổi nhiều hơn (admin sửa) → cache ngắn hơn. */
const CONTENT_CACHE = { staleTime: 60_000, gcTime: 15 * 60_000 };

export const categoriesQueryOptions = queryOptions({
  queryKey: catalogKeys.categories,
  queryFn: fetchCategories,
  ...NAV_CACHE,
});

export const categoryQueryOptions = (slug: string) =>
  queryOptions({
    queryKey: catalogKeys.category(slug),
    queryFn: () => fetchCategoryDetail(slug),
    ...CONTENT_CACHE,
  });

export const seriesQueryOptions = (categorySlug: string, seriesSlug: string) =>
  queryOptions({
    queryKey: catalogKeys.series(categorySlug, seriesSlug),
    queryFn: () => fetchSeriesDetail(categorySlug, seriesSlug),
    ...CONTENT_CACHE,
  });

export const nodeQueryOptions = (categorySlug: string, nodeId: string) =>
  queryOptions({
    queryKey: catalogKeys.node(categorySlug, nodeId),
    queryFn: () => fetchNodeDetail(categorySlug, nodeId),
    ...CONTENT_CACHE,
  });
