/**
 * Ảnh "chống lỗi" + tối ưu băng thông.
 *
 * - `size`: "thumb" (lưới/danh sách) | "preview" (ảnh lớn trong thẻ) | "detail" (lightbox) | "original" (ảnh gốc).
 *   Kích thước thật do `src/lib/imageUrl.ts` quyết định, tuỳ nguồn ảnh có hỗ trợ resize hay không.
 * - Tự thử các biến thể link (Google Drive, Dropbox, Imgur...), bỏ referrer để tránh chặn hotlink.
 * - Mặc định lazy + decoding async; chỉ ảnh hero mới `eager` + fetchPriority cao.
 * - SSR-safe: trình duyệt có thể tải XONG ảnh trước khi React hydrate (sự kiện
 *   `load` bắn trước khi onLoad được gắn). Khi đó ta kiểm tra trực tiếp trạng thái
 *   thẻ <img> (`complete`/`naturalWidth`/`decode()`) để gỡ placeholder — không còn
 *   hiện tượng ảnh bị mờ/xám kẹt lại ở lần tải đầu.
 * - KHÔNG BAO GIỜ làm mờ ảnh đã hiển thị: placeholder chỉ là nền tĩnh, ảnh chuyển
 *   dứt khoát sang trạng thái rõ nét ngay khi decode xong.
 * - Ghi nhật ký khi mọi link đều hỏng và rơi về ảnh mặc định.
 */
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { imageCandidates, imageSrcSet, type ImageSize } from "@/lib/imageUrl";
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
  /** URL đã decode thành công — so với URL đang hiển thị để biết ảnh đã "sẵn sàng". */
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const logged = useRef(false);

  useEffect(() => setMounted(true), []);

  const candidates = useMemo(() => {
    // Không lọc ở lần render đầu (tránh lệch SSR/client); chỉ bỏ link đã hỏng khi đã ở trình duyệt.
    const all = imageCandidates(src ?? "", size);
    const list = mounted ? all.filter((u) => !brokenUrls.has(u)) : all;
    return list.length > 0 ? list : [fallback];
  }, [src, size, fallback, mounted]);

  // Chỉ reset con trỏ khi NỘI DUNG danh sách link thực sự đổi (đổi ảnh),
  // không phải khi mảng đổi identity lúc hydrate — tránh reset trạng thái đã tải.
  const candidatesKey = candidates.join("\n");
  useEffect(() => {
    setIndex(0);
    logged.current = false;
  }, [candidatesKey]);

  const current = candidates[Math.min(index, candidates.length - 1)] ?? fallback;
  const exhausted = index >= candidates.length;
  const activeSrc = exhausted ? fallback : current;
  const loaded = loadedSrc === activeSrc;

  // srcset 1x/2x CHỈ cho link chính (nguồn hỗ trợ resize): retina nét như cũ,
  // máy thường tải bản nhẹ. Link dự phòng dùng src đơn để không lệch biến thể.
  const srcSet = index === 0 && !exhausted ? imageSrcSet(src ?? "", size) : undefined;

  const handleError = () => {
    if (!exhausted) brokenUrls.add(current);
    if (index + 1 >= candidates.length && src && !logged.current) {
      logged.current = true;
      logImageError(String(src), alt);
    }
    setIndex((i) => i + 1);
  };

  // Ảnh có thể đã tải xong (hoặc đã lỗi) TRƯỚC khi React gắn onLoad/onError —
  // điển hình ở lần tải đầu với SSR. Kiểm tra trực tiếp phần tử để không kẹt
  // placeholder mờ và không kẹt link hỏng.
  useEffect(() => {
    const img = imgRef.current;
    if (!img || !img.complete) return; // chưa xong → onLoad/onError sẽ tự bắn
    if (img.naturalWidth > 0) {
      setLoadedSrc(activeSrc);
      return;
    }
    // complete nhưng không có kích thước: SVG không khai báo size, hoặc đã lỗi
    // trước hydration → dùng decode() để phân xử chính xác.
    let cancelled = false;
    img
      .decode()
      .then(() => {
        if (!cancelled) setLoadedSrc(activeSrc);
      })
      .catch(() => {
        if (!cancelled) handleError();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleError đổi theo index/candidates, đã bao phủ bởi activeSrc
  }, [activeSrc, mounted]);

  return (
    <img
      ref={imgRef}
      key={exhausted ? "fallback" : current}
      src={activeSrc}
      alt={alt}
      {...(width ? { width } : {})}
      {...(height ? { height } : {})}
      {...(srcSet ? { srcSet } : {})}
      {...(sizes ? { sizes } : {})}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      {...(eager ? { fetchPriority: "high" as const } : {})}
      referrerPolicy="no-referrer"
      className={cn(
        "transition-opacity duration-200",
        // Trước hydration (SSR) render ở trạng thái RÕ NÉT để trình duyệt vẽ ảnh
        // ngay khi tải xong. Sau khi mount: ẩn cho tới khi decode xong rồi chuyển
        // dứt khoát sang ảnh thật — tuyệt đối không dùng opacity thấp/pulse đè lên ảnh.
        mounted && !loaded ? "bg-muted opacity-0" : "opacity-100",
        className,
      )}
      onLoad={() => setLoadedSrc(activeSrc)}
      onError={handleError}
    />
  );
});
