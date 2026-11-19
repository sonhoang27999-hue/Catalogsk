/**
 * Thông tin tư vấn riêng của một đại lý cấp 1: link riêng, số gọi, số Zalo
 * và ghi chú cuối trang sản phẩm. Đại lý cấp 1 tự sửa của mình;
 * admin / quản trị viên sửa hộ và bật/tắt được.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/admin/AddTile";
import { fetchDealerProfile, saveDealerProfile } from "@/data/dealer.api";
import { DEALER_CONTACT_KEY } from "@/hooks/useDealerContact";
import { dealerLink, isDealerCode, normalizeDealerCode } from "@/lib/dealerLink";

const NOTE_MAX = 600;
const phoneOk = (value: string) => /^\+?\d{8,15}$/.test(value.replace(/[^+\d]/g, ""));

export function DealerProfileDialog({
  userId,
  loginName = "",
  staff = false,
  open,
  onOpenChange,
}: {
  /** Tài khoản đại lý cấp 1 cần sửa. */
  userId: string;
  /** Tên đăng nhập, dùng để gợi ý mã link lần đầu. */
  loginName?: string;
  /** Người đang sửa là admin / quản trị viên (được bật/tắt). */
  staff?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const qc = useQueryClient();
  const profile = useQuery({
    queryKey: ["dealer-profile", userId],
    enabled: open && Boolean(userId),
    staleTime: 0,
    queryFn: () => fetchDealerProfile(userId),
  });

  const [code, setCode] = useState("");
  const [shopName, setShopName] = useState("");
  const [phone, setPhone] = useState("");
  const [zalo, setZalo] = useState("");
  const [note, setNote] = useState("");
  const [active, setActive] = useState(true);
  // Mã đã lưu trên Cloud: link chỉ dùng được với mã này, không phải mã đang gõ dở.
  const [savedCode, setSavedCode] = useState("");

  // Nạp dữ liệu mỗi lần mở; chưa có thông tin thì gợi ý mã theo tên đăng nhập.
  useEffect(() => {
    if (!open || !profile.isSuccess) return;
    const data = profile.data;
    setCode(data?.code ?? normalizeDealerCode(loginName));
    setShopName(data?.shopName ?? "");
    setPhone(data?.phone ?? "");
    setZalo(data && data.zalo !== data.phone ? data.zalo : "");
    setNote(data?.productNote ?? "");
    setActive(data?.active ?? true);
    setSavedCode(data?.code ?? "");
  }, [open, profile.isSuccess, profile.data, loginName]);

  const save = useMutation({
    mutationFn: () =>
      saveDealerProfile({
        userId,
        code: normalizeDealerCode(code),
        shopName: shopName.trim(),
        phone: phone.trim(),
        zalo: zalo.trim(),
        productNote: note.trim(),
        ...(staff ? { active } : {}),
      }),
    onSuccess: async (saved) => {
      setCode(saved.code);
      setSavedCode(saved.code);
      setActive(saved.active);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["dealer-profile", userId] }),
        qc.invalidateQueries({ queryKey: DEALER_CONTACT_KEY }),
      ]);
      toast.success("Đã lưu thông tin tư vấn.");
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });

  const cleanCode = normalizeDealerCode(code);
  const codeValid = isDealerCode(cleanCode);
  const canSave = codeValid && phoneOk(phone) && (!zalo.trim() || phoneOk(zalo)) && !save.isPending;
  const link =
    savedCode && typeof window !== "undefined" ? dealerLink(window.location.origin, savedCode) : "";
  const codeChanged = Boolean(savedCode) && cleanCode !== savedCode;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Đã sao chép link.");
    } catch {
      toast.info("Hãy giữ vào link phía trên để sao chép.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-24px)] max-w-[460px] overflow-y-auto rounded-2xl p-5 sm:rounded-2xl">
        <DialogHeader className="text-left">
          <DialogTitle>Thông tin tư vấn của đại lý</DialogTitle>
          <DialogDescription>
            Ai mở catalog bằng link riêng này sẽ thấy nút Gọi tư vấn và Zalo tư vấn theo số bên
            dưới. Tài khoản do đại lý tạo cũng thấy thông tin này khi đăng nhập.
          </DialogDescription>
        </DialogHeader>

        {profile.isPending ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        ) : profile.isError ? (
          <p className="text-sm text-destructive">
            Không tải được thông tin. Vui lòng đóng và mở lại.
          </p>
        ) : (
          <div className="space-y-3">
            {link ? (
              <div className="rounded-xl border border-border bg-secondary p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Link riêng {active ? "(đang bật)" : "(đang tắt)"}
                </p>
                <p className="mt-1 break-all text-sm font-semibold text-foreground select-all">
                  {link}
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={copyLink}>
                  <Copy className="size-4" /> Sao chép link
                </Button>
              </div>
            ) : (
              <p className="rounded-xl border border-border bg-secondary p-3 text-xs text-muted-foreground">
                Chưa có link riêng. Điền thông tin bên dưới rồi bấm Lưu để tạo link.
              </p>
            )}

            <Field label="Mã trên link">
              <Input
                value={code}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
                placeholder="vd: minh-auto"
                onChange={(e) => setCode(e.target.value.toLowerCase())}
                onBlur={() => setCode(normalizeDealerCode(code))}
              />
            </Field>
            <p className="-mt-1 text-xs text-muted-foreground">
              {!codeValid
                ? "Mã dài 3–30 ký tự: chữ thường không dấu, số, gạch nối; bắt đầu bằng chữ."
                : codeChanged
                  ? "Đổi mã thì link cũ đã gửi đi sẽ không còn hiện thông tin của đại lý."
                  : `Link sẽ là …/d/${cleanCode}`}
            </p>

            <Field label="Tên cửa hàng / đại lý">
              <Input
                value={shopName}
                maxLength={80}
                placeholder="vd: Minh Auto Đà Nẵng"
                onChange={(e) => setShopName(e.target.value)}
              />
            </Field>
            <Field label="Số gọi tư vấn">
              <Input
                value={phone}
                type="tel"
                inputMode="tel"
                maxLength={20}
                placeholder="vd: 0912345678"
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Số Zalo tư vấn">
              <Input
                value={zalo}
                type="tel"
                inputMode="tel"
                maxLength={20}
                placeholder="Để trống nếu trùng số gọi"
                onChange={(e) => setZalo(e.target.value)}
              />
            </Field>
            <Field label="Ghi chú cuối trang sản phẩm">
              <Textarea
                rows={4}
                value={note}
                maxLength={NOTE_MAX}
                placeholder="vd: Giá đã gồm VAT. Liên hệ 0912345678 để nhận chính sách đại lý."
                onChange={(e) => setNote(e.target.value)}
              />
            </Field>
            <p className="-mt-1 text-xs text-muted-foreground">
              Hiện với người đã đăng nhập. Để trống thì dùng ghi chú chung của SK. {note.length}/
              {NOTE_MAX}
            </p>

            {staff ? (
              <label className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-sm">
                <span>Bật link và thông tin tư vấn</span>
                <Switch checked={active} onCheckedChange={setActive} />
              </label>
            ) : !active ? (
              <p className="text-xs text-destructive">
                Link của bạn đang bị SK tạm tắt. Vui lòng liên hệ SK để bật lại.
              </p>
            ) : null}

            <Button className="w-full" disabled={!canSave} onClick={() => save.mutate()}>
              {save.isPending ? "Đang lưu…" : "Lưu thông tin"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
