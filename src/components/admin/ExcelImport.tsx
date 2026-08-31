/**
 * Nhập bảng giá Excel (chỉ admin): tạo hãng xe, đời xe và thêm mới / ghi đè sản phẩm.
 */
import { useRef, useState } from "react";
import { FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { parsePriceWorkbook, type PriceRow } from "@/lib/priceSheet";
import { importPriceRows, type ImportMode } from "@/data/import.api";
import { useRefreshCatalog } from "@/hooks/useRefreshCatalog";
import { Button } from "@/components/ui/button";

const vnd = (n: number | null) => (n === null ? "—" : n.toLocaleString("vi-VN"));

export function ExcelImport() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<PriceRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<ImportMode>("overwrite");
  const [progress, setProgress] = useState(0);
  const refresh = useRefreshCatalog();

  const pick = async (file: File) => {
    try {
      const parsed = parsePriceWorkbook(await file.arrayBuffer());
      if (parsed.length === 0) throw new Error("Không tìm thấy dòng giá hợp lệ trong file.");
      setRows(parsed);
      setFileName(file.name);
      setProgress(0);
    } catch (e) {
      toast.error((e as Error).message || "Không đọc được file Excel.");
    }
  };

  const run = useMutation({
    mutationFn: async () => importPriceRows(rows, mode, (done) => setProgress(done)),
    onSuccess: async (r) => {
      await refresh();
      toast.success(`Thêm mới ${r.created} • Ghi đè ${r.updated} • Bỏ qua ${r.skipped}`);
      setRows([]);
      setFileName("");
      setProgress(0);
      if (inputRef.current) inputRef.current.value = "";
    },
    onError: (e: Error) => toast.error(e.message || "Nhập dữ liệu thất bại."),
  });

  const brands = new Set(rows.map((r) => r.brand));
  const models = new Set(rows.map((r) => `${r.brand}|${r.model}`));

  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
        <FileSpreadsheet className="size-4" /> Nhập bảng giá từ Excel
      </h3>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Chỉ lấy: hãng xe, đời xe (năm sản xuất), giá đại lý chưa VAT, giá niêm yết đã VAT và giá lắp
        đặt khuyến mãi đã VAT.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="mt-3 block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />

      {rows.length > 0 ? (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            {fileName}: <span className="font-semibold text-foreground">{rows.length}</span> sản
            phẩm • {brands.size} hãng xe • {models.size} đời xe
          </p>

          <div className="grid gap-2">
            {(
              [
                ["overwrite", "Ghi đè nếu trùng", "Sản phẩm đã có sẽ được cập nhật giá mới"],
                ["insert-only", "Chỉ thêm sản phẩm chưa có", "Bỏ qua mọi sản phẩm đã có trên app"],
              ] as [ImportMode, string, string][]
            ).map(([value, label, hint]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                  mode === value
                    ? "border-gold bg-gold text-gold-foreground"
                    : "border-border bg-secondary text-foreground"
                }`}
              >
                <span className="block text-xs font-semibold">{label}</span>
                <span
                  className={`block text-[11px] ${mode === value ? "opacity-80" : "text-muted-foreground"}`}
                >
                  {hint}
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-56 overflow-auto rounded-lg border border-border">
            <table className="w-full text-left text-[11px]">
              <thead className="sticky top-0 bg-secondary text-muted-foreground">
                <tr>
                  <th className="px-2 py-1">Hãng</th>
                  <th className="px-2 py-1">Đời xe</th>
                  <th className="px-2 py-1">Sản phẩm</th>
                  <th className="px-2 py-1 text-right">Đại lý</th>
                  <th className="px-2 py-1 text-right">Niêm yết</th>
                  <th className="px-2 py-1 text-right">KM</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {rows.slice(0, 60).map((r, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-2 py-1">{r.brand}</td>
                    <td className="px-2 py-1">{r.model}</td>
                    <td className="px-2 py-1">{r.productName}</td>
                    <td className="px-2 py-1 text-right">{vnd(r.dealerPrice)}</td>
                    <td className="px-2 py-1 text-right">{vnd(r.price)}</td>
                    <td className="px-2 py-1 text-right">{vnd(r.salePrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button className="w-full" disabled={run.isPending} onClick={() => run.mutate()}>
            <Upload className="mr-2 size-4" />
            {run.isPending ? `Đang nhập ${progress}/${rows.length}…` : "Nhập vào danh mục"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
