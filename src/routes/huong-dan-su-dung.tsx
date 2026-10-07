import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink, Phone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  GUIDE_APK_KEY,
  GUIDE_IOS_KEY,
  GUIDE_SOURCE_KEY,
  settingsQueryOptions,
} from "@/data/settings.api";

const SOURCE =
  "https://sklight.vn/huong-dan-su-dung-led-vien-noi-that-s2pro-led-noi-that-theo-xe-sk-ambient-light";
const APK = "https://drive.google.com/file/d/1y5N5KfUkba5K_pJpjMR5VSEOl2JHhsWD/view?usp=drive_link";
const IOS = "https://apps.apple.com/vn/search?term=SK%20Ambient%20Light";

/** Link mặc định nếu admin chưa đặt đường dẫn riêng. */
function useGuideLinks() {
  const { data } = useQuery(settingsQueryOptions);
  return {
    source: data?.[GUIDE_SOURCE_KEY]?.trim() || SOURCE,
    ios: data?.[GUIDE_IOS_KEY]?.trim() || IOS,
    apk: data?.[GUIDE_APK_KEY]?.trim() || APK,
  };
}

export const Route = createFileRoute("/huong-dan-su-dung")({
  head: () => ({
    meta: [
      { title: "Hướng dẫn sử dụng LED SK Ambient Light" },
      {
        name: "description",
        content: "4 bước kích hoạt, tải ứng dụng, kết nối và sử dụng LED nội thất SK Ambient Light.",
      },
      { property: "og:title", content: "Hướng dẫn sử dụng LED SK Ambient Light" },
      {
        property: "og:description",
        content: "Kích hoạt sản phẩm, tải app iOS/Android và điều khiển LED nội thất.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GuidePage,
});

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <h2 className="mb-3 flex items-center gap-3 text-base font-semibold">
        <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {n}
        </span>
        {title}
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

function LinkBtn({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button asChild variant="outline" className="w-full">
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children} <ExternalLink className="size-4" />
      </a>
    </Button>
  );
}

function GuidePage() {
  const links = useGuideLinks();
  return (
    <div className="pb-8">
      <PageHeader title="Hướng dẫn sử dụng LED" />
      <div className="space-y-4 px-4 pt-4">
        <p className="text-sm text-muted-foreground">
          Sau khi lắp bộ LED nội thất SK Ambient Light, thực hiện đúng 4 bước dưới đây.
        </p>
        <Step n={1} title="Kích hoạt sản phẩm">
          <p>Truy cập sklight.vn (hoặc quét mã QR trên bao bì), chọn "Kích hoạt sản phẩm".</p>
          <p>Điền đầy đủ thông tin, nhấn "Nhận mã kích hoạt", sao chép và lưu lại mã.</p>
          <p className="text-foreground">
            ⚠️ Mỗi mã chỉ dùng cho 01 bộ sản phẩm, không chia sẻ cho người khác.
          </p>
          <img
            src="https://sklight.vn/wp-content/uploads/hd-ma-kich-hoat.webp"
            alt="Hướng dẫn lấy mã kích hoạt"
            loading="lazy"
            decoding="async"
            className="h-auto w-full rounded-lg"
          />
          <LinkBtn href="https://sklight.vn">Mở sklight.vn</LinkBtn>
        </Step>
        <Step n={2} title="Tải ứng dụng SK Ambient Light">
          <p>iPhone: mở App Store, tìm "SK Ambient Light" và cài đặt.</p>
          <p>Android: tải file APK chính thức. Nếu máy hỏi, cho phép cài từ nguồn này.</p>
          <LinkBtn href={links.ios}>Tải trên App Store</LinkBtn>
          <LinkBtn href={links.apk}>Tải APK cho Android</LinkBtn>
        </Step>
        <Step n={3} title="Kết nối & nhập mã kích hoạt">
          <p>Bật Bluetooth trên điện thoại, mở ứng dụng và kết nối với bộ LED trên xe.</p>
          <p>Nhập mã kích hoạt ở Bước 1 để mở khóa đầy đủ tính năng.</p>
        </Step>
        <Step n={4} title="Sử dụng các tính năng LED">
          <p>Tùy dòng xe và phiên bản, bạn có thể:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tùy chỉnh màu sắc theo sở thích</li>
            <li>Chọn hiệu ứng chuyển màu, nháy theo nhạc</li>
            <li>Điều chỉnh độ sáng và tốc độ hiệu ứng</li>
          </ul>
        </Step>
        <LinkBtn href={links.source}>Xem bài hướng dẫn đầy đủ</LinkBtn>
        <Button asChild className="w-full">
          <a href="tel:0868055555">
            <Phone className="size-4" /> Hỗ trợ: 0868055555
          </a>
        </Button>
      </div>
    </div>
  );
}
