/**
 * Xem trước video từ link YouTube/TikTok/Facebook... ngay trong form admin.
 * Dùng toEmbedUrl để chuẩn hoá link; nếu link không chuyển được thành embed thì báo.
 */
import { useMemo, useState } from "react";
import { toEmbedUrl } from "@/lib/video";

export function VideoUrlPreview({ url }: { url: string }) {
  const trimmed = url.trim();
  const embed = useMemo(() => (trimmed ? toEmbedUrl(trimmed) : null), [trimmed]);
  const [error, setError] = useState(false);

  if (!trimmed) return null;

  if (!embed || embed === trimmed) {
    // Link không nhận diện được dạng video quen thuộc
    return (
      <p className="mt-1 text-xs text-amber-500">
        Không nhận diện được link YouTube/TikTok/Facebook — sẽ giữ nguyên link này.
      </p>
    );
  }

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border">
      {error ? (
        <p className="p-2 text-xs text-destructive">
          Không tải được video từ link này, hãy kiểm tra lại.
        </p>
      ) : (
        <iframe
          src={embed}
          title="Xem trước video"
          className="aspect-video w-full"
          onError={() => setError(true)}
          allowFullScreen
        />
      )}
    </div>
  );
}
