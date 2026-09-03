/**
 * Trạng thái đăng nhập + quyền admin / đại lý cấp 1, dùng để ẩn/hiện các nút quản trị tại chỗ.
 * Người dùng thường sẽ luôn nhận `isAdmin = false` nên không thấy nút nào.
 *
 * TỐI ƯU: nhiều component cùng gọi useAdmin() → tất cả dùng chung MỘT truy vấn
 * React Query (không bắn trùng request), và 4 kiểm tra quyền chạy SONG SONG
 * thay vì nối tiếp. Khách chưa đăng nhập không phát sinh request mạng nào.
 */
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  checkCanViewDealerPrice,
  checkIsAdmin,
  checkIsDealer1,
  checkIsManager,
} from "@/data/admin.api";

// Chỉ nạp lại giá nhập một lần cho mỗi phiên đăng nhập, tránh vòng lặp invalidate.
let refreshedForUser: string | null = null;

const NO_ROLES = {
  isAdmin: false,
  isManager: false,
  isDealer1: false,
  canViewDealerPrice: false,
};

export function useAdmin() {
  const queryClient = useQueryClient();
  // undefined = chưa xác định phiên; null = khách; string = user id.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "INITIAL_SESSION") return;
      setUserId(session?.user.id ?? null);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const roles = useQuery({
    queryKey: ["auth-roles", userId ?? "anon"],
    enabled: userId !== undefined,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      if (!userId) return NO_ROLES;
      const [isAdmin, isManager, isDealer1, canViewDealerPrice] = await Promise.all([
        checkIsAdmin(userId),
        checkIsManager(userId),
        checkIsDealer1(userId),
        checkCanViewDealerPrice(userId),
      ]);
      return { isAdmin, isManager, isDealer1, canViewDealerPrice };
    },
  });

  const data = roles.data ?? NO_ROLES;

  // Giá nhập nạp riêng theo quyền → chỉ cần làm mới đúng nhóm query đó.
  useEffect(() => {
    if (userId === undefined) return;
    if (!userId) {
      refreshedForUser = null;
      return;
    }
    if (data.canViewDealerPrice && refreshedForUser !== userId) {
      refreshedForUser = userId;
      void queryClient.invalidateQueries({ queryKey: ["dealer-prices"] });
    }
  }, [userId, data.canViewDealerPrice, queryClient]);

  return {
    isAdmin: data.isAdmin,
    isManager: data.isManager,
    // canManage: admin hoặc quản trị viên — được chỉnh sửa nội dung catalog tại chỗ.
    canManage: data.isAdmin || data.isManager,
    isDealer1: data.isDealer1,
    canViewDealerPrice: data.canViewDealerPrice,
    isAuthenticated: typeof userId === "string",
    ready: userId !== undefined && (userId === null || roles.isSuccess || roles.isError),
  };
}
