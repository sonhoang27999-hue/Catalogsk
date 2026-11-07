/**
 * Bấm vào ảnh sản phẩm để phóng to (lightbox).
 *
 * - Ảnh trong danh sách vẫn tải cỡ `preview` như cũ (giao diện không đổi).
 * - Khi mở lightbox mới tải cỡ `detail` (~2600px) — chỉ đúng lúc user cần.
 * - Ảnh gốc nguyên bản chỉ tải khi user bấm "Xem ảnh gốc" (và chỉ hiện nút này
 *   khi nguồn ảnh có hỗ trợ tạo bản nhỏ hơn, tức là đang xem bản đã thu nhỏ).
 */
import { memo, useCallback, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SmartImage } from "@/components/SmartImage";
import { supportsResize } from "@/lib/imageUrl";
import { Button } from "@/components/ui/button";
import { ProductPlaceholder } from "@/components/catalog/ProductPlaceholder";
import { useImageGestures } from "@/hooks/useImageGestures";

type Props = { src: string | null | undefined; alt: string; children: ReactNode };

function ZoomSurface({ src, alt, showOriginal, onDismiss }: { src: Props['src']; alt: string; showOriginal: boolean; onDismiss: () => void }) {
  const { viewportRef, mediaRef } = useImageGestures(onDismiss);
  return <div ref={viewportRef} className="max-h-[80vh] overflow-auto overscroll-contain">
    <div ref={mediaRef} className="sk-zoom-media" data-zoomed="false">
      <SmartImage src={src} alt={alt} size={showOriginal ? 'original' : 'detail'} eager fallbackContent={<ProductPlaceholder />} className="block h-auto w-full object-contain" />
    </div>
  </div>;
}

export const ImageZoom = memo(function ImageZoom({ src, alt, children }: Props) {
  const [open, setOpen] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const canUpgrade = supportsResize(src);
  const dismiss = useCallback(() => setOpen(false), []);

  return (
    <>
      <Button
        variant="ghost"
        type="button"
        aria-label={`Phóng to ảnh ${alt}`}
        onClick={() => {
          setShowOriginal(false);
          setOpen(true);
        }}
        className="block h-auto w-full cursor-zoom-in rounded-none p-0 hover:bg-transparent"
      >
        {children}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined} className="sk-catalog sk-image-lightbox w-[calc(100vw-16px)] max-w-[900px] overflow-hidden rounded-2xl bg-card p-0 sm:rounded-2xl" onOpenAutoFocus={e => { e.preventDefault(); (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('button')?.focus(); }}>
          <DialogTitle className="sr-only">{alt}</DialogTitle>
          {open ? (
            <ZoomSurface src={src} alt={alt} showOriginal={showOriginal} onDismiss={dismiss} />
          ) : null}
          {canUpgrade && !showOriginal ? (
            <Button
              variant="secondary"
              type="button"
              onClick={() => setShowOriginal(true)}
              className="h-auto rounded-none border-t border-border px-3 py-3 text-center text-sm font-semibold hover:bg-gold hover:text-gold-foreground"
            >
              Xem ảnh gốc
            </Button>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
});
