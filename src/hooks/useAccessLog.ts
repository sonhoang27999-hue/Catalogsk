/**
 * Ghi nhận lượt truy cập của tài khoản đang đăng nhập:
 * - sự kiện "login" khi đăng nhập
 * - sự kiện "view" mỗi khi chuyển trang (chống ghi trùng trong 60 giây)
 */
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { logAccess } from "@/data/accessLog.api";

const recent = new Map<string, number>();

const logOnce = (path: string) => {
  const now = Date.now();
  const last = recent.get(path) ?? 0;
  if (now - last < 60_000) return;
  recent.set(path, now);
  void logAccess("view", path).catch(() => undefined);
};

export function useAccessLog() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN") return;
      recent.clear();
      void logAccess("login", window.location.pathname).catch(() => undefined);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) logOnce(pathname);
    });
  }, [pathname]);
}
