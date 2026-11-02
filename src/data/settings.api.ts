/** Cấu hình giao diện lưu trên Cloud (key/value). Ví dụ: ảnh bìa trang chủ. */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const HOME_BANNER_KEY = "home_banner_url";

/** Ghi chú cuối trang danh sách sản phẩm (VAT, liên hệ đại lý). */
export const PRODUCT_NOTE_KEY = "product_list_note";

/** Đường dẫn trang Hướng dẫn sử dụng LED (chỉ admin sửa). */
export const GUIDE_SOURCE_KEY = "guide_source_url";
export const GUIDE_IOS_KEY = "guide_ios_url";
export const GUIDE_APK_KEY = "guide_apk_url";
export const GUIDE_LINK_KEYS = [GUIDE_SOURCE_KEY, GUIDE_IOS_KEY, GUIDE_APK_KEY] as const;

/** APK của catalog, tách riêng app điều khiển LED. */
export const CATALOG_APK_KEY = "catalog_apk_url";

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
  { key: "theme_background", cssVar: "--background", label: "Nền trang", fallback: "#09090b" },
  { key: "theme_card", cssVar: "--card", label: "Nền thẻ / ô", fallback: "#262629" },
  { key: "theme_foreground", cssVar: "--foreground", label: "Màu chữ chính", fallback: "#ffffff" },
  {
    key: "theme_muted_foreground",
    cssVar: "--muted-foreground",
    label: "Màu chữ phụ",
    fallback: "#d4d4d8",
  },
  { key: "theme_border", cssVar: "--border", label: "Màu viền", fallback: "#3f3f46" },
  { key: "theme_gold", cssVar: "--gold", label: "Màu nhấn (Gold)", fallback: "#d9a514" },
  { key: "theme_brand", cssVar: "--brand", label: "Màu thương hiệu", fallback: "#2d6fcd" },
  { key: "theme_primary", cssVar: "--primary", label: "Màu nút chính", fallback: "#2d6fcd" },
] as const;

export const THEME_RADIUS_KEY = "theme_radius";

/** Lưu nhiều cấu hình cùng lúc. */
export const saveSettings = async (entries: Record<string, string>) => {
  const rows = Object.entries(entries).map(([key, value]) => ({ key, value }));
  if (!rows.length) return;
  const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
  if (error) throw new Error(error.message);
};

/** Khóa cài đặt giao diện mở rộng (chế độ, hiệu ứng, gradient tiêu đề...). */
export const THEME_EXTRA_KEYS = [
  "theme_mode",
  "theme_accent",
  "theme_bg_level",
  "theme_effects",
  "theme_fx_speed",
  "theme_title_gradient",
  "theme_preset",
  "theme_texture",
  "theme_light_style",
] as const;

/** Mẫu giao diện admin lưu sẵn (JSON) — không thuộc giao diện đang dùng. */
export const THEME_SLOTS_KEY = "theme_slots";

/** Danh sách khóa giao diện được phép ghi/nhập từ trình chỉnh giao diện. */
export const THEME_ALLOWED_KEYS: readonly string[] = [
  ...THEME_VARS.map((v) => v.key),
  THEME_RADIUS_KEY,
  ...THEME_EXTRA_KEYS,
];
