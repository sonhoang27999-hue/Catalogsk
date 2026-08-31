/**
 * Ảnh "chống lỗi" + tối ưu băng thông.
 *
 * - `size`: "thumb" (lưới/danh sách) | "preview" (ảnh lớn trong thẻ) | "detail" (lightbox) | "original" (ảnh gốc).
 *   Kích thước thật do `src/lib/imageUrl.ts` quyết định, tuỳ nguồn ảnh có hỗ trợ resize hay không.
 * - Tự thử các biến thể link (Google Drive, Dropbox, Imgur...), bỏ referrer để tránh chặn hotlink.
 * - Mặc định lazy + decoding async; chỉ ảnh hero mới `eager` + fetchPriority cao.
 * - Ghi nhật ký khi mọi link đều hỏng và rơi về ảnh mặc định.
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { imageCandidates, type ImageSize } from "@/lib/imageUrl";
import { IMG } from "@/data/images";
import { logImageError } from "@/lib/imageErrors";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Ảnh hiển thị khi mọi link đều lỗi. */
  fallback?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  /** Cấp ảnh cần tải. Mặc định "preview". */
  size?: ImageSize;
  /** Gợi ý cho trình duyệt chọn độ phân giải (vd: "33vw"). */
  sizes?: string;
};

/** Nhớ các URL đã tải hỏng trong phiên, để không bắn lại request vô ích. */
const brokenUrls = new Set<string>();

export const SmartImage = memo(function SmartImage({
  src,
  alt,
  className,
  fallback = IMG.car,
  width,
  height,
  eager,
  size = "preview",
  sizes,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const logged = useRef(false);

  useEffect(() => setMounted(true), []);

  const candidates = useMemo(() => {
    // Không lọc ở lần render đầu (tránh lệch SSR/client); chỉ bỏ link đã hỏng khi đã ở trình duyệt.
    const all = imageCandidates(src ?? "", size);
    const list = mounted ? all.filter((u) => !brokenUrls.has(u)) : all;
    return list.length > 0 ? list : [fallback];
  }, [src, size, fallback, mounted]);

  useEffect(() => {
    setIndex(0);
    setLoaded(false);
    logged.current = false;
  }, [candidates]);

  const current = candidates[Math.min(index, candidates.length - 1)] ?? fallback;
  const exhausted = index >= candidates.length;

  return (
    <img
      key={exhausted ? "fallback" : current}
      src={exhausted ? fallback : current}
      alt={alt}
      {...(width ? { width } : {})}
      {...(height ? { height } : {})}
      {...(sizes ? { sizes } : {})}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : { fetchPriority: "low" as const })}
      referrerPolicy="no-referrer"
      className={cn(
        "transition-opacity duration-300",
        loaded ? "opacity-100" : "animate-pulse bg-muted opacity-60",
        className,
      )}
      onLoad={() => setLoaded(true)}
      onError={() => {
        if (!exhausted) brokenUrls.add(current);
        if (index + 1 >= candidates.length && src && !logged.current) {
          logged.current = true;
          logImageError(String(src), alt);
        }
        setIndex((i) => i + 1);
      }}
    />
  );
});
