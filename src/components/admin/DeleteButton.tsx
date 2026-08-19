/**
 * Nút xoá (chỉ admin thấy) cho từng mục: hãng xe, đời xe, tầng cây, sản phẩm.
 * Có hộp thoại xác nhận vì xoá mục cha sẽ xoá luôn nội dung bên trong.
 */
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { deleteRow } from "@/data/admin.api";
import { useRefreshCatalog } from "@/hooks/useRefreshCatalog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Table = "categories" | "series" | "models" | "products" | "nodes";

export function DeleteButton({
  table,
  id,
  name,
  warnChildren = false,
  className = "",
  onDeleted,
}: {
  table: Table;
  id: string;
  name: string;
  /** true khi xoá mục này sẽ xoá cả nội dung con bên trong. */
  warnChildren?: boolean;
  className?: string;
  onDeleted?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const refresh = useRefreshCatalog();

  const remove = useMutation({
    mutationFn: () => deleteRow(table, id),
    onSuccess: () => {
      setOpen(false);
      toast.success(`Đã xoá “${name}”.`);
      refresh();
      onDeleted?.();
    },
    onError: (e: Error) => toast.error(e.message || "Không xoá được."),
  });

  return (
    <>
      <button
        type="button"
        aria-label={`Xoá ${name}`}
        className={`flex size-7 items-center justify-center rounded-md border border-border bg-card text-destructive ${className}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Trash2 className="size-4" />
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xoá “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              {warnChildren
                ? "Toàn bộ mục con và sản phẩm bên trong cũng sẽ bị xoá. Thao tác này không thể hoàn tác."
                : "Thao tác này không thể hoàn tác."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                remove.mutate();
              }}
            >
              {remove.isPending ? "Đang xoá..." : "Xoá"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
