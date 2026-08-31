/**
 * Trạng thái đăng nhập + quyền admin, dùng để ẩn/hiện các nút quản trị tại chỗ.
 * Người dùng thường sẽ luôn nhận `isAdmin = false` nên không thấy nút nào.
 */
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { checkCanViewDealerPrice, checkIsAdmin } from "@/data/admin.api";

// Chỉ nạp lại catalog một lần cho mỗi phiên đăng nhập, tránh vòng lặp invalidate.
let refreshedForUser: string | null = null;

export function useAdmin() {
  const queryClient = useQueryClient();
  const [isAdmin, setIsAdmin] = useState(false);
  const [canViewDealerPrice, setCanViewDealerPrice] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    const evaluate = async (userId?: string) => {
      const ok = userId ? await checkIsAdmin(userId) : false;
      const canPrice = userId ? await checkCanViewDealerPrice(userId) : false;
      if (active) {
        setIsAdmin(ok);
        setCanViewDealerPrice(canPrice);
        setIsAuthenticated(!!userId);
        // Giá nhập nạp riêng theo quyền → chỉ cần làm mới đúng nhóm query đó.
        if (canPrice && userId && refreshedForUser !== userId) {
          refreshedForUser = userId;
          void queryClient.invalidateQueries({ queryKey: ["dealer-prices"] });
        }

        if (!userId) refreshedForUser = null;
      }
    };

    void supabase.auth.getSession().then(({ data }) => evaluate(data.session?.user.id));

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "INITIAL_SESSION") return;
      void evaluate(session?.user.id);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [queryClient]);

  return { isAdmin, canViewDealerPrice, isAuthenticated, ready };
}
