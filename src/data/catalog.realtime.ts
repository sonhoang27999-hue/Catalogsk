/**
 * Đồng bộ dữ liệu thời gian thực (Supabase Realtime) — module trung tâm.
 *
 * - MỘT kênh duy nhất cho các bảng công khai (categories, series, models, nodes,
 *   products, videos, site_settings), đăng ký một lần ở `__root`.
 * - MỘT kênh phụ cho `product_dealer_prices`, chỉ mở khi người dùng đã đăng nhập
 *   (bảng bị RLS chặn với khách vãng lai; mở kênh khi chưa có quyền sẽ làm hỏng
 *   kết nối realtime chung).
 * - Đếm tham chiếu ở cấp module → không bao giờ tạo subscription trùng khi điều hướng.
 * - Gộp sự kiện trong 300ms; nếu đang có mutation thì hoãn để tránh race condition.
 * - Chỉ invalidate ĐÚNG nhóm query bị ảnh hưởng, không reload toàn bộ ["catalog"].
 */
import { useEffect } from "react";
import type { QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { catalogKeys } from "@/data/catalog.queries";

type Table =
  | "categories"
  | "series"
  | "models"
  | "nodes"
  | "products"
  | "videos"
  | "site_settings"
  | "product_dealer_prices";

/** Các bảng ai cũng đọc được (RLS cho phép anon). */
const PUBLIC_TABLES: Table[] = [
  "categories",
  "series",
  "models",
  "nodes",
  "products",
  "videos",
  "site_settings",
];

/** Bảng nào thay đổi thì những nhóm query nào cần làm mới. */
const AFFECTED: Record<Table, readonly (readonly string[])[]> = {
  categories: [catalogKeys.categories, catalogKeys.categoryRoot],
  series: [catalogKeys.categoryRoot, catalogKeys.seriesRoot],
  models: [catalogKeys.seriesRoot],
  nodes: [catalogKeys.categoryRoot, catalogKeys.nodeRoot],
  products: [catalogKeys.categoryRoot, catalogKeys.seriesRoot, catalogKeys.nodeRoot],
  videos: [catalogKeys.seriesRoot],
  site_settings: [["site-settings"]],
  product_dealer_prices: [catalogKeys.dealerPrices],
};

let refCount = 0;
let publicChannel: ReturnType<typeof supabase.channel> | null = null;
let dealerChannel: ReturnType<typeof supabase.channel> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const pending = new Set<Table>();

const flush = (queryClient: QueryClient) => {
  timer = null;
  if (pending.size === 0) return;

  // Đang ghi dữ liệu (admin lưu) → chờ thêm một nhịp để không tranh chấp với mutation.
  if (queryClient.isMutating() > 0) {
    timer = setTimeout(() => flush(queryClient), 400);
    return;
  }

  const keys = new Set<string>();
  for (const table of pending) {
    for (const key of AFFECTED[table]) keys.add(JSON.stringify(key));
  }
  pending.clear();

  for (const key of keys) {
    // Invalidate trùng nhau vẫn an toàn: React Query gộp refetch cho cùng một query.
    void queryClient.invalidateQueries({ queryKey: JSON.parse(key) as unknown[] });
  }
};

const schedule = (queryClient: QueryClient, table: Table) => {
  pending.add(table);
  if (timer) return;
  timer = setTimeout(() => flush(queryClient), 300);
};

const listen = (ch: ReturnType<typeof supabase.channel>, table: Table, queryClient: QueryClient) =>
  ch.on(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    "postgres_changes" as any,
    { event: "*", schema: "public", table },
    () => schedule(queryClient, table),
  );

/** Đăng ký một lần ở root; các lần gọi sau chỉ tăng bộ đếm tham chiếu. */
export function useCatalogRealtime(queryClient: QueryClient) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    refCount += 1;
    let cancelled = false;

    if (!publicChannel) {
      try {
        void supabase.realtime.setAuth();
        const ch = supabase.channel("catalog-changes");
        for (const table of PUBLIC_TABLES) listen(ch, table, queryClient);
        ch.subscribe();
        publicChannel = ch;
      } catch {
        // Realtime không khả dụng: app vẫn chạy bình thường với cache + invalidation thủ công.
        publicChannel = null;
      }
    }

    // Kênh giá nhập: chỉ mở khi đã đăng nhập (RLS).
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled || !data.session || dealerChannel) return;
      try {
        const ch = supabase.channel("dealer-prices-changes");
        listen(ch, "product_dealer_prices", queryClient);
        ch.subscribe();
        dealerChannel = ch;
      } catch {
        dealerChannel = null;
      }
    });

    // Dự phòng khi WebSocket bị chặn: làm mới các query ĐANG hiển thị lúc quay lại tab.
    // Không polling định kỳ.
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.all,
        refetchType: "active",
      });
      void queryClient.invalidateQueries({
        queryKey: catalogKeys.dealerPrices,
        refetchType: "active",
      });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      refCount -= 1;
      if (refCount > 0) return;
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      pending.clear();
      const list = [publicChannel, dealerChannel].filter(Boolean);
      publicChannel = null;
      dealerChannel = null;
      for (const ch of list) void supabase.removeChannel(ch!);
    };
  }, [queryClient]);
}
