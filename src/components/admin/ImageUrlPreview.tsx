/**
 * Xem trước ảnh khi admin dán link, báo ngay nếu link không hiển thị được.
 */
import { useEffect, useState } from "react";
import { imageCandidates, normalizeImageUrl } from "@/data/catalog";

export function ImageUrlPreview({ url }: { url: string | null | undefined }) {
  const list = imageCandidates(url ?? "", "thumb");
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  useEffect(() => {
    setIndex(0);
    setStatus("idle");
  }, [url]);

  if (list.length === 0) return null;
  const src = list[Math.min(index, list.length - 1)] ?? normalizeImageUrl(url ?? "");
  const failed = index >= list.length;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex h-24 w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        {failed ? null : (
          <img
            key={src}
            src={src}
            alt="Xem trước ảnh"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            className="h-full w-auto object-contain"
            onLoad={() => setStatus("ok")}
            onError={() => {
              setIndex((i) => i + 1);
              if (index + 1 >= list.length) setStatus("error");
            }}
          />
        )}
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
