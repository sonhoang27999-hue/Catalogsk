/**
 * Trang thống kê ảnh lỗi (chỉ admin): biểu đồ theo nguồn (tên miền) và theo
 * thời điểm, kèm danh sách link hỏng gần nhất để sửa nhanh.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import {
  clearImageErrors,
  readImageErrors,
  subscribeImageErrors,
  type ImageErrorEntry,
} from "@/lib/imageErrors";

export const Route = createFileRoute("/anh-loi")({
  head: () => ({
    meta: [
      { title: "Thống kê ảnh lỗi | AutoDeco" },
      { name: "description", content: "Theo dõi các ảnh không tải được theo nguồn và thời điểm." },
      { property: "og:title", content: "Thống kê ảnh lỗi | AutoDeco" },
      {
        property: "og:description",
        content: "Biểu đồ ảnh lỗi theo tên miền nguồn và theo giờ để admin sửa nhanh.",
      },
    ],
  }),
  component: ImageErrorsPage,
});

const fmtHour = (t: number) =>
  new Date(t).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", hour: "2-digit" });

function ImageErrorsPage() {
  const { canManage: isAdmin } = useAdmin();
  const [items, setItems] = useState<ImageErrorEntry[]>([]);

  useEffect(() => {
    const sync = () => setItems(readImageErrors());
    sync();
    return subscribeImageErrors(sync);
  }, []);

  const byHost = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of items) m.set(e.host, (m.get(e.host) ?? 0) + 1);
    return [...m.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  const byTime = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of items) {
      const bucket = new Date(e.t).setMinutes(0, 0, 0);
      const label = fmtHour(bucket);
      m.set(label, (m.get(label) ?? 0) + 1);
    }
    return [...m.entries()].map(([name, value]) => ({ name, value })).slice(-12);
  }, [items]);

  const recent = useMemo(() => [...items].reverse().slice(0, 30), [items]);

  return (
    <div className="pb-6">
      <PageHeader title="Thống kê ảnh lỗi" />

      {!isAdmin ? (
        <p className="p-4 text-sm text-muted-foreground">
          Chỉ quản trị viên mới xem được trang này.
        </p>
      ) : (
        <div className="space-y-5 p-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Tổng cộng <span className="font-semibold text-foreground">{items.length}</span> lượt
              ảnh lỗi trên thiết bị này.
            </p>
            <Button variant="outline" size="sm" onClick={clearImageErrors}>
              Xoá nhật ký
            </Button>
          </div>

          <section className="rounded-xl border border-border p-3">
            <h2 className="mb-2 text-sm font-semibold">Theo nguồn ảnh</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byHost} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" allowDecimals={false} fontSize={11} />
                  <YAxis type="category" dataKey="name" width={110} fontSize={10} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-border p-3">
            <h2 className="mb-2 text-sm font-semibold">Theo thời điểm (giờ)</h2>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byTime} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    dataKey="name"
                    fontSize={9}
                    interval={0}
                    angle={-35}
                    textAnchor="end"
                    height={50}
                  />
                  <YAxis allowDecimals={false} fontSize={11} width={28} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="rounded-xl border border-border p-3">
            <h2 className="mb-2 text-sm font-semibold">Link lỗi gần đây</h2>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa ghi nhận ảnh lỗi nào.</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((e, i) => (
                  <li key={`${e.t}-${i}`} className="rounded-lg bg-secondary/50 p-2">
                    <p className="truncate text-xs font-medium">{e.label || "(không tên)"}</p>
                    <a
                      href={e.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-[11px] text-primary underline"
                    >
                      {e.url}
                    </a>
                    <p className="text-[11px] text-muted-foreground">
                      {e.host} · {new Date(e.t).toLocaleString("vi-VN")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
