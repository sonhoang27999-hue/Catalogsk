/**
 * Nạp giá nhập ở phía trình duyệt (sau khi đã đăng nhập).
 * Dữ liệu catalog có thể được render sẵn trên server khi chưa có phiên đăng nhập,
 * nên giá nhập luôn được lấy riêng ở client cho tài khoản có quyền.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDealerPrices(enabled: boolean) {
  const { data } = useQuery({
    queryKey: ["dealer-prices"],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_dealer_prices")
        .select("product_id, dealer_price");
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
