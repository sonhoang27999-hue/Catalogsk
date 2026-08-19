/**
 * Gộp "Danh sách đại lý đăng ký" và "Quản lý tài khoản" vào một khối duy nhất
 * với 2 tab, giúp menu quản trị gọn hơn.
 */
import { Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountManager } from "@/components/admin/AccountManager";
import { DealerApplications } from "@/components/admin/DealerApplications";

export function DealerCenter({ pendingCount = 0 }: { pendingCount?: number } = {}) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Users className="size-4" /> Đại lý & tài khoản
        {pendingCount > 0 ? (
          <span className="rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-4 text-destructive-foreground">
            {pendingCount} mới
          </span>
        ) : null}
      </p>

      <Tabs defaultValue="applications" className="mt-3">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="applications" className="gap-1 text-xs">
            Đăng ký
            {pendingCount > 0 ? (
              <span className="flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                {pendingCount}
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="accounts" className="text-xs">
            Tài khoản
          </TabsTrigger>
        </TabsList>
        <TabsContent value="applications" className="mt-2">
          <DealerApplications embedded />
        </TabsContent>
        <TabsContent value="accounts" className="mt-2">
          <AccountManager embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}
