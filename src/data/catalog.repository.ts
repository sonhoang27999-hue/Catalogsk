/**
 * Lớp truy vấn dữ liệu (data access layer) — thao tác trên cây catalog đã nạp từ Lovable Cloud.
 * Xem `src/data/catalog.api.ts` để biết cách nạp dữ liệu.
 */
import type { Category, Model, Product, Series } from "./catalog";

export const getCategory = (catalog: Category[], categoryId: string): Category | undefined =>
  catalog.find((c) => c.id === categoryId);

export const getSeries = (
  catalog: Category[],
  categoryId: string,
  seriesId: string,
): { category: Category; series: Series } | undefined => {
  const category = getCategory(catalog, categoryId);
  const series = category?.series.find((s) => s.id === seriesId);
  return category && series ? { category, series } : undefined;
};

export const getModel = (
  catalog: Category[],
  categoryId: string,
  seriesId: string,
  modelId: string,
): { category: Category; series: Series; model: Model } | undefined => {
  const found = getSeries(catalog, categoryId, seriesId);
  const model = found?.series.models.find((m) => m.id === modelId);
  return found && model ? { ...found, model } : undefined;
};

export type ProductLocation = {
  category: Category;
  series: Series;
  model: Model;
  product: Product;
};

export const getProduct = (catalog: Category[], productId: string): ProductLocation | undefined => {
  for (const category of catalog) {
    for (const series of category.series) {
      for (const model of series.models) {
        const product = model.products.find((p) => p.id === productId);
        if (product) return { category, series, model, product };
      }
    }
  }
  return undefined;
};

export const formatPrice = (value: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

/* -------------------------------------------------------------------------- */
/* Tìm kiếm & lọc                                                             */
/* -------------------------------------------------------------------------- */

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .trim();

export type SearchResult = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  level: "category" | "series" | "model" | "product";
  params: { categoryId: string; seriesId?: string; modelId?: string; productId?: string };
};

/** Tìm kiếm xuyên 4 tầng (hãng xe, đời xe, năm sản xuất, sản phẩm). */
export const searchCatalog = (catalog: Category[], query: string, limit = 24): SearchResult[] => {
  const q = normalize(query);
  if (!q) return [];
  const out: SearchResult[] = [];
  const hit = (text: string) => normalize(text).includes(q);

  for (const category of catalog) {
    if (hit(category.name)) {
      out.push({
        id: `c-${category.id}`,
        title: category.name,
        subtitle: "Hãng / nhóm phụ kiện",
        image: category.image,
        level: "category",
        params: { categoryId: category.id },
      });
    }
    for (const series of category.series) {
      if (hit(series.name)) {
        out.push({
          id: `s-${category.id}-${series.id}`,
          title: series.name,
          subtitle: `Đời xe · ${category.name}`,
          image: series.image,
          level: "series",
          params: { categoryId: category.id, seriesId: series.id },
        });
      }
      for (const model of series.models) {
        for (const product of model.products) {
          if (hit(product.name) || hit(product.brand)) {
            out.push({
              id: `p-${product.id}`,
              title: product.name,
              subtitle: `Sản phẩm · ${series.name}`,
              image: product.image,
              level: "product",
              params: {
                categoryId: category.id,
                seriesId: series.id,
                productId: product.id,
              },
            });
          }
        }
      }
    }
  }
  return out.slice(0, limit);
};

/** Tách năm bắt đầu / kết thúc từ chuỗi kiểu "2014-2021" hoặc "2018-Nay". */
export const parseYears = (years: string): { from: number; to: number } | null => {
  const nums = years.match(/\d{4}/g)?.map(Number) ?? [];
  const first = nums[0];
  if (first === undefined) return null;
  const isNow = /nay/i.test(years);
  return { from: first, to: isNow ? new Date().getFullYear() : (nums[1] ?? first) };
};

/** Các mốc năm sản xuất dùng cho bộ lọc ở tầng 3. */
export const YEAR_BUCKETS = [
  { id: "all", label: "Tất cả" },
  { id: "2020", label: "Từ 2020" },
  { id: "2015", label: "2015 - 2019" },
  { id: "old", label: "Trước 2015" },
] as const;

export type YearBucketId = (typeof YEAR_BUCKETS)[number]["id"];

export const matchYearBucket = (years: string, bucket: YearBucketId): boolean => {
  if (bucket === "all") return true;
  const parsed = parseYears(years);
  if (!parsed) return false;
  const { from, to } = parsed;
  if (bucket === "2020") return to >= 2020;
  if (bucket === "2015") return to >= 2015 && from <= 2019;
  return from < 2015;
};

/** Nhóm danh mục ở trang chủ: hãng xe vs nhóm phụ kiện. */
export const CATEGORY_GROUPS = [
  { id: "all", label: "Tất cả" },
  { id: "brand", label: "Hãng xe" },
  { id: "accessory", label: "Nhóm phụ kiện" },
] as const;

export type CategoryGroupId = (typeof CATEGORY_GROUPS)[number]["id"];

export const matchCategoryGroup = (category: Category, group: CategoryGroupId) =>
  group === "all" ? true : group === "brand" ? category.icon === "car" : category.icon !== "car";
