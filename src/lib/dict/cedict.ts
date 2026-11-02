import { useSyncExternalStore } from "react";
import { blobs } from "@/lib/storage";
import { DICT_SEED } from "@/data/dictionarySeed";

/** Offline Chinese–English dictionary (CC-CEDICT, CC BY-SA 4.0). Downloaded once on demand, kept in the on-device blob store. */
export interface CedictHit { zh: string; pinyin: string; en: string }
type Status = "unknown" | "absent" | "downloading" | "ready" | "error";

/** Small industry supplement is already shipped with the app, independent of the general download. */
export const INDUSTRY_ENTRIES: CedictHit[] = DICT_SEED.flatMap((e) => e.en ? [{ zh: e.zh, pinyin: e.pinyin, en: e.en }] : []);

const KEY = "cedict:v1";
let status: Status = "unknown";
let entries: CedictHit[] | null = null;
const ls = new Set<() => void>();
const emit = (s: Status) => { status = s; ls.forEach((l) => l()); };

async function decode(b: Blob): Promise<CedictHit[]> {
  const text = await new Response(b.stream().pipeThrough(new DecompressionStream("gzip"))).text();
  return text.split("\n").filter((l) => l.trim()).map((l) => { const [zh = "", pinyin = "", en = ""] = l.split("\t"); return { zh, pinyin, en }; });
}

export async function initCedict() {
  if (status !== "unknown") return;
  const b = await blobs.get(KEY);
  if (!b) return emit("absent");
  try { entries = await decode(b); emit("ready"); } catch { emit("absent"); }
}

export async function downloadCedict() {
  emit("downloading");
  try {
    const r = await fetch("/cedict.dat");
    if (!r.ok) throw new Error(String(r.status));
    const b = await r.blob();
    entries = await decode(b);
    await blobs.set(KEY, b);
    emit("ready");
  } catch { emit("error"); }
}

export function useCedictStatus() {
  return useSyncExternalStore((l) => { ls.add(l); return () => ls.delete(l); }, () => status, () => "unknown" as Status);
}

const CJK = /[\u3400-\u9fff]/;
/** Look up a Chinese word (exact first, then words starting with it) or an English word. */
export function lookupCedict(q: string, limit = 20): CedictHit[] {
  const s = q.trim();
  if (!s || limit <= 0) return [];
  const sources = [INDUSTRY_ENTRIES, entries ?? []];
  const unique = (hits: CedictHit[]) => {
    const seen = new Set<string>();
    return hits.filter((e) => {
      const key = e.zh + "|" + e.pinyin;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  if (CJK.test(s)) {
    const exact = sources.flatMap((source) => source.filter((e) => e.zh === s));
    const pre = sources.flatMap((source) => source.filter((e) => e.zh !== s && e.zh.startsWith(s))).sort((a, b) => a.zh.length - b.zh.length);
    return unique([...exact, ...pre]).slice(0, limit);
  }
  if (s.length < 2) return [];
  const re = new RegExp(`(^|[^a-z])${s.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`);
  const groups = sources.map((source) => {
    const out: CedictHit[] = [];
    for (const e of source) { if (re.test(e.en.toLowerCase())) { out.push(e); if (out.length >= limit * 3) break; } }
    return out.sort((a, b) => a.en.length - b.en.length);
  });
  return unique(groups.flat()).slice(0, limit);
}
