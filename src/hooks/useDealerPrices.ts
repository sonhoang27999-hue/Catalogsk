/**
 * Nạp giá nhập ở phía trình duyệt (sau khi đã đăng nhập).
 * Dữ liệu catalog có thể được render sẵn trên server khi chưa có phiên đăng nhập,
 * nên giá nhập luôn được lấy riêng ở client cho tài khoản có quyền.
 *
 * Có thể truyền danh sách productIds để chỉ lấy giá của những sản phẩm đang hiển thị.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { catalogKeys } from "@/data/catalog.queries";

export function useDealerPrices(enabled: boolean, productIds?: string[]) {
  const ids = productIds ? [...new Set(productIds)].sort() : undefined;

  const { data } = useQuery({
    queryKey: ids ? [...catalogKeys.dealerPrices, ids] : catalogKeys.dealerPrices,
    enabled: enabled && (ids === undefined || ids.length > 0),
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase.from("product_dealer_prices").select("product_id, dealer_price");
      if (ids) query = query.in("product_id", ids);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const map: Record<string, number> = {};
      for (const row of data ?? []) {
        if (row.dealer_price !== null) map[row.product_id] = Number(row.dealer_price);
      }
      return map;
    },
  });

  return data ?? {};
}
