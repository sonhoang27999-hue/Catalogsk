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

type PriceMaps = { ex: Record<string, number>; vat: Record<string, number> };

export function useDealerPrices(
  enabled: boolean,
  productIds?: string[],
  which: keyof PriceMaps = "ex",
) {
  const ids = productIds ? [...new Set(productIds)].sort() : undefined;

  const { data } = useQuery({
    queryKey: ids ? [...catalogKeys.dealerPrices, ids] : catalogKeys.dealerPrices,
    enabled: enabled && (ids === undefined || ids.length > 0),
    staleTime: 60_000,
    queryFn: async () => {
      let query = supabase.from("product_dealer_prices").select("*");
      if (ids) query = query.in("product_id", ids);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const maps: PriceMaps = { ex: {}, vat: {} };
      for (const row of (data ?? []) as Array<{
        product_id: string;
        dealer_price: number | null;
        dealer_price_vat?: number | null;
      }>) {
        if (row.dealer_price != null) maps.ex[row.product_id] = Number(row.dealer_price);
        if (row.dealer_price_vat != null) maps.vat[row.product_id] = Number(row.dealer_price_vat);
      }
      return maps;
    },
    select: (m: PriceMaps) => m[which],
  });

  return data ?? {};
}
