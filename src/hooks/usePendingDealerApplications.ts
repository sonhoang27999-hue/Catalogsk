/**
 * Đếm số hồ sơ đại lý đang chờ duyệt (chỉ dùng cho admin).
 * Tự làm mới mỗi 30 giây để admin thấy thông báo khi có đăng ký mới.
 */
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function usePendingDealerApplications(enabled: boolean) {
  const seen = useRef<number | null>(null);

  const query = useQuery({
    queryKey: ["dealer-applications", "pending-count"],
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("dealer_applications")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw new Error(error.message);
      return count ?? 0;
    },
  });

  const count = query.data ?? 0;

  useEffect(() => {
    if (!enabled || query.data === undefined) return;
    if (seen.current !== null && count > seen.current) {
      toast.info(`Có ${count - seen.current} đại lý vừa đăng ký`, {
        description: "Mở menu › Đại lý & tài khoản để duyệt hồ sơ.",
      });
    }
    seen.current = count;
  }, [count, enabled, query.data]);

  return count;
}
