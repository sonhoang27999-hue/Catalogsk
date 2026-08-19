/**
 * Quản lý tài khoản (chỉ admin): tạo tài khoản bằng tên đăng nhập + mật khẩu,
 * cấp/thu hồi quyền xem giá nhập, đổi mật khẩu, xoá tài khoản.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { KeyRound, Trash2, UserPlus, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  createAccount,
  deleteAccount,
  listAccounts,
  setAccountPassword,
  setAccountPriceViewer,
} from "@/lib/accounts.functions";
import { displayLogin, toLoginEmail } from "@/lib/username";

export function AccountManager({ embedded = false }: { embedded?: boolean } = {}) {
  const qc = useQueryClient();
  const fetchList = useServerFn(listAccounts);
  const create = useServerFn(createAccount);
  const setPwd = useServerFn(setAccountPassword);
  const setViewer = useServerFn(setAccountPriceViewer);
  const remove = useServerFn(deleteAccount);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [priceViewer, setPriceViewer] = useState(true);

  const accounts = useQuery({ queryKey: ["accounts"], queryFn: () => fetchList({}) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["accounts"] });

  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "Không thực hiện được.");

  const createMut = useMutation({
    mutationFn: () =>
      create({
        data: { email: toLoginEmail(username), password, priceViewer },
      }),
    onSuccess: async () => {
      setUsername("");
      setPassword("");
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
        Tạo tài khoản bằng tên đăng nhập và mật khẩu, không cần email.
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
        <label className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2 text-xs">
          <span className="flex items-center gap-1.5">
            <Wallet className="size-3.5" /> Cho xem giá nhập
          </span>
          <Switch checked={priceViewer} onCheckedChange={setPriceViewer} />
        </label>
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
          const isAdmin = a.roles.includes("admin");
          return (
            <li key={a.id} className="rounded-lg border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium">{displayLogin(a.email)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {isAdmin ? "Quản trị viên" : isViewer ? "Xem được giá nhập" : "Người dùng"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {!isAdmin ? (
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
                  {!isAdmin ? (
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
                  ) : null}
                </div>
              </div>
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
