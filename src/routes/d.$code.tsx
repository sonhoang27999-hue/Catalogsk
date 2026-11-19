/**
 * Link riêng của đại lý cấp 1: /d/<mã> → mở trang chủ kèm ?dl=<mã>.
 * Từ đó mã đi theo mọi trang (xem __root.tsx) và được nhớ trong trình duyệt,
 * nên nút Gọi/Zalo tư vấn luôn trỏ về đúng đại lý đã gửi link.
 */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { isDealerCode } from "@/lib/dealerLink";

export const Route = createFileRoute("/d/$code")({
  beforeLoad: ({ params }) => {
    const code = params.code.trim().toLowerCase();
    // Mã sai định dạng: về trang gốc, không gắn gì.
    throw redirect({ to: "/", search: isDealerCode(code) ? { dl: code } : {}, replace: true });
  },
});
