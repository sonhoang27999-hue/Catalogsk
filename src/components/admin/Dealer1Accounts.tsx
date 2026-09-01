/**
 * Cửa sổ quản lý tài khoản dành cho đại lý cấp 1.
 * Chỉ hiển thị các tài khoản do chính đại lý cấp 1 đó tạo.
 */
import { useState } from "react";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AccountManager } from "@/components/admin/AccountManager";

export function Dealer1Accounts() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <Users className="size-4" /> Quản lý tài khoản đại lý
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden p-4 sm:max-w-2xl sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" /> Tài khoản đại lý của bạn
          </DialogTitle>
          <DialogDescription>
            Tạo và quản lý các tài khoản đại lý do bạn tạo ra.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          <AccountManager embedded />
        </div>
      </DialogContent>
    </Dialog>
  );
}
