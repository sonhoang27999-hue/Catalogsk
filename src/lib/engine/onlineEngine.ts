import { translateOnline } from "@/lib/translate.functions";
import { store } from "@/lib/store";
import { openaiTranslate } from "./openaiDirect";
import { isBundledApp, NEEDS_OPENAI_KEY } from "@/lib/appTarget";
import { missingTerms } from "./glossaryFix";
import { toPinyin } from "@/lib/pinyin";
import { selectSourceExamples } from "./sourceHistory";
import type { TranslationEngine, TranslationRequest, TranslationResult } from "./types";

/** Online AI translation. Uses the user's own OpenAI key if set (direct from device), else the built-in server AI. */
export const onlineEngine: TranslationEngine = {
  id: "online-ai",
  label: "AI trực tuyến",
  onDevice: false,
  async translate({ text, from, to, glossary = [], brief, context, onProgress, signal }: TranslationRequest): Promise<TranslationResult> {
    const lower = text.toLowerCase();
    const terms = glossary
      .filter((g) => [g.vi, g.zh, g.en].some((v) => v && v.length > 1 && lower.includes(v.toLowerCase())))
      .slice(0, 40)
      .map((g) => ({ vi: g.vi, zh: g.zh, en: g.en ?? "" }));
    const { openaiKey, openaiModel } = store.get().settings;
    // A packaged app has no server behind it, so the built-in AI simply isn't an option there.
    if (!openaiKey?.trim() && isBundledApp()) throw new Error(NEEDS_OPENAI_KEY);
    const examples = selectSourceExamples(text, from, to, store.get().sourceHistory);
    let r: { text: string; pinyin: string; meaning: string };
    if (onProgress) {
      const { translateStreaming } = await import("./streaming");
      r = await translateStreaming({ text, from, to, terms, examples, brief, ...(context?.length ? { context } : {}) }, onProgress, { key: openaiKey?.trim(), model: openaiModel, signal });
    } else if (openaiKey?.trim()) {
      r = await openaiTranslate(openaiKey.trim(), openaiModel, { text, from, to, terms, examples, ...(brief ? { brief } : {}), ...(context?.length ? { context } : {}) });
    } else {
      const s = await translateOnline({ data: { text, from, to, terms, examples, ...(brief ? { brief } : {}), ...(context?.length ? { context } : {}) } });
      if ("error" in s) throw new Error(s.error);
      r = s;
    }
    return { status: "ok", text: r.text, pinyin: to === "zh" ? toPinyin(r.text) || undefined : undefined, meaning: r.meaning || undefined, matches: [], engineId: this.id, missingTerms: missingTerms(text, r.text, from, to, glossary) };
  },
};
