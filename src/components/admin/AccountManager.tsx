/**
 * Quản lý tài khoản: tạo tài khoản bằng tên đăng nhập + mật khẩu,
 * cấp/thu hồi quyền xem giá nhập, cấp quyền đại lý cấp 1 (chỉ quản trị viên),
 * đổi mật khẩu, xoá tài khoản.
 * Đại lý cấp 1 chỉ nhìn thấy và quản lý tài khoản do chính mình tạo.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Trash2, UserPlus, Users, Wallet, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  setAccountPassword,
  setAccountPriceViewer,
  setAccountRole,
  type AccountRole,
} from "@/lib/accounts.functions";
import { displayLogin, toLoginEmail } from "@/lib/username";
import { useAdmin } from "@/hooks/useAdmin";

const ROLE_LABEL: Record<AccountRole, string> = {
  admin: "Admin (toàn quyền)",
  manager: "Quản trị viên",
  dealer1: "Đại lý cấp 1",
  dealer: "Đại lý (xem giá nhập)",
  user: "Người dùng",
};

function roleOf(roles: string[]): AccountRole {
  if (roles.includes("admin")) return "admin";
  if (roles.includes("manager")) return "manager";
  if (roles.includes("dealer1")) return "dealer1";
  if (roles.includes("price_viewer")) return "dealer";
  return "user";
}

export function AccountManager({ embedded = false }: { embedded?: boolean } = {}) {
  const qc = useQueryClient();
  const { isAdmin, isManager } = useAdmin();
  // Quản trị viên (manager) có toàn quyền như admin, chỉ không cấp/sửa vai trò Admin.
  const full = isAdmin || isManager;
  const fetchList = useServerFn(listAccounts);
  const create = useServerFn(createAccount);
  const setPwd = useServerFn(setAccountPassword);
  const setViewer = useServerFn(setAccountPriceViewer);
  const setRole = useServerFn(setAccountRole);
  const remove = useServerFn(deleteAccount);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [priceViewer, setPriceViewer] = useState(true);
  const [newRole, setNewRole] = useState<AccountRole>("dealer");

  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => fetchList({}) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["accounts"] });

  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "Không thực hiện được.");

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: {
          email: toLoginEmail(username),
          password,
          priceViewer: priceViewer || newRole === "dealer1" || newRole === "dealer",
          role: newRole,
        },
      }),
    onSuccess: async () => {
      setUsername("");
      setPassword("");
      setNewRole("dealer");
      await refresh();
      toast.success("Đã tạo tài khoản.");
    },
    onError,
  });

  const viewerMut = useMutation({
    mutationFn: (v: { userId: string; enabled: boolean }) => setViewer({ data: v }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật quyền xem giá nhập.");
    },
    onError,
  });

  const roleMut = useMutation({
    mutationFn: (v: { userId: string; role: AccountRole }) => setRole({ data: v }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật phân quyền.");
    },
    onError,
  });


  const pwdMut = useMutation({
    mutationFn: (v: { userId: string; password: string }) => setPwd({ data: v }),
    onSuccess: () => toast.success("Đã đổi mật khẩu."),
    onError,
  });

  const delMut = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã xoá tài khoản.");
    },
    onError,
  });

  return (
    <div className={embedded ? "" : "rounded-xl border border-border p-3"}>
      {!embedded ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" /> Quản lý tài khoản
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {full
          ? "Tạo tài khoản bằng tên đăng nhập và mật khẩu, không cần email."
          : "Bạn là đại lý cấp 1: chỉ xem và quản lý các tài khoản do chính bạn tạo."}
      </p>

      <div className="mt-3 space-y-2">
        <div className="space-y-1">
          <Label htmlFor="acc-user" className="text-xs">
            Tên đăng nhập
          </Label>
          <Input
            id="acc-user"
            value={username}
            autoCapitalize="none"
            placeholder="vd: daily01"
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="acc-pass" className="text-xs">
            Mật khẩu
          </Label>
          <Input
            id="acc-pass"
            type="text"
            value={password}
            maxLength={72}
            placeholder="tối thiểu 6 ký tự"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {full ? (
          <div className="space-y-1">
            <Label className="flex items-center gap-1.5 text-xs">
              <ShieldCheck className="size-3.5" /> Phân quyền
            </Label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as AccountRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {isAdmin ? <SelectItem value="admin">Admin (toàn quyền)</SelectItem> : null}
                <SelectItem value="manager">Quản trị viên</SelectItem>
                <SelectItem value="dealer1">Đại lý cấp 1</SelectItem>
                <SelectItem value="dealer">Đại lý (xem giá nhập)</SelectItem>
                <SelectItem value="user">Người dùng</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <label className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs">
            <span className="flex items-center gap-1.5">
              <Wallet className="size-3.5" /> Cho xem giá nhập
            </span>
            <Switch checked={priceViewer} onCheckedChange={setPriceViewer} />
          </label>
        )}

        <Button
          className="w-full"
          disabled={!username.trim() || password.length < 6 || createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          <UserPlus className="size-4" /> Tạo tài khoản
        </Button>
      </div>

      <ul className="mt-4 space-y-2">
        {(accounts.data ?? []).map((a) => {
          const isViewer = a.roles.includes("price_viewer");
          const rowRole = roleOf(a.roles);
          const isRowAdmin = rowRole === "admin";
          return (
            <li key={a.id} className="rounded-lg border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{displayLogin(a.email)}</p>
                  <p className="text-[11px] text-muted-foreground">{ROLE_LABEL[rowRole]}</p>
                </div>
                <div className="flex items-center gap-2">
                  {!full && !isRowAdmin ? (
                    <Switch
                      checked={isViewer}
                      aria-label="Quyền xem giá nhập"
                      onCheckedChange={(v) => viewerMut.mutate({ userId: a.id, enabled: v })}
                    />
                  ) : null}
                  <button
                    type="button"
                    aria-label="Đổi mật khẩu"
                    className="text-muted-foreground"
                    onClick={() => {
                      const p = window.prompt(`Mật khẩu mới cho ${displayLogin(a.email)}`);
                      if (p) pwdMut.mutate({ userId: a.id, password: p });
                    }}
                  >
                    <KeyRound className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Xoá tài khoản"
                    className="text-destructive"
                    onClick={() => {
                      if (window.confirm(`Xoá tài khoản ${displayLogin(a.email)}?`))
                        delMut.mutate(a.id);
                    }}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              {full && !(isRowAdmin && !isAdmin) ? (
                <div className="mt-2 flex items-center gap-2">
                  <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
                  <Select
                    value={rowRole}
                    onValueChange={(v) => roleMut.mutate({ userId: a.id, role: v as AccountRole })}
                  >
                    <SelectTrigger className="h-8 text-[11px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {isAdmin ? <SelectItem value="admin">Admin (toàn quyền)</SelectItem> : null}
                      <SelectItem value="manager">Quản trị viên</SelectItem>
                      <SelectItem value="dealer1">Đại lý cấp 1</SelectItem>
                      <SelectItem value="dealer">Đại lý (xem giá nhập)</SelectItem>
                      <SelectItem value="user">Người dùng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </li>
          );
        })}
        {accounts.data && accounts.data.length === 0 ? (
          <li className="text-xs text-muted-foreground">Chưa có tài khoản nào.</li>
        ) : null}
      </ul>
    </div>
  );
}
