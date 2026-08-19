/**
 * Danh sách đại lý đăng ký (chỉ admin): xem tên đăng nhập, tên, số điện thoại
 * và duyệt / từ chối / xoá hồ sơ.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ClipboardList, Phone, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Application = {
  id: string;
  username: string;
  full_name: string;
  phone: string;
  status: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

const STATUS_CLASS: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  approved: "bg-primary/15 text-primary",
  rejected: "bg-destructive/15 text-destructive",
};

export function DealerApplications({ embedded = false }: { embedded?: boolean } = {}) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["dealer-applications"],
    queryFn: async (): Promise<Application[]> => {
      const { data, error } = await supabase
        .from("dealer_applications")
        .select("id, username, full_name, phone, status")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ["dealer-applications"] });
  const onError = (e: unknown) =>
    toast.error(e instanceof Error ? e.message : "Không thực hiện được.");

  const statusMut = useMutation({
    mutationFn: async (v: { id: string; status: string }) => {
      const { error } = await supabase
        .from("dealer_applications")
        .update({ status: v.status })
        .eq("id", v.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Đã cập nhật trạng thái.");
    },
    onError,
  });

  const delMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("dealer_applications").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: async () => {
      await refresh();
      toast.success("Đã xoá đăng ký.");
    },
    onError,
  });

  const items = list.data ?? [];

  return (
    <div className={embedded ? "" : "rounded-xl border border-border p-3"}>
      {!embedded ? (
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardList className="size-4" /> Danh sách đại lý đăng ký
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted-foreground">
        Duyệt hồ sơ rồi tạo tài khoản tương ứng ở mục quản lý tài khoản.
      </p>

      <ul className="mt-3 space-y-2">
        {items.map((a) => (
          <li key={a.id} className="rounded-lg border border-border p-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium">{a.full_name}</p>
                <p className="truncate text-[11px] text-muted-foreground">@{a.username}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Phone className="size-3" /> {a.phone}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                  STATUS_CLASS[a.status] ?? STATUS_CLASS["pending"]
                }`}
              >
                {STATUS_LABEL[a.status] ?? a.status}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {a.status !== "approved" ? (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px]"
                  onClick={() => statusMut.mutate({ id: a.id, status: "approved" })}
                >
                  <Check className="size-3" /> Duyệt
                </button>
              ) : null}
              {a.status !== "rejected" ? (
                <button
                  type="button"
                  className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-[11px]"
                  onClick={() => statusMut.mutate({ id: a.id, status: "rejected" })}
                >
                  <X className="size-3" /> Từ chối
                </button>
              ) : null}
              <button
                type="button"
                aria-label="Xoá đăng ký"
                className="ml-auto text-destructive"
                onClick={() => {
                  if (window.confirm(`Xoá đăng ký của ${a.full_name}?`)) delMut.mutate(a.id);
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </li>
        ))}
        {list.isSuccess && items.length === 0 ? (
          <li className="text-xs text-muted-foreground">Chưa có đăng ký nào.</li>
        ) : null}
      </ul>
    </div>
  );
}
