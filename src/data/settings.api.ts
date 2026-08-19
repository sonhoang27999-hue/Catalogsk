/** Cấu hình giao diện lưu trên Cloud (key/value). Ví dụ: ảnh bìa trang chủ. */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const HOME_BANNER_KEY = "home_banner_url";

/** Ghi chú cuối trang danh sách sản phẩm (VAT, liên hệ đại lý). */
export const PRODUCT_NOTE_KEY = "product_list_note";

export const settingsQueryOptions = queryOptions({
  queryKey: ["site-settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("key, value");
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((r) => [r.key, r.value ?? ""])) as Record<
      string,
      string
    >;
  },
});

/** Lưu một cấu hình (chỉ admin, kiểm soát bằng chính sách bảo mật trên Cloud). */
export const saveSetting = async (key: string, value: string) => {
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
};

/** Các biến giao diện admin có thể tuỳ chỉnh (lưu dạng chuỗi CSS hợp lệ). */
export const THEME_VARS = [
  { key: "theme_background", cssVar: "--background", label: "Nền trang", fallback: "#0a0a0b" },
  { key: "theme_card", cssVar: "--card", label: "Nền thẻ / ô", fallback: "#18181b" },
  { key: "theme_foreground", cssVar: "--foreground", label: "Màu chữ chính", fallback: "#fafafa" },
  { key: "theme_muted_foreground", cssVar: "--muted-foreground", label: "Màu chữ phụ", fallback: "#d4d4d8" },
  { key: "theme_border", cssVar: "--border", label: "Màu viền", fallback: "#3f3f46" },
  { key: "theme_gold", cssVar: "--gold", label: "Màu nhấn (Gold)", fallback: "#d4af37" },
  { key: "theme_brand", cssVar: "--brand", label: "Màu thương hiệu", fallback: "#3f6fd8" },
  { key: "theme_primary", cssVar: "--primary", label: "Màu nút chính", fallback: "#3f6fd8" },
] as const;

export const THEME_RADIUS_KEY = "theme_radius";

/** Lưu nhiều cấu hình cùng lúc. */
export const saveSettings = async (entries: Record<string, string>) => {
  const rows = Object.entries(entries).map(([key, value]) => ({ key, value }));
  if (!rows.length) return;
  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
};
