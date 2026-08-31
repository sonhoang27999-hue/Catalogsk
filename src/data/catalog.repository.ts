/**
 * Tiện ích dùng chung cho catalog: chuẩn hoá chuỗi, định dạng giá, bộ lọc năm SX/nhóm.
 * Dữ liệu được nạp theo phạm vi ở `catalog.queries.ts`; tìm kiếm chạy ở database
 * (`search.queries.ts`) — KHÔNG còn tải toàn bộ cây catalog xuống trình duyệt.
 */
import type { Category } from "./catalog";

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
  params: {
    categoryId: string;
    seriesId?: string;
    modelId?: string;
    nodeId?: string;
    productId?: string;
  };
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
