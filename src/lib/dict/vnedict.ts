import { useSyncExternalStore } from "react";
import { blobs } from "@/lib/storage";
import asset from "@/assets/vnedict.json.gz.asset.json";

export interface VnedictHit { vi: string; en: string }
type Status = "unknown" | "absent" | "downloading" | "ready" | "error";
const KEY = "vnedict:v1";
let status: Status = "unknown";
let entries: VnedictHit[] = [];
let initializing: Promise<void> | undefined;
const listeners = new Set<() => void>();
const emit = (value: Status) => { status = value; listeners.forEach((fn) => fn()); };
const normalize = (text: string) => text.normalize("NFC").trim().toLocaleLowerCase("vi");

export function parseVnedict(text: string): VnedictHit[] {
  const rows: unknown = JSON.parse(text);
  if (!Array.isArray(rows) || rows.length > 100_000) throw new Error("Invalid dictionary");
  return rows.map((row: unknown) => {
    if (!Array.isArray(row) || row.length !== 2 || !row.every((v) => typeof v === "string" && v.trim() && v.length <= 5000)) throw new Error("Invalid entry");
    return { vi: String(row[0]), en: String(row[1]) };
  });
}
async function decode(blob: Blob) {
  return parseVnedict(await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text());
}
export function initVnedict(): Promise<void> {
  if (initializing) return initializing;
  if (status !== "unknown") return Promise.resolve();
  initializing = (async () => {
    try {
      const blob = await blobs.get(KEY);
      if (!blob) { emit("absent"); return; }
      entries = await decode(blob);
      emit("ready");
    } catch { emit("absent"); }
  })().finally(() => { initializing = undefined; });
  return initializing;
}
export async function downloadVnedict() {
  if (status === "downloading") return;
  emit("downloading");
  try {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error("Download failed");
    const blob = await response.blob();
    const decoded = await decode(blob);
    if (!decoded.length) throw new Error("Empty dictionary");
    await blobs.set(KEY, blob);
    if (!(await blobs.get(KEY))) throw new Error("Storage unavailable");
    entries = decoded;
    emit("ready");
  } catch { emit("error"); }
}
export function useVnedictStatus() {
  return useSyncExternalStore((fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, () => status, () => "unknown" as Status);
}
export function lookupVnedict(query: string, limit = 20): VnedictHit[] {
  const q = normalize(query);
  if (!q || limit <= 0) return [];
  const exact = entries.filter((entry) => normalize(entry.vi) === q);
  const rest = entries.filter((entry) => normalize(entry.vi) !== q && (normalize(entry.vi).startsWith(q) || normalize(entry.en).split(/[;(),]/).some((part) => part.trim() === q)));
  return [...exact, ...rest].slice(0, limit);
}
/** Return lexical meanings only for a complete headword, never concatenate words into a sentence. */
export async function exactVnedict(text: string): Promise<string | null> {
  await initVnedict();
  const q = normalize(text);
  const meanings = entries.filter((entry) => normalize(entry.vi) === q).map((entry) => entry.en);
  return meanings.length ? [...new Set(meanings)].join("; ") : null;
}