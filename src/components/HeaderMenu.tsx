import { useEffect, useState } from "react";
import { ClipboardList, LogIn, LogOut, Menu, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { displayLogin } from "@/lib/username";
import { useAdmin } from "@/hooks/useAdmin";
import { usePendingDealerApplications } from "@/hooks/usePendingDealerApplications";
import { DealerCenter } from "@/components/admin/DealerCenter";
import { ChangePassword } from "@/components/ChangePassword";
import { ThemeManager } from "@/components/admin/ThemeManager";
import { ExcelImport } from "@/components/admin/ExcelImport";


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
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pendingCount = usePendingDealerApplications(isAdmin);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
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
                      ) : (
                        "Người dùng"
                      )}
                    </p>
                  </div>
                </div>
                {isAdmin ? (
                  <>
                    <DealerCenter pendingCount={pendingCount} />
                    <ExcelImport />
                    <ThemeManager />
                  </>
                ) : null}

                <ChangePassword />

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
