/**
 * Xem trước ảnh khi admin dán link, báo ngay nếu link không hiển thị được.
 */
import { useEffect, useState } from "react";
import { normalizeImageUrl } from "@/data/catalog";

export function ImageUrlPreview({ url }: { url: string | null | undefined }) {
  const src = url && url.trim() ? normalizeImageUrl(url) : "";
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    setStatus("idle");
  }, [src]);

  if (!src) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        <img
          src={src}
          alt="Xem trước ảnh"
          loading="lazy"
          decoding="async"
          className="h-full w-auto object-contain"
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
        />
      </div>
      {status === "error" ? (
        <p className="text-xs text-destructive">
          Không tải được ảnh. Hãy dùng link ảnh trực tiếp (kết thúc .jpg/.png/.webp) hoặc mở quyền
          xem công khai với Google Drive.
        </p>
      ) : (
        <p className="text-xs text-muted-foreground break-all">{src}</p>
      )}
    </div>
  );
}
