/**
 * Sửa đường dẫn trang Hướng dẫn sử dụng LED (chỉ admin).
 * Link lưu trên Cloud (site_settings) — khách vãng lai nhìn thấy thay đổi ngay.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  GUIDE_APK_KEY,
  GUIDE_IOS_KEY,
  GUIDE_SOURCE_KEY,
  saveSettings,
  settingsQueryOptions,
} from "@/data/settings.api";

const FIELDS = [
  { key: GUIDE_SOURCE_KEY, label: "Bài hướng dẫn đầy đủ (sklight.vn)" },
  { key: GUIDE_IOS_KEY, label: "Link tải App Store (iOS)" },
  { key: GUIDE_APK_KEY, label: "Link tải APK (Android)" },
] as const;

export function GuideLinkManager() {
  const qc = useQueryClient();
  const settings = useQuery(settingsQueryOptions);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setDraft({
        [GUIDE_SOURCE_KEY]: settings.data?.[GUIDE_SOURCE_KEY] ?? "",
        [GUIDE_IOS_KEY]: settings.data?.[GUIDE_IOS_KEY] ?? "",
        [GUIDE_APK_KEY]: settings.data?.[GUIDE_APK_KEY] ?? "",
      });
    }
  }, [open, settings.data]);

  const save = useMutation({
    mutationFn: async () => {
      await saveSettings({ ...draft });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
      setOpen(false);
      toast.success("Đã lưu đường dẫn hướng dẫn.");
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Link2 className="size-4" /> Link trang hướng dẫn
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] w-[calc(100vw-24px)] max-w-[420px] overflow-hidden rounded-3xl border border-border bg-background p-0 shadow-2xl">
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-start justify-between px-6 pt-6 pb-4">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                Link trang hướng dẫn
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">
                Để trống sẽ dùng đường dẫn mặc định.
              </DialogDescription>
            </div>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-6 pb-4">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="mb-1 block text-xs font-medium text-muted-foreground">
                  {f.label}
                </span>
                <input
                  type="url"
                  value={draft[f.key] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2.5 text-sm text-foreground outline-none focus:border-gold"
                />
              </label>
            ))}
          </div>
          <div className="border-t border-border bg-secondary/30 px-6 py-4">
            <Button
              disabled={save.isPending}
              onClick={() => save.mutate()}
              className="w-full rounded-xl bg-primary py-5 font-semibold text-primary-foreground shadow-lg hover:bg-primary/90"
            >
              <Save className="size-4" /> Lưu đường dẫn
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
