/**
 * Sao lưu / khôi phục / xoá toàn bộ dữ liệu danh mục (chỉ admin ghi được,
 * kiểm soát bằng chính sách bảo mật trên Cloud).
 */
import { supabase } from "@/integrations/supabase/client";
import {
  exportAccounts,
  restoreAccounts,
  type AccountBackup,
  type ApplicationBackup,
} from "@/lib/backup-accounts.functions";

export type BackupFile = {
  app: "sk-catalog";
  version: 1;
  created_at: string;
  tables: Record<BackupTable, Row[]>;
  /** Tài khoản đăng nhập (email + quyền). Mật khẩu không được xuất ra. */
  accounts?: AccountBackup[];
  /** Hồ sơ đăng ký đại lý. */
  applications?: ApplicationBackup[];
};

type Row = Record<string, unknown>;

export const BACKUP_TABLES = [
  "categories",
  "series",
  "models",
  "nodes",
  "products",
  "product_dealer_prices",
  "videos",
  "site_settings",
] as const;

export type BackupTable = (typeof BACKUP_TABLES)[number];

/** Nhãn tiếng Việt để hiển thị tiến trình. */
export const TABLE_LABELS: Record<BackupTable, string> = {
  categories: "Hãng xe",
  series: "Đời xe",
  models: "Năm sản xuất",
  nodes: "Mục cây",
  products: "Sản phẩm",
  product_dealer_prices: "Giá nhập",
  videos: "Video",
  site_settings: "Cấu hình giao diện",
};

const chunk = <T>(arr: T[], size: number) => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

/** Tải toàn bộ dữ liệu về dạng JSON. */
export const exportBackup = async (): Promise<BackupFile> => {
  const tables = {} as Record<BackupTable, Row[]>;
  for (const t of BACKUP_TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from(t) as any).select("*");
    if (error) throw new Error(`${TABLE_LABELS[t]}: ${error.message}`);
    tables[t] = (data ?? []) as Row[];
  }
  const people = await exportAccounts().catch(() => ({ accounts: [], applications: [] }));
  return {
    app: "sk-catalog",
    version: 1,
    created_at: new Date().toISOString(),
    tables,
    accounts: people.accounts,
    applications: people.applications,
  };
};

/** Sắp xếp mục cây theo độ sâu (cha trước con). */
const sortNodes = (rows: Row[]) => {
  const byId = new Map(rows.map((r) => [String(r["id"]), r]));
  const depth = (r: Row, guard = 0): number => {
    const p = r["parent_id"];
    if (!p || guard > 50) return 0;
    const parent = byId.get(String(p));
    return parent ? depth(parent, guard + 1) + 1 : 0;
  };
  return [...rows].sort((a, b) => depth(a) - depth(b));
};

/** Xoá sạch dữ liệu danh mục (không đụng tới tài khoản, hồ sơ đại lý). */
export const resetAllData = async (onStep?: (label: string) => void) => {
  const del = async (t: BackupTable, column: string) => {
    onStep?.(TABLE_LABELS[t]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (supabase.from(t) as any).delete().not(column, "is", null);
    if (res.error) throw new Error(`${TABLE_LABELS[t]}: ${res.error.message}`);
  };

  await del("product_dealer_prices", "product_id");
  await del("videos", "id");
  await del("products", "id");

  // Mục cây: xoá từ lá lên gốc để không vướng khoá ngoại.
  onStep?.(TABLE_LABELS["nodes"]);
  const { data: nodes, error: nodeErr } = await supabase.from("nodes").select("id, parent_id");
  if (nodeErr) throw new Error(nodeErr.message);
  const ordered = sortNodes((nodes ?? []) as Row[]).reverse();
  for (const group of chunk(ordered, 50)) {
    const { error } = await supabase
      .from("nodes")
      .delete()
      .in(
        "id",
        group.map((r) => String(r["id"])),
      );
    if (error) throw new Error(error.message);
  }

  await del("models", "id");
  await del("series", "id");
  await del("categories", "id");
};

/** Khôi phục từ file sao lưu: xoá dữ liệu hiện tại rồi ghi lại. */
export const restoreBackup = async (file: BackupFile, onStep?: (label: string) => void) => {
  if (!file || file.app !== "sk-catalog" || !file.tables) {
    throw new Error("File sao lưu không hợp lệ.");
  }
  await resetAllData(onStep);

  for (const t of BACKUP_TABLES) {
    let rows = (file.tables[t] ?? []) as Row[];
    if (rows.length === 0) continue;
    if (t === "nodes") rows = sortNodes(rows);
    onStep?.(`Khôi phục ${TABLE_LABELS[t]}`);
    for (const group of chunk(rows, 200)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from(t) as any).upsert(group);
      if (error) throw new Error(`${TABLE_LABELS[t]}: ${error.message}`);
    }
  }

  // Tài khoản & hồ sơ đại lý: chỉ thêm lại phần còn thiếu, không xoá tài khoản hiện có.
  if ((file.accounts?.length ?? 0) > 0 || (file.applications?.length ?? 0) > 0) {
    onStep?.("Tài khoản & hồ sơ đại lý");
    await restoreAccounts({
      data: { accounts: file.accounts ?? [], applications: file.applications ?? [] },
    });
  }
};

/** Tải file JSON về máy. */
export const downloadJson = (data: unknown, name: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};
