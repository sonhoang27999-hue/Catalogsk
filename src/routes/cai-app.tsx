import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Download, Share, Smartphone, PlusSquare, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import { CATALOG_APK_KEY, saveSetting, settingsQueryOptions } from "@/data/settings.api";

export const Route = createFileRoute("/cai-app")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQueryOptions),
  head: () => ({
    meta: [
      { title: "Cài APP | SK Ambient Light Luxury" },
      { name: "description", content: "Tải APK catalog SK cho Android và hướng dẫn thêm ứng dụng vào màn hình chính iPhone." },
      { property: "og:title", content: "Cài APP | SK Ambient Light Luxury" },
      { property: "og:description", content: "Cài catalog SK trên Android hoặc thêm vào màn hình chính iPhone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InstallPage,
});

function InstallPage() {
  const { data: settings } = useSuspenseQuery(settingsQueryOptions);
  const { isAdmin } = useAdmin();
  const apk = settings[CATALOG_APK_KEY]?.trim() ?? "";
  return (
    <div className="pb-10">
      <PageHeader title="Cài APP" />
      <div className="px-4">
        <div className="flex items-center gap-3 py-6">
          <img src="/icon-192.png" alt="SK" width={64} height={64} className="size-16 rounded-lg" />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-foreground">SK Ambient Light Luxury</h1>
            <p className="mt-1 text-sm text-muted-foreground">Danh mục phụ kiện ô tô</p>
          </div>
        </div>
        <section className="space-y-4 border-t border-border py-6">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Smartphone className="size-5 text-primary" /> Android</h2>
          {apk ? (
            <Button asChild className="h-11 w-full">
              <a href={apk} target="_blank" rel="noopener noreferrer"><Download className="size-4" /> Tải APK Android</a>
            </Button>
          ) : (
            <><Button disabled className="h-11 w-full"><Download className="size-4" /> Tải APK Android</Button><p className="text-sm text-muted-foreground">File APK chưa được cung cấp.</p></>
          )}
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Tải file APK về điện thoại rồi mở file vừa tải.</li>
            <li>Nếu máy yêu cầu, cho phép trình duyệt hoặc ứng dụng quản lý file cài đặt từ nguồn này.</li>
            <li>Chọn “Cài đặt”, sau đó mở ứng dụng SK. Bạn có thể tắt quyền cài từ nguồn này sau khi cài xong.</li>
          </ol>
          <p className="text-xs text-muted-foreground">Chỉ cài APK từ đường dẫn chính thức tại đây. Cần kết nối Internet để xem dữ liệu mới.</p>
        </section>
        <section className="space-y-4 border-t border-border py-6">
          <h2 className="flex items-center gap-2 text-base font-semibold"><Smartphone className="size-5 text-primary" /> iPhone / iPad</h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Mở trang web catalog SK này bằng <strong className="text-foreground">Safari</strong>. Nếu đang mở trong Zalo hoặc Facebook, hãy mở lại bằng Safari.</li>
            <li>Nhấn <span className="inline-flex items-center gap-1 font-medium text-foreground"><Share className="size-4" /> Chia sẻ</span> trên thanh công cụ.</li>
            <li>Chọn <span className="inline-flex items-center gap-1 font-medium text-foreground"><PlusSquare className="size-4" /> Thêm vào Màn hình chính</span>. Nếu có lựa chọn “Mở dưới dạng ứng dụng web”, hãy bật.</li>
            <li>Nhấn “Thêm”. Biểu tượng SK sẽ xuất hiện trên màn hình chính.</li>
          </ol>
        </section>
        {isAdmin ? <ApkLinkEditor key={apk} initialValue={apk} /> : null}
      </div>
    </div>
  );
}

function ApkLinkEditor({ initialValue }: { initialValue: string }) {
  const [url, setUrl] = useState(initialValue);
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: () => saveSetting(CATALOG_APK_KEY, url.trim()),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: settingsQueryOptions.queryKey });
      toast.success("Đã lưu link tải APK catalog SK.");
    },
    onError: (error: Error) => toast.error(error.message || "Không lưu được link APK."),
  });
  return (
    <form className="space-y-3 border-t border-border py-6" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}>
      <label htmlFor="catalog-apk" className="block text-sm font-medium">Link tải APK catalog SK</label>
      <input id="catalog-apk" type="url" pattern="https://.*" placeholder="https://…" value={url} onChange={(event) => setUrl(event.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground" />
      <p className="text-xs text-muted-foreground">Dán link HTTPS tới file APK đã đóng gói từ trang Vercel của bạn. Đây không phải app điều khiển LED.</p>
      <Button type="submit" disabled={save.isPending}><Save className="size-4" /> {save.isPending ? "Đang lưu…" : "Lưu link APK"}</Button>
    </form>
  );
}