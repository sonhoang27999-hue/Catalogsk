/**
 * Ghi chú cuối mỗi trang danh sách sản phẩm (VAT + liên hệ làm đại lý).
 * Ghi chú chung lưu trên Cloud (site_settings), admin sửa trực tiếp.
 * Mỗi đại lý cấp 1 có ghi chú riêng: tài khoản thuộc đại lý đó (hoặc người đăng nhập
 * vào qua link của đại lý) thấy ghi chú của đại lý thay cho ghi chú chung.
 */
import { lazy, Suspense, useState } from "react";
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
import { useDealerContact } from "@/hooks/useDealerContact";
import { displayLogin } from "@/lib/username";
import { supabase } from "@/integrations/supabase/client";

// Form của đại lý cấp 1 chỉ tải khi họ bấm sửa.
const DealerProfileDialog = lazy(() =>
  import("@/components/admin/DealerProfileDialog").then((m) => ({
    default: m.DealerProfileDialog,
  })),
);

export const DEFAULT_PRODUCT_NOTE =
  "Giá trên đã gồm VAT, có thể không lấy VAT. Liên hệ: 0868055555 để đăng ký làm đại lý phân phối sỉ.";

export function ProductListNote() {
  const { canManage: isAdmin, isAuthenticated, isDealer1, userId } = useAdmin();
  const settings = useQuery(settingsQueryOptions);
  const { contact, pending } = useDealerContact();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [dealerOpen, setDealerOpen] = useState(false);
  const [loginName, setLoginName] = useState("");

  const siteNote = settings.data?.[PRODUCT_NOTE_KEY]?.trim() || DEFAULT_PRODUCT_NOTE;
  // Admin / quản trị viên luôn thấy (và sửa) ghi chú chung; người khác thấy ghi chú của đại lý nếu có.
  const note = isAdmin ? siteNote : contact?.note.trim() || siteNote;
  const canEditOwn = isDealer1 && !isAdmin && Boolean(userId);

  const openDealerForm = async () => {
    const { data } = await supabase.auth.getSession();
    setLoginName(displayLogin(data.session?.user.email ?? ""));
    setDealerOpen(true);
  };

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
  // Chờ biết đang xem qua đại lý nào rồi mới hiện, tránh nháy ghi chú chung của SK.
  if (!isAdmin && pending) return null;

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
        ) : canEditOwn ? (
          <button
            type="button"
            onClick={openDealerForm}
            className="mt-2 inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold text-foreground active:scale-95"
          >
            <Pencil className="size-3.5" /> Sửa ghi chú của tôi
          </button>
        ) : null}
      </div>

      {canEditOwn && dealerOpen && userId ? (
        <Suspense fallback={null}>
          <DealerProfileDialog
            userId={userId}
            loginName={loginName}
            open={dealerOpen}
            onOpenChange={setDealerOpen}
          />
        </Suspense>
      ) : null}

      {isAdmin ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] rounded-2xl p-5 sm:rounded-2xl">
            <DialogHeader>
              <DialogTitle>Ghi chú cuối trang sản phẩm</DialogTitle>
              <DialogDescription>
                Ghi chú chung ở cuối mọi trang danh sách sản phẩm. Đại lý cấp 1 có ghi chú riêng thì
                tài khoản thuộc đại lý đó thấy ghi chú của họ.
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
