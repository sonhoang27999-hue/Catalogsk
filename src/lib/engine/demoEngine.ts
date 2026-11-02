import { PHRASES } from "@/data/phrases";
import type { GlossaryEntry, Lang, TranslationEngine, TranslationRequest, TranslationResult, TermMatch } from "./types";

const PUNCT = /[.,!?;:'"“”‘’。，！？、；：（）()…\s]+/g;
export const normalize = (s: string) => s.toLowerCase().replace(PUNCT, " ").trim();

function buildCorpus(glossary: GlossaryEntry[] = []): GlossaryEntry[] {
  return [...glossary, ...PHRASES.map((p) => ({ vi: p.vi, zh: p.zh, pinyin: p.pinyin, en: (p as { en?: string }).en }))];
}

const get = (e: GlossaryEntry, l: Lang) => (l === "en" ? e.en ?? "" : e[l]);

/**
 * Deterministic, fully local demo engine: exact phrase lookup + glossary term spotting.
 * It never invents a translation; pairs without data return "none".
 */
export const demoEngine: TranslationEngine = {
  id: "offline-demo",
  label: "Offline",
  onDevice: true,
  async translate({ text, from, to, glossary }: TranslationRequest): Promise<TranslationResult> {
    const q = normalize(text);
    const corpus = buildCorpus(glossary).filter((e) => get(e, from) && get(e, to));
    if (!q || from === to) return { status: "none", text: "", matches: [], engineId: this.id };

    const exact = corpus.find((e) => normalize(get(e, from)) === q);
    if (exact) {
      return { status: "ok", text: get(exact, to), pinyin: to === "zh" ? exact.pinyin : undefined, matches: [], engineId: this.id };
    }

    const terms = corpus.filter((e) => get(e, from).length <= 24).sort((a, b) => get(b, from).length - get(a, from).length);
    const seen = new Set<string>();
    const matches: TermMatch[] = [];
    let rest = ` ${q} `;
    for (const e of terms) {
      const k = normalize(get(e, from));
      if (k.length < 2 || seen.has(k)) continue;
      const hit = from === "zh" ? rest.includes(k) : rest.includes(` ${k} `);
      if (hit) {
        seen.add(k);
        rest = rest.replace(k, " ");
        matches.push({ source: get(e, from), target: get(e, to), pinyin: to === "zh" ? e.pinyin : undefined });
      }
    }
    return { status: matches.length ? "partial" : "none", text: "", matches, engineId: this.id };
  },
};
