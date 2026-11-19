/**
 * Quản lý tài khoản: tạo tài khoản bằng tên đăng nhập + mật khẩu,
 * cấp/thu hồi quyền xem giá nhập, cấp quyền đại lý cấp 1 (chỉ quản trị viên),
 * đổi mật khẩu, xoá tài khoản.
 * Đại lý cấp 1 chỉ nhìn thấy và quản lý tài khoản do chính mình tạo.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  KeyRound,
  Link2,
  Search,
  Trash2,
  TriangleAlert,
  UserPlus,
  Users,
  Wallet,
  ShieldCheck,
} from "lucide-react";
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
  setAccountPriceMode,
  type PriceMode,
  type AccountRole,
} from "@/lib/accounts.functions";
import { displayLogin, toLoginEmail } from "@/lib/username";
import { useAdmin } from "@/hooks/useAdmin";
import { DealerProfileDialog } from "@/components/admin/DealerProfileDialog";
import {
  buildForest,
  countDescendants,
  filterForest,
  pathTo,
  type TreeNode,
} from "@/lib/accountTree";

const ROLE_LABEL: Record<AccountRole, string> = {
  admin: "Admin (toàn quyền)",
  manager: "Quản trị viên",
  dealer1: "Đại lý cấp 1",
  dealer: "Đại lý (xem giá nhập)",
  user: "Người dùng",
};

const ROLE_SHORT: Record<AccountRole, string> = {
  admin: "Admin",
  manager: "Quản trị viên",
  dealer1: "Đại lý cấp 1",
  dealer: "Đại lý",
  user: "Người dùng",
};

const ROLE_BADGE: Record<AccountRole, string> = {
  admin: "bg-gold text-gold-foreground",
  manager: "bg-primary text-primary-foreground",
  dealer1: "bg-brand text-white",
  dealer: "border border-border text-foreground",
  user: "border border-dashed border-border text-muted-foreground",
};

const PRICE_MODE_LABEL: Record<PriceMode, string> = {
  both: "Xem cả 2 giá",
  excl: "Chỉ giá chưa VAT",
  incl: "Chỉ giá đã gồm VAT",
};

const fmtDate = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

type Acc = NonNullable<ReturnType<typeof useAccountList>["data"]>[number];
const useAccountList = () => {
  const fetchList = useServerFn(listAccounts);
  return useQuery({ queryKey: ["accounts"], queryFn: () => fetchList({}) });
};

type RoleFilter = "all" | AccountRole;
type Alert = "never" | "nolink" | "outside";

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
  const create = useServerFn(createAccount);
  const setPwd = useServerFn(setAccountPassword);
  const setViewer = useServerFn(setAccountPriceViewer);
  const setRole = useServerFn(setAccountRole);
  const remove = useServerFn(deleteAccount);
  const setMode = useServerFn(setAccountPriceMode);
  const [newMode, setNewMode] = useState<PriceMode>("both");

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [priceViewer, setPriceViewer] = useState(true);
  const [newRole, setNewRole] = useState<AccountRole>("dealer");
  // Đại lý cấp 1 đang được sửa thông tin tư vấn (chỉ admin / quản trị viên).
  const [dealerEdit, setDealerEdit] = useState<{ id: string; login: string } | null>(null);

  const accounts = useAccountList();
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
          priceMode: newMode,
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

  const modeMut = useMutation({
    mutationFn: (v: { userId: string; mode: PriceMode }) => setMode({ data: v }),
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật quyền xem giá.");
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

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [alertFilter, setAlertFilter] = useState<Alert | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  const list = useMemo<Acc[]>(() => accounts.data ?? [], [accounts.data]);
  const roleById = useMemo(() => new Map(list.map((a) => [a.id, roleOf(a.roles)])), [list]);
  const byId = useMemo(() => new Map(list.map((a) => [a.id, a])), [list]);

  const isNever = (a: Acc) => !a.lastSignInAt;
  const isNoLink = (a: Acc) => roleById.get(a.id) === "dealer1" && !a.hasDealerProfile;
  const isOutside = (a: Acc) =>
    full && roleById.get(a.id) !== "admin" && (!a.createdBy || a.createdBy === a.id);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: list.length };
    for (const a of list) c[roleById.get(a.id)!] = (c[roleById.get(a.id)!] ?? 0) + 1;
    return c;
  }, [list, roleById]);
  const alertCounts = {
    never: list.filter(isNever).length,
    nolink: full ? list.filter(isNoLink).length : 0,
    outside: list.filter(isOutside).length,
  };

  const q = search.trim().toLowerCase();
  const filtering = q !== "" || roleFilter !== "all" || alertFilter !== null;
  const forest = useMemo(() => {
    const all = buildForest(list);
    if (!filtering) return all;
    return filterForest(all, (a) => {
      if (roleFilter !== "all" && roleById.get(a.id) !== roleFilter) return false;
      if (alertFilter === "never" && !isNever(a)) return false;
      if (alertFilter === "nolink" && !isNoLink(a)) return false;
      if (alertFilter === "outside" && !isOutside(a)) return false;
      return !q || displayLogin(a.email).toLowerCase().includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list, roleById, q, roleFilter, alertFilter, filtering, full]);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const renderNode = (node: TreeNode<Acc>, depth: number): React.ReactNode => {
    const a = node.item;
    const role = roleById.get(a.id)!;
    const login = displayLogin(a.email);
    const open = filtering || !collapsed.has(a.id);
    const kids = node.children.length;
    const creator = a.createdBy && a.createdBy !== a.id ? byId.get(a.createdBy) : undefined;
    const isSel = selected === a.id;
    return (
      <li key={a.id}>
        <div
          className={`flex items-center gap-2 rounded-lg px-1.5 py-1.5 ${isSel ? "bg-secondary" : "hover:bg-secondary/60"}`}
        >
          <button
            type="button"
            aria-label={open ? "Thu gọn nhánh" : "Mở nhánh"}
            className={`flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground ${kids ? "" : "invisible"}`}
            onClick={() => toggle(a.id)}
          >
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </button>
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            onClick={() => setSelected(isSel ? null : a.id)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase">
              {login.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-xs font-medium">{login}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {creator ? `Tạo bởi ${displayLogin(creator.email)} · ` : ""}
                {fmtDate(a.createdAt).slice(0, 5)}
                {a.lastSignInAt ? ` · vào ${fmtDate(a.lastSignInAt).slice(0, 5)}` : ""}
              </span>
            </span>
          </button>
          {isNever(a) ? (
            <span className="hidden shrink-0 rounded-full border border-dashed border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">
              Chưa đăng nhập
            </span>
          ) : null}
          {isNoLink(a) && full ? (
            <TriangleAlert
              className="size-3.5 shrink-0 text-gold"
              aria-label="Chưa có link tư vấn"
            />
          ) : null}
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ROLE_BADGE[role]}`}
          >
            {ROLE_SHORT[role]}
          </span>
          {kids ? (
            <span className="w-6 shrink-0 text-right text-[11px] text-muted-foreground">
              {countDescendants(node)}
            </span>
          ) : null}
        </div>
        {isSel ? renderDetail(a, role) : null}
        {kids && open ? (
          <ul className="ml-3 border-l border-border pl-2">
            {node.children.map((c) => renderNode(c, depth + 1))}
          </ul>
        ) : null}
      </li>
    );
  };

  const renderDetail = (a: Acc, role: AccountRole) => {
    const login = displayLogin(a.email);
    const path = pathTo(list, a.id);
    const creator = a.createdBy && a.createdBy !== a.id ? byId.get(a.createdBy) : undefined;
    const children = list.filter((c) => c.createdBy === a.id && c.id !== a.id);
    const isRowAdmin = role === "admin";
    const isViewer = a.roles.includes("price_viewer");
    return (
      <div className="my-1 ml-8 space-y-3 rounded-lg border border-border bg-card p-3 text-xs">
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-muted-foreground">Tên đăng nhập</dt>
          <dd className="font-medium">{login}</dd>
          <dt className="text-muted-foreground">Vai trò</dt>
          <dd>{ROLE_LABEL[role]}</dd>
          <dt className="text-muted-foreground">Thuộc nhánh</dt>
          <dd className="break-words">
            {path.length > 1
              ? path.map((p) => displayLogin(p.email)).join(" › ")
              : "Gốc (không có cấp trên)"}
          </dd>
          <dt className="text-muted-foreground">Người tạo</dt>
          <dd>{creator ? displayLogin(creator.email) : "—"}</dd>
          <dt className="text-muted-foreground">Ngày tạo</dt>
          <dd>{fmtDate(a.createdAt)}</dd>
          <dt className="text-muted-foreground">Đăng nhập gần nhất</dt>
          <dd>{a.lastSignInAt ? fmtDate(a.lastSignInAt) : "Chưa đăng nhập lần nào"}</dd>
          {role === "dealer" ? (
            <>
              <dt className="text-muted-foreground">Xem giá nhập</dt>
              <dd>{PRICE_MODE_LABEL[a.priceMode]}</dd>
            </>
          ) : null}
        </dl>

        {full && role === "dealer1" ? (
          <div
            className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 ${a.hasDealerProfile ? "bg-secondary" : "border border-gold/50 bg-gold/10"}`}
          >
            <span className="flex items-center gap-1.5">
              {a.hasDealerProfile ? (
                <Link2 className="size-3.5" />
              ) : (
                <TriangleAlert className="size-3.5 text-gold" />
              )}
              {a.hasDealerProfile ? "Đã có link và thông tin tư vấn" : "Chưa có link tư vấn"}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px]"
              onClick={() => setDealerEdit({ id: a.id, login })}
            >
              {a.hasDealerProfile ? "Sửa" : "Nhập link & thông tin"}
            </Button>
          </div>
        ) : null}

        {!full && !isRowAdmin ? (
          <label className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
            <span className="flex items-center gap-1.5">
              <Wallet className="size-3.5" /> Quyền xem giá nhập
            </span>
            <Switch
              checked={isViewer}
              aria-label="Quyền xem giá nhập"
              onCheckedChange={(v) => viewerMut.mutate({ userId: a.id, enabled: v })}
            />
          </label>
        ) : null}

        {full && !(isRowAdmin && !isAdmin) ? (
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground" />
            <Select
              value={role}
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
        {role === "dealer" ? (
          <div className="flex items-center gap-2">
            <Wallet className="size-3.5 shrink-0 text-muted-foreground" />
            <PriceModeSelect
              small
              value={a.priceMode}
              onChange={(m) => modeMut.mutate({ userId: a.id, mode: m })}
            />
          </div>
        ) : null}

        {children.length ? (
          <div>
            <p className="mb-1 text-muted-foreground">Tài khoản con ({children.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {children.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="rounded-full border border-border px-2 py-0.5 text-[11px] hover:bg-secondary"
                  onClick={() => setSelected(c.id)}
                >
                  {displayLogin(c.email)}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => {
              const p = window.prompt(`Mật khẩu mới cho ${login}`);
              if (p) pwdMut.mutate({ userId: a.id, password: p });
            }}
          >
            <KeyRound className="size-3.5" /> Đổi mật khẩu
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs text-destructive"
            onClick={() => {
              if (window.confirm(`Xoá tài khoản ${login}?`)) delMut.mutate(a.id);
            }}
          >
            <Trash2 className="size-3.5" /> Xoá tài khoản
          </Button>
        </div>
      </div>
    );
  };

  const chip = (active: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap ${active ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:bg-secondary"}`;
  const roleChips: { key: RoleFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    ...(["admin", "manager", "dealer1", "dealer", "user"] as AccountRole[])
      .filter((r) => (counts[r] ?? 0) > 0)
      .map((r) => ({ key: r as RoleFilter, label: ROLE_SHORT[r] })),
  ];

  return (
    <div className={embedded ? "" : "rounded-xl border border-border p-3"}>
      {!embedded ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Users className="size-4" /> Quản lý tài khoản
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        {full
          ? "Tài khoản xếp theo nhánh: ai tạo ra ai nằm ngay dưới người đó."
          : "Bạn là đại lý cấp 1: chỉ xem và quản lý các tài khoản do chính bạn tạo."}
      </p>

      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            placeholder="Tìm tên đăng nhập / số điện thoại"
            className="h-9 pl-8 text-xs"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="sm" className="h-9" onClick={() => setShowCreate((v) => !v)}>
          <UserPlus className="size-4" /> Tạo
        </Button>
      </div>

      {showCreate ? (
        <div className="mt-3 space-y-2 rounded-lg border border-border p-3">
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

          {newRole === "dealer" || (!full && priceViewer) ? (
            <div className="space-y-1">
              <Label className="flex items-center gap-1.5 text-xs">
                <Wallet className="size-3.5" /> Quyền xem giá nhập
              </Label>
              <PriceModeSelect value={newMode} onChange={setNewMode} />
            </div>
          ) : null}

          <Button
            className="w-full"
            disabled={!username.trim() || password.length < 6 || createMut.isPending}
            onClick={() => createMut.mutate(undefined, { onSuccess: () => setShowCreate(false) })}
          >
            <UserPlus className="size-4" /> Tạo tài khoản
          </Button>
        </div>
      ) : null}

      {full ? (
        <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {roleChips.map((c) => (
            <button
              key={c.key}
              type="button"
              className={chip(roleFilter === c.key)}
              onClick={() => setRoleFilter(c.key)}
            >
              {c.label}{" "}
              <span className="opacity-70">{c.key === "all" ? counts["all"] : counts[c.key]}</span>
            </button>
          ))}
        </div>
      ) : null}

      {alertCounts.never + alertCounts.nolink + alertCounts.outside > 0 ? (
        <div className="-mx-1 mt-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
          <span className="shrink-0 text-[11px] text-muted-foreground">Cần chú ý:</span>
          {(
            [
              ["never", "Chưa đăng nhập"],
              ["nolink", "Chưa có link tư vấn"],
              ["outside", "Ngoài nhánh"],
            ] as [Alert, string][]
          )
            .filter(([k]) => alertCounts[k] > 0)
            .map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={chip(alertFilter === k)}
                onClick={() => setAlertFilter(alertFilter === k ? null : k)}
              >
                {label} <span className="opacity-70">{alertCounts[k]}</span>
              </button>
            ))}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>Số bên phải = tổng tài khoản con trong nhánh</span>
        {!filtering ? (
          <span className="flex gap-3">
            <button type="button" className="underline" onClick={() => setCollapsed(new Set())}>
              Mở tất cả
            </button>
            <button
              type="button"
              className="underline"
              onClick={() =>
                setCollapsed(
                  new Set(
                    list
                      .filter((a) => list.some((c) => c.createdBy === a.id && c.id !== a.id))
                      .map((a) => a.id),
                  ),
                )
              }
            >
              Thu gọn
            </button>
          </span>
        ) : null}
      </div>

      <ul className="mt-2 space-y-0.5">{forest.map((n) => renderNode(n, 0))}</ul>
      {accounts.data && forest.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {filtering ? "Không có tài khoản phù hợp." : "Chưa có tài khoản nào."}
        </p>
      ) : null}

      {full && dealerEdit ? (
        <DealerProfileDialog
          staff
          userId={dealerEdit.id}
          loginName={dealerEdit.login}
          open
          onOpenChange={(next) => {
            if (!next) {
              setDealerEdit(null);
              refresh();
            }
          }}
        />
      ) : null}
    </div>
  );
}

function PriceModeSelect({
  value,
  onChange,
  small,
}: {
  value: PriceMode;
  onChange: (m: PriceMode) => void;
  small?: boolean;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PriceMode)}>
      <SelectTrigger className={small ? "h-8 text-[11px]" : undefined}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="both">Xem cả 2 giá</SelectItem>
        <SelectItem value="excl">Chỉ giá chưa VAT</SelectItem>
        <SelectItem value="incl">Chỉ giá đã gồm VAT</SelectItem>
      </SelectContent>
    </Select>
  );
}
