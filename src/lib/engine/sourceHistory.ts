import { z } from "zod";
import type { Lang } from "./types";

export const SourceExampleSchema = z.object({ from: z.enum(["vi", "zh", "en"]), to: z.enum(["vi", "zh", "en"]), text: z.string().trim().min(1).max(2000) });
export type SourceExample = z.infer<typeof SourceExampleSchema>;
const lang = (value: string | null): Lang | undefined => value === "zh-CN" || value === "zh" ? "zh" : value === "vi" || value === "en" ? value : undefined;

export function normalizeSourceHistory(input: unknown): SourceExample[] {
  if (!Array.isArray(input) || input.length > 10000) throw new Error("Lịch sử không hợp lệ hoặc vượt 10.000 câu");
  const seen = new Set<string>();
  const result: SourceExample[] = [];
  for (const row of input) {
    const parsed = SourceExampleSchema.safeParse(row);
    if (!parsed.success || parsed.data.from === parsed.data.to) continue;
    const key = `${parsed.data.from}>${parsed.data.to}:${parsed.data.text.normalize("NFC").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key); result.push(parsed.data);
  }
  return result;
}

/** Parse an inert Takeout document: never render its HTML or infer translation pairs. */
export function parseSourceHistory(content: string): SourceExample[] {
  if (content.length > 12_000_000) throw new Error("Tệp quá lớn (tối đa 12 MB)");
  if (content.trimStart().startsWith("<")) {
    const doc = new DOMParser().parseFromString(content, "text/html");
    const rows: SourceExample[] = [];
    for (const anchor of doc.querySelectorAll("a[href]")) {
      try {
        const url = new URL(anchor.getAttribute("href") ?? "");
        if (url.protocol !== "https:" || url.hostname !== "translate.google.com") continue;
        const from = lang(url.searchParams.get("sl")); const to = lang(url.searchParams.get("tl"));
        const text = url.searchParams.get("q")?.trim();
        if (from && to && text) rows.push({ from, to, text });
      } catch { /* unrelated link */ }
    }
    return normalizeSourceHistory(rows);
  }
  const data: unknown = JSON.parse(content);
  const file = z.object({ app: z.literal("sk-source-history"), entries: z.array(z.unknown()).max(10000) }).parse(data);
  return normalizeSourceHistory(file.entries);
}

const STOP = new Set("tôi bạn của là và có cho một những các này đó thì sẽ đã không với để được the a an i you of to and is are for this that".split(" "));
function tokens(text: string): Set<string> {
  const words = text.normalize("NFC").toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  const out = new Set<string>();
  for (const word of words) {
    if (/\p{Script=Han}/u.test(word)) {
      for (let i = 0; i < word.length - 1; i++) out.add(word.slice(i, i + 2));
    } else if (word.length > 1 && !STOP.has(word) && !/^\d+$/.test(word)) out.add(word);
  }
  return out;
}

export function selectSourceExamples(text: string, from: Lang, to: Lang, history: SourceExample[]): SourceExample[] {
  const query = tokens(text);
  if (query.size < 2) return [];
  return history.filter((r) => r.from === from && r.to === to && r.text.length <= 400)
    .map((row) => { const terms = tokens(row.text); const overlap = [...query].filter((t) => terms.has(t)).length; return { row, overlap, score: overlap / Math.max(query.size, terms.size) }; })
    .filter((r) => r.overlap >= 2 && r.score >= 0.2)
    .sort((a, b) => b.score - a.score || b.overlap - a.overlap)
    .slice(0, 3).map((r) => r.row);
}