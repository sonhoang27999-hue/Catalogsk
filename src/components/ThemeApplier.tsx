/**
 * Áp dụng giao diện (màu sắc, bo góc) do admin cấu hình, lưu trên Cloud.
 * Ghi đè các CSS variable của design system ở thẻ <html>.
 */
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { settingsQueryOptions, THEME_RADIUS_KEY, THEME_VARS } from "@/data/settings.api";

export function ThemeApplier() {
  const { data } = useQuery(settingsQueryOptions);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    for (const item of THEME_VARS) {
      const value = data?.[item.key]?.trim();
      if (value) root.style.setProperty(item.cssVar, value);
      else root.style.removeProperty(item.cssVar);
    }
    const radius = data?.[THEME_RADIUS_KEY]?.trim();
    if (radius) root.style.setProperty("--radius", radius);
    else root.style.removeProperty("--radius");
  }, [data]);

  return null;
}
