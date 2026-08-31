/**
 * Sao lưu / khôi phục / xoá toàn bộ dữ liệu (chỉ admin nhìn thấy).
 */
import { useRef, useState } from "react";
import { Download, DatabaseBackup, RotateCcw, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import {
  downloadJson,
  exportBackup,
  resetAllData,
  restoreBackup,
  type BackupFile,
} from "@/data/backup.api";
import { useRefreshCatalog } from "@/hooks/useRefreshCatalog";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function BackupManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState("");
  const [pending, setPending] = useState<BackupFile | null>(null);
  const [fileName, setFileName] = useState("");
  const refresh = useRefreshCatalog();

  const backup = useMutation({
    mutationFn: exportBackup,
    onSuccess: (data) => {
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      downloadJson(data, `sao-luu-${stamp}.json`);
      const total = Object.values(data.tables).reduce((s, r) => s + r.length, 0);
      toast.success(
        `Đã tải file sao lưu (${total} bản ghi, ${data.accounts?.length ?? 0} tài khoản).`,
      );
    },
    onError: (e: Error) => toast.error(e.message || "Sao lưu thất bại."),
  });

  const reset = useMutation({
    mutationFn: () => resetAllData(setStep),
    onSuccess: async () => {
      setStep("");
      await refresh();
      toast.success("Đã xoá toàn bộ dữ liệu danh mục.");
    },
    onError: (e: Error) => {
      setStep("");
      toast.error(e.message || "Xoá dữ liệu thất bại.");
    },
  });

  const restore = useMutation({
    mutationFn: async () => {
      if (!pending) throw new Error("Chưa chọn file sao lưu.");
      await restoreBackup(pending, setStep);
    },
    onSuccess: async () => {
      setStep("");
      setPending(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
      toast.success("Đã khôi phục dữ liệu từ file sao lưu.");
    },
    onError: (e: Error) => {
      setStep("");
      toast.error(e.message || "Khôi phục thất bại.");
    },
  });

  const pick = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as BackupFile;
      if (parsed?.app !== "sk-catalog" || !parsed.tables) {
        throw new Error("File không đúng định dạng sao lưu của hệ thống.");
      }
      setPending(parsed);
      setFileName(file.name);
    } catch (e) {
      setPending(null);
      setFileName("");
      toast.error((e as Error).message || "Không đọc được file sao lưu.");
    }
  };

  const busy = backup.isPending || reset.isPending || restore.isPending;
  const count = pending
    ? Object.values(pending.tables).reduce((s, r) => s + (r?.length ?? 0), 0)
    : 0;

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <DatabaseBackup className="size-4" /> Sao lưu & khôi phục dữ liệu
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Bao gồm hãng xe, đời xe, mục cây, sản phẩm, giá nhập, video, cấu hình giao diện và cả tài
        khoản đăng nhập + hồ sơ đại lý (quyền xem giá nhập). Vì lý do bảo mật, mật khẩu không được
        xuất ra: tài khoản tạo lại khi khôi phục sẽ dùng mật khẩu mặc định là tên đăng nhập.
      </p>

      <div className="mt-3 space-y-2">
        <Button
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() => backup.mutate()}
        >
          <Download className="size-4" />
          {backup.isPending ? "Đang tạo file..." : "Tải file sao lưu (.json)"}
        </Button>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void pick(f);
          }}
        />
        <Button
          variant="outline"
          className="w-full"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="size-4" /> Chọn file sao lưu để khôi phục
        </Button>

        {pending ? (
          <div className="rounded-xl border border-border p-3 text-xs text-muted-foreground">
            <p className="truncate font-medium text-foreground">{fileName}</p>
            <p className="mt-0.5">
              {count} bản ghi • {pending.accounts?.length ?? 0} tài khoản • tạo lúc{" "}
              {pending.created_at ? new Date(pending.created_at).toLocaleString("vi-VN") : "—"}
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="mt-2 w-full" disabled={busy}>
                  <RotateCcw className="size-4" />
                  {restore.isPending ? "Đang khôi phục..." : "Khôi phục dữ liệu"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Khôi phục từ file sao lưu?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Toàn bộ dữ liệu danh mục hiện tại sẽ bị xoá và thay bằng dữ liệu trong file. Tài
                    khoản đăng nhập và hồ sơ đại lý còn thiếu sẽ được tạo lại (mật khẩu mặc định là
                    tên đăng nhập); tài khoản đang có sẽ được giữ nguyên. Thao tác này không thể
                    hoàn tác.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                  <AlertDialogAction onClick={() => restore.mutate()}>Khôi phục</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full" disabled={busy}>
              <Trash2 className="size-4" />
              {reset.isPending ? "Đang xoá..." : "Xoá toàn bộ dữ liệu (Reset)"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Xoá toàn bộ dữ liệu?</AlertDialogTitle>
              <AlertDialogDescription>
                Hãng xe, đời xe, mục cây, sản phẩm, giá nhập và video sẽ bị xoá vĩnh viễn. Nên tải
                file sao lưu trước khi thực hiện.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Huỷ</AlertDialogCancel>
              <AlertDialogAction onClick={() => reset.mutate()}>Xoá tất cả</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {busy && step ? (
          <p className="text-center text-[11px] text-muted-foreground">Đang xử lý: {step}…</p>
        ) : null}
      </div>
    </section>
  );
}
