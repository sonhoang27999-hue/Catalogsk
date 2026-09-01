/**
 * Trung tâm cài đặt chuyên sâu (chỉ admin): gộp Đại lý & tài khoản,
 * Nhập bảng giá Excel, Sao lưu & khôi phục vào 1 cửa sổ rộng,
 * tối ưu thao tác trên màn hình máy tính bàn.
 */
import { useState } from "react";
import { DatabaseBackup, FileSpreadsheet, History, Settings2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DealerCenter } from "@/components/admin/DealerCenter";
import { ExcelImport } from "@/components/admin/ExcelImport";
import { BackupManager } from "@/components/admin/BackupManager";
import { AccessLogs } from "@/components/admin/AccessLogs";

export function AdminSettings({ pendingCount = 0 }: { pendingCount?: number } = {}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Settings2 className="size-4" /> Cài đặt chuyên sâu
          {pendingCount > 0 ? (
            <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-bold leading-4 text-destructive-foreground">
              {pendingCount}
            </span>
          ) : null}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-4 sm:max-w-3xl lg:max-w-5xl xl:max-w-6xl sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Settings2 className="size-4" /> Cài đặt chuyên sâu
          </DialogTitle>
          <DialogDescription>
            Quản lý đại lý, nhập bảng giá và sao lưu dữ liệu trong cùng một nơi.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="dealers" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dealers" className="gap-1.5 text-xs sm:text-sm">
              <Users className="size-4" />
              <span className="hidden sm:inline">Đại lý & tài khoản</span>
              <span className="sm:hidden">Đại lý</span>
              {pendingCount > 0 ? (
                <span className="flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-4 text-destructive-foreground">
                  {pendingCount}
                </span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="excel" className="gap-1.5 text-xs sm:text-sm">
              <FileSpreadsheet className="size-4" />
              <span className="hidden sm:inline">Nhập bảng giá Excel</span>
              <span className="sm:hidden">Bảng giá</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5 text-xs sm:text-sm">
              <History className="size-4" />
              <span className="hidden sm:inline">Lịch sử truy cập</span>
              <span className="sm:hidden">Lịch sử</span>
            </TabsTrigger>
            <TabsTrigger value="backup" className="gap-1.5 text-xs sm:text-sm">
              <DatabaseBackup className="size-4" />
              <span className="hidden sm:inline">Sao lưu & khôi phục</span>
              <span className="sm:hidden">Sao lưu</span>
            </TabsTrigger>
          </TabsList>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
            <TabsContent value="dealers" className="mt-0">
              <DealerCenter pendingCount={pendingCount} />
            </TabsContent>
            <TabsContent value="excel" className="mt-0">
              <ExcelImport />
            </TabsContent>
            <TabsContent value="logs" className="mt-0">
              <AccessLogs embedded />
            </TabsContent>
            <TabsContent value="backup" className="mt-0">
              <BackupManager />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
