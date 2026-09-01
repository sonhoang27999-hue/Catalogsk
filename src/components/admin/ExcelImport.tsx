/**
 * Nhập bảng giá Excel (chỉ admin).
 * Bước 1: đọc file và đối chiếu với dữ liệu hiện có.
 * Bước 2: admin xem thay đổi giá của từng mục và tự chọn mục nào thêm / cập nhật.
 */
import { useMemo, useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { parsePriceWorkbook } from "@/lib/priceSheet";
import { analyzePriceRows, applyPriceRows, type DiffStatus, type PriceDiff } from "@/data/import.api";
import { useRefreshCatalog } from "@/hooks/useRefreshCatalog";
import { Button } from "@/components/ui/button";

const vnd = (n: number | null | undefined) =>
  n === null || n === undefined ? "—" : n.toLocaleString("vi-VN");

const FILTERS: [DiffStatus | "all", string][] = [
  ["all", "Tất cả"],
  ["new", "Sản phẩm mới"],
  ["changed", "Đổi giá"],
  ["same", "Không đổi"],
];

const BADGE: Record<DiffStatus, { label: string; className: string }> = {
  new: { label: "Mới", className: "bg-emerald-500/15 text-emerald-400" },
  changed: { label: "Đổi giá", className: "bg-gold/20 text-gold" },
  same: { label: "Không đổi", className: "bg-secondary text-muted-foreground" },
};

export function ExcelImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [diffs, setDiffs] = useState<PriceDiff[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<DiffStatus | "all">("all");
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [reading, setReading] = useState(false);
  const refresh = useRefreshCatalog();

  const counts = useMemo(
    () => ({
      all: diffs.length,
      new: diffs.filter((d) => d.status === "new").length,
      changed: diffs.filter((d) => d.status === "changed").length,
      same: diffs.filter((d) => d.status === "same").length,
    }),
    [diffs],
  );

  const shown = useMemo(
    () => (filter === "all" ? diffs : diffs.filter((d) => d.status === filter)),
    [diffs, filter],
  );

  const reset = () => {
    setDiffs([]);
    setSelected(new Set());
    setFileName("");
    setProgress(0);
    setFilter("all");
    if (inputRef.current) inputRef.current.value = "";
  };

  const pick = async (file: File) => {
    setReading(true);
    try {
      const parsed = parsePriceWorkbook(await file.arrayBuffer());
      if (parsed.length === 0) throw new Error("Không tìm thấy dòng giá hợp lệ trong file.");
      const result = await analyzePriceRows(parsed);
      setDiffs(result);
      setSelected(new Set(result.filter((d) => d.status !== "same").map((d) => d.key)));
      setFileName(file.name);
      setProgress(0);
      setFilter("all");
    } catch (e) {
      toast.error((e as Error).message || "Không đọc được file Excel.");
    } finally {
      setReading(false);
    }
  };

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const setGroup = (status: DiffStatus | "all", on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      for (const d of diffs) {
        if (status !== "all" && d.status !== status) continue;
        if (on) next.add(d.key);
        else next.delete(d.key);
      }
      return next;
    });

  const chosen = diffs.filter((d) => selected.has(d.key));
  const willCreate = chosen.filter((d) => d.status === "new").length;
  const willUpdate = chosen.length - willCreate;

  const run = useMutation({
    mutationFn: async () => applyPriceRows(chosen, (done) => setProgress(done)),
    onSuccess: async (r) => {
      await refresh();
      toast.success(`Thêm mới ${r.created} • Cập nhật ${r.updated}`);
      reset();
    },
    onError: (e: Error) => toast.error(e.message || "Nhập dữ liệu thất bại."),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <FileSpreadsheet className="size-4" /> Nhập bảng giá từ Excel
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Chỉ lấy: hãng xe, đời xe (năm sản xuất), giá đại lý chưa VAT, giá niêm yết đã VAT và giá lắp
        đặt khuyến mãi đã VAT. Sau khi đọc file, bạn chọn từng mục muốn thêm mới hoặc cập nhật giá.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        disabled={reading || run.isPending}
        className="mt-3 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />

      {reading ? <p className="mt-2 text-xs text-muted-foreground">Đang đối chiếu dữ liệu…</p> : null}

      {diffs.length > 0 ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {fileName}: <span className="font-semibold text-foreground">{counts.all}</span> dòng •{" "}
            {counts.new} mới • {counts.changed} đổi giá • {counts.same} không đổi
          </p>

          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setFilter(value)}
                className={`rounded-md border px-2 py-1 text-[11px] font-semibold transition-colors ${
                  filter === value
                    ? "border-gold bg-gold text-gold-foreground"
                    : "border-border bg-secondary text-muted-foreground"
                }`}
              >
                {label} ({counts[value]})
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-foreground"
              onClick={() => setGroup("new", true)}
            >
              Chọn hết sản phẩm mới
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-foreground"
              onClick={() => setGroup("changed", true)}
            >
              Chọn hết mục đổi giá
            </button>
            <button
              type="button"
              className="rounded-md border border-border px-2 py-1 text-muted-foreground"
              onClick={() => setGroup("all", false)}
            >
              Bỏ chọn tất cả
            </button>
          </div>

          <div className="max-h-80 space-y-2 overflow-auto rounded-lg border border-border p-2">
            {shown.slice(0, 300).map((d) => {
              const badge = BADGE[d.status];
              const on = selected.has(d.key);
              return (
                <label
                  key={d.key}
                  className={`flex cursor-pointer gap-2 rounded-lg border p-2 text-[11px] transition-colors ${
                    on ? "border-gold bg-secondary" : "border-border bg-card"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggle(d.key)}
                    className="mt-0.5 size-4 accent-gold"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      <span className="truncate font-semibold text-foreground">
                        {d.row.brand} • {d.row.model}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-muted-foreground">{d.row.productName}</p>
                    <div className="mt-1 space-y-0.5 tabular-nums text-muted-foreground">
                      <PriceLine
                        label="Niêm yết"
                        before={d.current?.price ?? null}
                        after={d.row.price}
                        isNew={d.status === "new"}
                      />
                      <PriceLine
                        label="Khuyến mãi"
                        before={d.current?.salePrice ?? null}
                        after={d.row.salePrice}
                        isNew={d.status === "new"}
                      />
                      <PriceLine
                        label="Giá nhập"
                        before={d.current?.dealerPrice ?? null}
                        after={d.row.dealerPrice}
                        isNew={d.status === "new"}
                      />
                    </div>
                  </div>
                </label>
              );
            })}
            {shown.length > 300 ? (
              <p className="p-2 text-[11px] text-muted-foreground">
                Chỉ hiển thị 300 dòng đầu, các lựa chọn theo nhóm vẫn áp dụng cho toàn bộ file.
              </p>
            ) : null}
          </div>

          <Button
            className="w-full"
            disabled={run.isPending || chosen.length === 0}
            onClick={() => run.mutate()}
          >
            <Upload className="mr-2 size-4" />
            {run.isPending
              ? `Đang ghi ${progress}/${chosen.length}…`
              : `Áp dụng ${chosen.length} mục (thêm ${willCreate} • cập nhật ${willUpdate})`}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function PriceLine({
  label,
  before,
  after,
  isNew,
}: {
  label: string;
  before: number | null;
  after: number | null;
  isNew: boolean;
}) {
  const changed = !isNew && (before ?? null) !== (after ?? null);
  return (
    <p className="flex items-center gap-1">
      <span className="w-20 shrink-0">{label}</span>
      {isNew ? (
        <span className="font-semibold text-foreground">{vnd(after)}</span>
      ) : (
        <>
          <span className={changed ? "text-muted-foreground line-through" : ""}>{vnd(before)}</span>
          {changed ? <span className="font-semibold text-gold">→ {vnd(after)}</span> : null}
        </>
      )}
    </p>
  );
}
