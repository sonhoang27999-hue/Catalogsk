import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

/**
 * So sánh trước/sau: đường chia + tay nắm tròn. Kéo bằng pointer events (chuột/cảm ứng);
 * chỉ tay nắm chặn cuộn (touch-action:none), chạm phần ảnh vẫn cuộn trang bình thường.
 */
export function CompareSlider({ before, after, label }: { before: string; after: string; label?: string }) {
  const [pos, setPos] = useState(50);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const moveTo = (clientX: number) => {
    const r = boxRef.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(Math.round(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)) * 10) / 10);
  };
  const onDown = (e: PointerEvent<HTMLButtonElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e: PointerEvent<HTMLButtonElement>) => {
    if (dragging.current) moveTo(e.clientX);
  };
  const onUp = (e: PointerEvent<HTMLButtonElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const step = e.shiftKey ? 10 : 2;
    let next: number | null = null;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = pos - step;
    else if (e.key === "ArrowRight" || e.key === "ArrowUp") next = pos + step;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 100;
    if (next === null) return;
    e.preventDefault();
    setPos(Math.min(100, Math.max(0, next)));
  };

  return (
    <div ref={boxRef} className="relative w-full select-none" style={{ touchAction: "pan-y" }}>
      <img src={after} alt={`${label ?? ""} sau khi lắp`} loading="lazy" decoding="async" draggable={false} className="block h-auto w-full" />
      <img
        src={before}
        alt={`${label ?? ""} trước khi lắp`}
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 size-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      <span className="absolute top-2 left-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold">Trước</span>
      <span className="absolute top-2 right-2 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold">Sau</span>
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-primary shadow-[0_0_8px_var(--primary)]" style={{ left: `${pos}%` }} />
      <button
        type="button"
        role="slider"
        aria-label="Kéo để so sánh trước và sau"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(pos)}% ảnh trước`}
        data-testid="compare-handle"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onKeyDown={onKey}
        className="absolute top-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full border-2 border-primary bg-background/85 text-primary shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
        style={{ left: `${pos}%`, touchAction: "none" }}
      >
        <span aria-hidden className="text-sm font-bold leading-none">‹ ›</span>
      </button>
    </div>
  );
}
