import { cn } from "@/lib/utils";

export function ProductPlaceholder({ className }: { className?: string }) {
  return (
    <div
      role="img"
      aria-label="SK Ambient Light — hình sản phẩm chưa có"
      className={cn(
        "sk-placeholder flex aspect-[4/3] w-full flex-col items-center justify-center gap-5 overflow-hidden",
        className,
      )}
    >
      <svg viewBox="0 0 320 140" fill="none" className="w-4/5 max-w-80" aria-hidden="true">
        <path
          d="M28 103 48 54c4-10 14-16 25-16h174c11 0 21 6 25 16l20 49"
          className="sk-car-outline"
          strokeWidth="2"
        />
        <path
          d="m57 82 21-27h164l21 27M34 105h252M79 108v15m163-15v15"
          className="sk-car-outline"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M46 94c55-17 78 5 114 5s59-22 114-5"
          className="sk-led-glow"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M46 94c55-17 78 5 114 5s59-22 114-5"
          className="sk-led-line"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="95" cy="84" r="10" className="sk-car-outline" strokeWidth="2" />
        <path
          d="M139 79h42m-42 7h42"
          className="sk-car-outline"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className="text-sm font-medium text-muted-foreground/50">SK Ambient Light</span>
    </div>
  );
}
