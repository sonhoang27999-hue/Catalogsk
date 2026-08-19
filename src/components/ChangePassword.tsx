/**
 * Cho phép người dùng đang đăng nhập (đại lý) tự đổi mật khẩu.
 */
import { useState } from "react";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Mật khẩu tối thiểu 6 ký tự.");
      return;
    }
    if (password !== confirm) {
      toast.error("Mật khẩu nhập lại chưa khớp.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setPassword("");
      setConfirm("");
      toast.success("Đã đổi mật khẩu.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không đổi được mật khẩu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-xl border border-border p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <KeyRound className="size-4" /> Đổi mật khẩu
      </p>
      <div className="mt-3 space-y-2">
        <div className="space-y-1">
          <Label htmlFor="new-pass" className="text-xs">
            Mật khẩu mới
          </Label>
          <Input
            id="new-pass"
            type="password"
            maxLength={72}
            value={password}
            placeholder="tối thiểu 6 ký tự"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="new-pass-2" className="text-xs">
            Nhập lại mật khẩu
          </Label>
          <Input
            id="new-pass-2"
            type="password"
            maxLength={72}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Đang lưu..." : "Cập nhật mật khẩu"}
        </Button>
      </div>
    </form>
  );
}
