/**
 * Áp dụng giao diện (màu sắc, chế độ sáng/tối, hiệu ứng) do admin cấu hình.
 * Render <style> ngay trong HTML SSR nên không bị "nháy" màu mặc định.
 */
import { useQuery } from "@tanstack/react-query";
import { settingsQueryOptions } from "@/data/settings.api";
import { buildThemeCss } from "@/lib/themeEngine";

export function ThemeApplier() {
  const { data } = useQuery(settingsQueryOptions);
  const css = buildThemeCss(data);
  return <style id="sk-theme" dangerouslySetInnerHTML={{ __html: css }} />;
}
