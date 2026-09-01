/**
 * Lịch sử truy cập của các tài khoản (chỉ quản trị viên xem được).
 * Có bộ lọc theo tên đăng nhập, loại quyền và tổng hợp số lượt truy cập theo tài khoản.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listAccessLogs } from "@/data/accessLog.api";
import { displayLogin } from "@/lib/username";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  manager: "Quản trị viên",
  dealer1: "Đại lý cấp 1",
  price_viewer: "Đại lý",
  user: "Người dùng",
};

const ROLE_OPTIONS = [
  { value: "all", label: "Tất cả quyền" },
  { value: "admin", label: ROLE_LABEL["admin"] },
  { value: "manager", label: ROLE_LABEL["manager"] },
  { value: "dealer1", label: ROLE_LABEL["dealer1"] },
  { value: "price_viewer", label: ROLE_LABEL["price_viewer"] },
  { value: "user", label: ROLE_LABEL["user"] },
];

export function AccessLogs({ embedded = false }: { embedded?: boolean } = {}) {
  const [keyword, setKeyword] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const logs = useQuery({
    queryKey: ["access-logs"],
    queryFn: () => listAccessLogs(500),
    staleTime: 30_000,
  });

  const rows = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    const all = logs.data ?? [];
    return all.filter((r) => {
      const matchKeyword = !k || displayLogin(r.email).toLowerCase().includes(k);
      const matchRole = roleFilter === "all" || r.role === roleFilter;
      return matchKeyword && matchRole;
    });
  }, [logs.data, keyword, roleFilter]);

  const summary = useMemo(() => {
    const map = new Map<string, { name: string; count: number; last: string }>();
    for (const r of rows) {
      const name = displayLogin(r.email);
      const cur = map.get(name);
      if (cur) cur.count += 1;
      else map.set(name, { name, count: 1, last: r.created_at });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [rows]);

  return (
    <div className={embedded ? "" : "rounded-xl border border-border p-3"}>
      {!embedded ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <History className="size-4" /> Lịch sử truy cập
        </p>
      ) : null}

      <div className="mt-1 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Lọc theo tên đăng nhập"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => logs.refetch()} aria-label="Làm mới">
          <RefreshCw className={`size-4 ${logs.isFetching ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {logs.isError ? (
        <p className="mt-3 text-xs text-destructive">
          Không tải được lịch sử truy cập. Chỉ quản trị viên mới xem được.
        </p>
      ) : null}

      {summary.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {summary.slice(0, 12).map((s) => (
            <span
              key={s.name}
              className="rounded-full bg-secondary px-2 py-1 text-[11px] text-muted-foreground"
            >
              {s.name}: <b className="text-foreground">{s.count}</b> lượt
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-3 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-secondary text-muted-foreground">
            <tr>
              <th className="px-2 py-2 font-medium">Tài khoản</th>
              <th className="px-2 py-2 font-medium">Quyền</th>
              <th className="px-2 py-2 font-medium">Hoạt động</th>
              <th className="px-2 py-2 font-medium">Trang</th>
              <th className="px-2 py-2 font-medium whitespace-nowrap">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-2 py-1.5">{displayLogin(r.email)}</td>
                <td className="px-2 py-1.5">{ROLE_LABEL[r.role] ?? r.role}</td>
                <td className="px-2 py-1.5">{r.event === "login" ? "Đăng nhập" : "Xem trang"}</td>
                <td className="max-w-[220px] truncate px-2 py-1.5 text-muted-foreground">
                  {r.path}
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
                  {fmt(r.created_at)}
                </td>
              </tr>
            ))}
            {!logs.isLoading && rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-3 text-center text-muted-foreground">
                  Chưa có lượt truy cập nào.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
