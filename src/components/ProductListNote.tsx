/**
 * Ghi chú cuối mỗi trang danh sách sản phẩm (VAT + liên hệ làm đại lý).
 * Nội dung lưu trên Cloud (site_settings) và admin có thể sửa trực tiếp.
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/admin/AddTile";
import { PRODUCT_NOTE_KEY, saveSetting, settingsQueryOptions } from "@/data/settings.api";
import { useAdmin } from "@/hooks/useAdmin";

export const DEFAULT_PRODUCT_NOTE =
  "Giá trên đã gồm VAT, có thể không lấy VAT. Liên hệ: 0868055555 để đăng ký làm đại lý phân phối sỉ.";

export function ProductListNote() {
  const { isAdmin, isAuthenticated } = useAdmin();
  const settings = useQuery(settingsQueryOptions);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  const note = settings.data?.[PRODUCT_NOTE_KEY]?.trim() || DEFAULT_PRODUCT_NOTE;

  const save = useMutation({
    mutationFn: () => saveSetting(PRODUCT_NOTE_KEY, text.trim()),
    onSuccess: async () => {
      await settings.refetch();
      setOpen(false);
      toast.success("Đã cập nhật ghi chú.");
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });

  if (!isAuthenticated) return null;

  return (
    <div className="px-3 pt-2 pb-4">
      <div className="rounded-2xl border border-border bg-card px-3 py-3">
        <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{note}</p>
        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setText(settings.data?.[PRODUCT_NOTE_KEY] ?? DEFAULT_PRODUCT_NOTE);
              setOpen(true);
            }}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground active:scale-95"
          >
            <Pencil className="size-3.5" /> Sửa ghi chú
          </button>
        ) : null}
      </div>

      {isAdmin ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] rounded-2xl p-5 sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Ghi chú cuối trang sản phẩm</DialogTitle>
              <DialogDescription>
                Nội dung hiển thị ở cuối mọi trang danh sách sản phẩm.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Field label="Nội dung">
                <Textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} />
              </Field>
              <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
                Lưu ghi chú
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
