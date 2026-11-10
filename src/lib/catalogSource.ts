/**
 * Gắn tham số `nguon=catalog` vào link sang website chính sklight.vn
 * để web chính đếm được khách đến từ catalog.
 *
 * Chỉ áp dụng lúc HIỂN THỊ — dữ liệu trong database giữ nguyên.
 * Không áp dụng cho catalog.sklight.vn (chính trang này) hay tên miền khác.
 */

const SOURCE_PARAM = "nguon";
const SOURCE_VALUE = "catalog";

/** Host được gắn nguồn: sklight.vn và www.sklight.vn (không gồm subdomain khác). */
const isMainSiteHost = (host: string) => host === "sklight.vn" || host === "www.sklight.vn";

/**
 * Trả về URL đã có `nguon=catalog` nếu trỏ tới web chính sklight.vn.
 * Giữ nguyên query sẵn có và #hash; không thêm trùng nếu đã có `nguon`.
 * URL không hợp lệ hoặc không thuộc web chính được trả về nguyên vẹn.
 */
export function withCatalogSource(url: string | null | undefined): string {
  if (!url) return "";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!isMainSiteHost(parsed.hostname.toLowerCase())) return url;
  if (!parsed.searchParams.has(SOURCE_PARAM)) {
    parsed.searchParams.append(SOURCE_PARAM, SOURCE_VALUE);
  }
  return parsed.toString();
}
