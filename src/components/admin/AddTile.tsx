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
      className="flex flex-col items-center gap-1.5 active:scale-[0.97] transition-transform"
    >
      <span
        className={`flex w-full items-center justify-center rounded-md border-2 border-dashed border-brand/40 bg-brand-soft/50 text-brand ${
          shape === "square" ? "aspect-square" : "aspect-[4/3]"
        }`}
      >
        <Plus className="size-7" />
      </span>
      <span className="line-clamp-2 text-center text-[11px] leading-tight font-medium text-brand">
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
      className={`fixed left-1/2 z-30 ${
        variant === "primary" ? "bg-brand text-white" : "border border-brand bg-card text-brand"
      } flex -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition-transform active:scale-95`}
      style={{ marginLeft: "calc(min(50vw, 240px) - 110px)", bottom: 24 + stackIndex * 56 }}
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
