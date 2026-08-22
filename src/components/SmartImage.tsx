/**
 * Ảnh "chống lỗi": tự thử các biến thể link (Google Drive, Dropbox, Imgur...),
 * bỏ referrer để tránh bị chặn hotlink, và hiện ảnh dự phòng khi mọi link đều hỏng.
 */
import { useEffect, useMemo, useState } from "react";
import { imageCandidates } from "@/data/catalog";
import { IMG } from "@/data/images";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  /** Ảnh hiển thị khi mọi link đều lỗi. */
  fallback?: string;
  width?: number;
  height?: number;
  eager?: boolean;
};

export function SmartImage({ src, alt, className, fallback = IMG.car, width, height, eager }: Props) {
  const candidates = useMemo(() => {
    const list = imageCandidates(src ?? "");
    return list.length > 0 ? list : [fallback];
  }, [src, fallback]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
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
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      referrerPolicy="no-referrer"
      className={className}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
