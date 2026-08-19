import type { ReactNode } from "react";
import { Plus } from "lucide-react";

/** Ô [+] dạng lưới, hoà vào layout của từng tầng. */
export function AddTile({
  label,
  onClick,
  shape = "square",
}: {
  label: string;
  onClick: () => void;
  shape?: "square" | "wide";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group flex flex-col items-center gap-1.5 transition-transform active:scale-[0.97]"
    >
      <span
        className={`flex w-full items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary/60 text-muted-foreground transition-colors group-hover:border-gold group-hover:text-gold group-active:border-gold group-active:text-gold ${
          shape === "square" ? "aspect-square" : "aspect-[4/3]"
        }`}
      >
        <Plus className="size-7" />
      </span>
      <span className="line-clamp-2 text-center text-[11px] leading-tight font-medium text-muted-foreground transition-colors group-hover:text-gold">
        {label}
      </span>
    </button>
  );
}

/** Nút [+] nổi (FAB) ở góc dưới phải, phía trên thanh điều hướng. */
export function AddFab({
  label,
  onClick,
  variant = "primary",
  stackIndex = 0,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "soft";
  stackIndex?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`fixed z-40 ${
        variant === "primary"
          ? "bg-gold text-gold-foreground"
          : "border border-gold bg-card text-gold"
      } flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-transform active:scale-95`}
      style={{
        // Neo vào mép phải của khung app 480px, không đè lên chân trang cố định.
        right: "max(16px, calc(50vw - 240px + 16px))",
        bottom: `calc(var(--fab-bottom, 60px) + ${stackIndex * 56}px)`,
      }}
    >
      <Plus className="size-4" /> {label}
    </button>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
