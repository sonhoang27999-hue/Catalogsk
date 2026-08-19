import { Search, X } from "lucide-react";

export function SearchBar({
  value,
  onChange,
  placeholder = "Tìm hãng xe, đời xe, năm SX, phụ kiện...",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Tìm kiếm"
        className="h-11 w-full rounded-md border border-border bg-card pr-9 pl-9 text-sm outline-none placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
      {value ? (
        <button
          type="button"
          aria-label="Xoá tìm kiếm"
          onClick={() => onChange("")}
          className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground active:bg-secondary"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
