import type { DictEntry } from "@/data/dictionarySeed";

export type TermRow = Omit<DictEntry, "id" | "updatedAt">;

const HEAD: Record<string, keyof TermRow> = {
  vi: "vi", "tiếng việt": "vi", "tieng viet": "vi", vietnamese: "vi", "việt": "vi",
  zh: "zh", "中文": "zh", "tiếng trung": "zh", chinese: "zh", "trung": "zh",
  en: "en", english: "en", "tiếng anh": "en", "anh": "en",
  pinyin: "pinyin", "拼音": "pinyin",
  category: "category", "nhóm": "category", "danh mục": "category", "loại": "category",
  notes: "notes", "ghi chú": "notes", note: "notes",
};
const DEFAULT_ORDER: (keyof TermRow)[] = ["vi", "zh", "pinyin", "en", "category", "notes"];

/** Parse CSV/TSV text (Excel "Save as CSV") into rows of cells. Handles quotes. */
export function parseDelimited(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, "");
  const first = t.split(/\r?\n/)[0] ?? "";
  const d = first.includes("\t") ? "\t" : first.split(";").length > first.split(",").length ? ";" : ",";
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (q) { if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; continue; }
    if (c === '"') q = true;
    else if (c === d) { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/** Turn table rows into dictionary terms. First row may be a header (vi/zh/en/pinyin/category/notes, in VN/EN/中文); otherwise columns are vi, zh, pinyin, en, category, notes. Rows without Chinese are skipped. */
export function rowsToTerms(rows: unknown[][]): TermRow[] {
  const cells = rows.map((r) => r.map((c) => (c == null ? "" : String(c).trim()))).filter((r) => r.some(Boolean));
  if (!cells.length) return [];
  const mapped = cells[0]!.map((h) => HEAD[h.toLowerCase()]);
  const hasHead = mapped.filter(Boolean).length >= 2;
  const order = hasHead ? mapped : DEFAULT_ORDER;
  const out: TermRow[] = [];
  for (const r of hasHead ? cells.slice(1) : cells) {
    const o: Partial<TermRow> = {};
    r.forEach((v, i) => { const k = order[i]; if (k && v) (o as Record<string, string>)[k] = v; });
    if (!o.zh || !(o.vi || o.en)) continue;
    out.push({ vi: o.vi ?? "", zh: o.zh, en: o.en, pinyin: o.pinyin ?? "", category: o.category ?? "Chung", notes: o.notes ?? "" });
  }
  return out;
}
