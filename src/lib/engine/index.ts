import { mtEngine } from "./mtEngine";
import { demoEngine } from "./demoEngine";
import { onlineEngine } from "./onlineEngine";
import { missingTerms } from "./glossaryFix";
import { selectSourceExamples } from "./sourceHistory";
import { kv } from "@/lib/storage";
import { store } from "@/lib/store";
import type { Lang, TranslationEngine, GlossaryEntry, TranslationResult } from "./types";

export * from "./types";

/** Offline engine: local matches, then the on-device MT model when downloaded. Swap for a native model in the iOS build. */
let offline: TranslationEngine = mtEngine;
export const getEngine = () => offline;
export const setEngine = (e: TranslationEngine) => {
  offline = e;
};

export type Mode = "auto" | "offline";

const isOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;
const requests = new Map<string, Promise<TranslationResult>>();

/**
 * Hybrid: exact matches from the user's dictionary/phrases win (instant, trusted);
 * otherwise use online AI when allowed and connected; fall back to offline on failure.
 */
export async function translate(text: string, from: Lang, to: Lang, glossary: GlossaryEntry[], mode: Mode = "auto", opts?: { force?: boolean; brief?: boolean; onProgress?: (text: string, ready?: boolean) => void; signal?: AbortSignal; context?: { from: Lang; text: string }[] }): Promise<TranslationResult> {
  // Fast path: instant dictionary/phrase lookup; the slow on-device model runs only when AI isn't used.
  const req = { text, from, to, glossary };
  const quick = await demoEngine.translate(req);
  if (quick.status === "ok") return quick;
  let localP: Promise<TranslationResult> | undefined;
  const offlineResult = () => (localP ??= offline.translate(req));
  const key = `${opts?.brief ? "b:" : ""}${from}>${to}:${text.trim().toLowerCase()}`;
  const cache = kv.get<Record<string, { text: string; pinyin?: string | undefined; meaning?: string | undefined }>>("aiCache") ?? {};
  const hit = cache[key];
  const cached = (notice?: string): TranslationResult | null =>
    hit ? { status: "ok", text: hit.text, pinyin: hit.pinyin, meaning: hit.meaning, matches: [], engineId: "ai-cache", notice, missingTerms: missingTerms(text, hit.text, from, to, glossary) } : null;
  // Downloaded models can translate new sentences; history is only the final fallback.
  if (mode === "offline" || !isOnline()) {
    const result = await offlineResult();
    if (result.status === "ok") return result;
    return cached("Bộ dịch trên máy chưa sẵn sàng — dùng bản dịch đã lưu") ?? result;
  }
  // A saved AI translation is reused instantly — no network round-trip.
  // "Dịch lại" (force) skips the saved copy and asks the AI again; the fresh result overwrites the cache below.
   const savedResult = cached("Bản dịch AI đã lưu trên máy");
   if (savedResult && !opts?.force) return savedResult;
   const examples = selectSourceExamples(text, from, to, store.get().sourceHistory);
   const requestKey = `${key}|${JSON.stringify(glossary)}|${store.get().settings.openaiModel}|${JSON.stringify(examples)}|${JSON.stringify(opts?.context ?? [])}|${opts?.onProgress ? "stream" : "final"}`;
  const pending = requests.get(requestKey);
  if (pending && !opts?.onProgress && !opts?.signal) return pending;
  const job = (async () => {
  try {
    const r = await onlineEngine.translate({ text, from, to, glossary, brief: opts?.brief, context: opts?.context, onProgress: opts?.onProgress, signal: opts?.signal });
    if (opts?.signal?.aborted) throw new DOMException("Đã dừng dịch", "AbortError");
    const latest = kv.get<typeof cache>("aiCache") ?? {};
    latest[key] = { text: r.text, pinyin: r.pinyin, meaning: r.meaning };
    const keys = Object.keys(latest);
    if (keys.length > 500) { const oldest = keys[0]; if (oldest) delete latest[oldest]; }
    kv.set("aiCache", latest);
    return r;
  } catch (e) {
    if (opts?.signal?.aborted) throw e;
    opts?.onProgress?.("");
    return cached("Dịch trực tuyến lỗi — dùng bản đã lưu") ?? { ...(await offlineResult()), notice: e instanceof Error ? e.message : "Dịch trực tuyến lỗi" };
  }
  })().finally(() => { if (!opts?.onProgress && !opts?.signal) requests.delete(requestKey); });
  // Active UI turns are serialized by their page. A cancellable stream belongs
  // to one caller, so stopping it cannot cancel another conversation's request.
  if (!opts?.onProgress && !opts?.signal) requests.set(requestKey, job);
  return job;
}
