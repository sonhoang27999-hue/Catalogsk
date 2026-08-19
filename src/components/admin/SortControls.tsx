/**
 * Nút mũi tên đổi thứ tự hiển thị (chỉ admin thấy).
 * Ghi lại cột `sort` cho toàn bộ danh sách để thứ tự luôn liền mạch.
 */
import { ChevronDown, ChevronUp } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { setSort } from "@/data/admin.api";
import { useRefreshCatalog } from "@/hooks/useRefreshCatalog";

type Table = "categories" | "series" | "models" | "products" | "nodes";

export function SortControls({
  table,
  ids,
  index,
  className = "",
}: {
  table: Table;
  /** Danh sách UUID theo đúng thứ tự đang hiển thị. */
  ids: string[];
  index: number;
  className?: string;
}) {
  const refresh = useRefreshCatalog();

  const move = useMutation({
    mutationFn: async (dir: -1 | 1) => {
      const target = index + dir;
      if (target < 0 || target >= ids.length) return;
      const next = [...ids];
      const cur = next[index]!;
      next[index] = next[target]!;
      next[target] = cur;
      await Promise.all(next.map((id, i) => setSort(table, id, i)));
    },
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message || "Không đổi được thứ tự."),
  });

  const btn =
    "flex size-7 items-center justify-center rounded-md border border-border bg-card text-foreground disabled:opacity-30";

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        type="button"
        aria-label="Di chuyển lên"
        className={btn}
        disabled={index === 0 || move.isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          move.mutate(-1);
        }}
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Di chuyển xuống"
        className={btn}
        disabled={index === ids.length - 1 || move.isPending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          move.mutate(1);
        }}
      >
        <ChevronDown className="size-4" />
      </button>
    </div>
  );
}
