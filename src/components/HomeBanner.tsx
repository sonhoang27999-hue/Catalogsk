/**
 * Ảnh bìa trang chủ. Admin có thể đổi ảnh trực tiếp bằng cách dán URL ảnh (CDN).
 * Ảnh hiển thị full chiều rộng container, giữ tỷ lệ 16:9.
 */
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ImageUp } from "lucide-react";
import { toast } from "sonner";
import defaultBanner from "@/assets/banner.jpg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/admin/AddTile";
import { HOME_BANNER_KEY, saveSetting, settingsQueryOptions } from "@/data/settings.api";
import { useAdmin } from "@/hooks/useAdmin";
import { SmartImage } from "@/components/SmartImage";

export function HomeBanner() {
  const { canManage: isAdmin } = useAdmin();
  const settings = useQuery(settingsQueryOptions);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const src = settings.data?.[HOME_BANNER_KEY]?.trim() || defaultBanner;

  const save = useMutation({
    mutationFn: () => saveSetting(HOME_BANNER_KEY, url.trim()),
    onSuccess: async () => {
      await settings.refetch();
      setOpen(false);
      toast.success("Đã cập nhật ảnh bìa.");
    },
    onError: (e: Error) => toast.error(e.message || "Không lưu được."),
  });

  return (
    <div className="relative bg-transparent">
      <div className="sk-hero relative overflow-hidden">
        <SmartImage
          src={src}
          alt="Phụ kiện ô tô cao cấp"
          width={1280}
          height={720}
          size="preview"
          sizes="(max-width: 960px) 100vw, 960px"
          eager
          // Chỉ khi MỌI đường tải (trực tiếp + proxy + link gốc) đều hỏng mới dùng
          // ảnh bìa mặc định — không dùng ảnh sản phẩm chung chung gây hiểu nhầm.
          fallback={defaultBanner}
          className="sk-hero-image w-full object-cover"
        />
        <div className="sk-hero-copy absolute inset-x-0 bottom-0 z-10 px-5 pb-6 sm:px-8">
          <p className="sk-gradient-text text-6xl font-extrabold leading-none sm:text-7xl">SK</p>
          <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-4xl">
            Ambient Light Luxury
          </h1>
        </div>
      </div>

      {isAdmin ? (
        <>
          <button
            type="button"
            aria-label="Đổi ảnh bìa"
            onClick={() => {
              setUrl(settings.data?.[HOME_BANNER_KEY] ?? "");
              setOpen(true);
            }}
            className="absolute top-5 right-5 flex items-center gap-1 rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-lg active:scale-95"
          >
            <ImageUp className="size-3.5" /> Đổi ảnh
          </button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-[calc(100vw-24px)] max-w-[440px] rounded-2xl p-5 sm:rounded-2xl">
              <DialogHeader>
                <DialogTitle>Ảnh bìa trang chủ</DialogTitle>
                <DialogDescription>
                  Dán đường dẫn ảnh (URL). Để trống để dùng lại ảnh mặc định.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Field label="URL ảnh">
                  <Input
                    value={url}
                    placeholder="https://res.cloudinary.com/..."
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </Field>
                {url.trim() ? (
                  <SmartImage
                    src={url.trim()}
                    alt="Xem trước ảnh bìa"
                    size="thumb"
                    className="aspect-video w-full rounded-lg bg-muted object-cover"
                  />
                ) : null}
                <Button className="w-full" disabled={save.isPending} onClick={() => save.mutate()}>
                  Lưu ảnh bìa
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </div>
  );
}
