/**
 * Cắt & dán sản phẩm giữa các mục (chỉ admin).
 * - CutProductButton: đánh dấu sản phẩm đang được cắt.
 * - PasteBar: hiện ở tầng đang xem để dán sản phẩm vào mục đó.
 */
import { Scissors, ClipboardPaste, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ensureDefaultModel, moveProduct } from "@/data/admin.api";
import { useRefreshCatalog } from "@/hooks/useRefreshCatalog";
import { cutProduct, clearClipboard, useProductClipboard } from "@/hooks/useProductClipboard";

export function CutProductButton({ id, name }: { id: string; name: string }) {
  const clip = useProductClipboard();
  const active = clip?.id === id;

  return (
    <button
      type="button"
      aria-label={active ? "Bỏ cắt sản phẩm" : "Cắt sản phẩm"}
      title={active ? "Bỏ cắt" : "Cắt để dán sang mục khác"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (active) {
          clearClipboard();
          toast.info("Đã bỏ cắt.");
        } else {
          cutProduct({ id, name });
          toast.success(`Đã cắt "${name}". Mở mục đích rồi bấm Dán.`);
        }
      }}
      className={`flex size-7 items-center justify-center rounded-md border ${
        active
          ? "border-gold bg-gold text-gold-foreground"
          : "border-border bg-card text-foreground"
      }`}
    >
      <Scissors className="size-4" />
    </button>
  );
}

export function PasteBar({
  nodeDbId,
  categoryDbId,
  modelDbId,
  seriesDbId,
  targetName,
}: {
  nodeDbId?: string | null;
  categoryDbId?: string | null;
  modelDbId?: string | null;
  /** Trang đời xe kiểu cũ: nếu chưa có model nào thì tạo model mặc định. */
  seriesDbId?: string | null;
  targetName: string;
}) {
  const clip = useProductClipboard();
  const refresh = useRefreshCatalog();

  const paste = useMutation({
    mutationFn: async () => {
      if (!clip) return;
      let model = modelDbId ?? null;
      if (!nodeDbId && !model && seriesDbId) {
        model = await ensureDefaultModel(seriesDbId, targetName);
      }
      await moveProduct(clip.id, {
        nodeDbId: nodeDbId ?? null,
        categoryDbId: categoryDbId ?? null,
        modelDbId: model,
      });
    },
    onSuccess: async () => {
      clearClipboard();
      await refresh();
      toast.success("Đã dán sản phẩm vào mục này.");
    },
    onError: (e: Error) => toast.error(e.message || "Không dán được sản phẩm."),
  });

  if (!clip) return null;

  return (
    <div className="mx-3 mb-3 flex items-center gap-2 rounded-lg border border-gold/60 bg-secondary px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-muted-foreground">Đang cắt sản phẩm</p>
        <p className="truncate text-sm font-semibold text-foreground">{clip.name}</p>
      </div>
      <button
        type="button"
        disabled={paste.isPending}
        onClick={() => paste.mutate()}
        className="flex items-center gap-1.5 rounded-md bg-gold px-3 py-2 text-xs font-bold text-gold-foreground disabled:opacity-50"
      >
        <ClipboardPaste className="size-4" />
        Dán vào {targetName}
      </button>
      <button
        type="button"
        aria-label="Huỷ cắt"
        onClick={() => clearClipboard()}
        className="flex size-8 items-center justify-center rounded-md border border-border bg-card text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
