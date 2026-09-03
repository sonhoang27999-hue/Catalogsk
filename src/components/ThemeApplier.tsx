/**
 * Áp dụng giao diện (màu sắc, bo góc) do admin cấu hình, lưu trên Cloud.
 *
 * Render một thẻ <style> ghi đè CSS variable — hoạt động cả khi SSR, nên khách
 * thấy đúng màu sắc admin đã chọn ngay từ HTML đầu tiên (không còn "nháy" màu
 * mặc định rồi mới đổi sang màu cấu hình).
 */
import { useQuery } from "@tanstack/react-query";
import { settingsQueryOptions, THEME_RADIUS_KEY, THEME_VARS } from "@/data/settings.api";

/** Chỉ chấp nhận giá trị CSS an toàn (màu hex/oklch/hsl, kích thước...). */
const isSafeCssValue = (value: string) => /^[a-zA-Z0-9#(),.%\s/-]+$/.test(value);

export function ThemeApplier() {
  const { data } = useQuery(settingsQueryOptions);

  const decls: string[] = [];
  for (const item of THEME_VARS) {
    const value = data?.[item.key]?.trim();
    if (value && isSafeCssValue(value)) decls.push(`${item.cssVar}:${value}`);
  }
  const radius = data?.[THEME_RADIUS_KEY]?.trim();
  if (radius && isSafeCssValue(radius)) decls.push(`--radius:${radius}`);

  if (!decls.length) return null;

  // `:root.dark` có độ ưu tiên cao hơn `:root`/`.dark` trong styles.css.
  return (
    <style
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: `:root.dark,:root{${decls.join(";")}}` }}
    />
  );
}
