import { lazy, Suspense, useEffect, useState } from "react";
import { ClipboardList, ImageOff, LogIn, LogOut, Menu, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { displayLogin } from "@/lib/username";
import { useAdmin } from "@/hooks/useAdmin";
import { usePendingDealerApplications } from "@/hooks/usePendingDealerApplications";

/**
 * TỐI ƯU TỐC ĐỘ: các module quản trị (nhập Excel/xlsx, sao lưu, tài khoản, chủ đề màu)
 * rất nặng và CHỈ người đăng nhập mới dùng — tách khỏi bundle khách vãng lai,
 * chỉ tải khi mở menu với quyền phù hợp.
 */
const AdminSettings = lazy(() =>
  import("@/components/admin/AdminSettings").then((m) => ({ default: m.AdminSettings })),
);
const ThemeManager = lazy(() =>
  import("@/components/admin/ThemeManager").then((m) => ({ default: m.ThemeManager })),
);
const Dealer1Accounts = lazy(() =>
  import("@/components/admin/Dealer1Accounts").then((m) => ({ default: m.Dealer1Accounts })),
);
const ChangePassword = lazy(() =>
  import("@/components/ChangePassword").then((m) => ({ default: m.ChangePassword })),
);

/** Ô chờ nhỏ trong lúc tải module quản trị (chỉ admin thấy, thoáng qua). */
function MenuItemSkeleton() {
  return <div className="h-9 w-full animate-pulse rounded-md bg-muted" />;
}

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const { isAdmin, isManager, isDealer1 } = useAdmin();
  const canSettings = isAdmin || isManager;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pendingCount = usePendingDealerApplications(canSettings);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Làm ấm module quản trị ở nền SAU khi đã biết quyền — mở menu không phải chờ tải.
  useEffect(() => {
    if (!email) return;
    void import("@/components/ChangePassword");
    if (canSettings) {
      void import("@/components/admin/AdminSettings");
      void import("@/components/admin/ThemeManager");
    } else if (isDealer1) {
      void import("@/components/admin/Dealer1Accounts");
    }
  }, [email, canSettings, isDealer1]);

  const signOut = async () => {
    // Không cancel/clear cache: sẽ làm useSuspenseQuery ném CancelledError (trắng trang).
    await supabase.auth.signOut();
    await qc.invalidateQueries();
    setOpen(false);
    toast.success("Đã đăng xuất");
    navigate({ to: "/", replace: true });
  };

  return (
    <>
      <button
        type="button"
        aria-label="Menu tài khoản"
        onClick={() => setOpen(true)}
        className="relative flex size-9 items-center justify-center rounded-full text-foreground transition-colors active:bg-secondary"
      >
        <Menu className="size-5" strokeWidth={2} />
        {pendingCount > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
            {pendingCount > 9 ? "9+" : pendingCount}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[300px] overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Tài khoản</SheetTitle>
            <SheetDescription>
              {email ? "Bạn đang đăng nhập." : "Đăng nhập để quản trị nội dung danh mục."}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 space-y-3 pb-4">
            {email ? (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-foreground">
                    <UserRound className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{displayLogin(email)}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      {isAdmin ? (
                        <>
                          <ShieldCheck className="size-3.5" /> Quản trị viên
                        </>
                      ) : isDealer1 ? (
                        <>
                          <ShieldCheck className="size-3.5" /> Đại lý cấp 1
                        </>
                      ) : (
                        "Người dùng"
                      )}
                    </p>
                  </div>
                </div>
                {canSettings ? (
                  <>
                    <Suspense fallback={<MenuItemSkeleton />}>
                      <AdminSettings pendingCount={pendingCount} isAdmin={isAdmin} />
                    </Suspense>
                    <Suspense fallback={<MenuItemSkeleton />}>
                      <ThemeManager />
                    </Suspense>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setOpen(false);
                        navigate({ to: "/anh-loi" });
                      }}
                    >
                      <ImageOff className="size-4" /> Thống kê ảnh lỗi
                    </Button>
                  </>
                ) : null}
                {!canSettings && isDealer1 ? (
                  <Suspense fallback={<MenuItemSkeleton />}>
                    <Dealer1Accounts />
                  </Suspense>
                ) : null}

                <Suspense fallback={<MenuItemSkeleton />}>
                  <ChangePassword />
                </Suspense>

                <Button variant="outline" className="w-full" onClick={signOut}>
                  <LogOut className="size-4" /> Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    navigate({ to: "/auth" });
                  }}
                >
                  <LogIn className="size-4" /> Đăng nhập
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    navigate({ to: "/dang-ky-dai-ly" });
                  }}
                >
                  <ClipboardList className="size-4" /> Đăng ký đại lý
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
