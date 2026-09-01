/**
 * Khung video 16:9 chỉ gắn <iframe> khi khung sắp lọt vào màn hình.
 * Danh sách nhiều sản phẩm có video sẽ không tải trình phát nào cho tới khi cuộn tới,
 * tiết kiệm băng thông đáng kể trên điện thoại. Giao diện giữ nguyên như cũ.
 */
import { memo, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Props = { src: string; title: string; className?: string; vertical?: boolean };

export const LazyEmbed = memo(function LazyEmbed({ src, title, className, vertical }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={cn(
        "relative w-full",
        vertical ? "mx-auto aspect-[9/16] max-h-[70vh] max-w-[320px]" : "aspect-video",
        className,
      )}
    >
      {visible ? (
        <iframe
          src={src}
          title={title}
          loading="lazy"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}
    </div>
  );
});
