export type Lang = "vi" | "zh" | "en";

export const LANGS: Lang[] = ["vi", "zh", "en"];
export const LANG_LABEL: Record<Lang, string> = { vi: "Tiếng Việt", zh: "中文", en: "English" };
export const LANG_SHORT: Record<Lang, string> = { vi: "VI", zh: "中文", en: "EN" };

/** Default partner language (legacy records without `to` were vi↔zh). */
export const otherLang = (l: Lang): Lang => (l === "vi" ? "zh" : "vi");
export const targetOf = (x: { from: Lang; to?: Lang | undefined }): Lang => x.to ?? otherLang(x.from);

export interface GlossaryEntry {
  vi: string;
  zh: string;
  en?: string | undefined;
  pinyin?: string | undefined;
}

export interface TranslationRequest {
  text: string;
  from: Lang;
  to: Lang;
  /** User terminology (SK Dictionary) the engine should honour. */
  glossary?: GlossaryEntry[];
  /** Conversation: translation only (no Pinyin/explanation) for speed. */
  brief?: boolean | undefined;
  /** Transient preview; never persisted or spoken until the request completes. */
  /** `ready` is true once the full translated sentence has arrived (Pinyin/meaning may still follow). */
  onProgress?: ((text: string, ready?: boolean) => void) | undefined;
  signal?: AbortSignal | undefined;
  /** Recent conversation turns for resolving references; never translated. */
  context?: { from: Lang; text: string }[] | undefined;
}

export interface TermMatch {
  source: string;
  target: string;
  pinyin?: string | undefined;
}

export interface TranslationResult {
  /** Mandatory SK Dictionary terms the online translation did not use (warning only). */
  missingTerms?: { src: string; dst: string }[] | undefined;
  /** ok = full translation, partial = only glossary terms found, none = nothing */
  status: "ok" | "partial" | "none";
  text: string;
  pinyin?: string | undefined;
  matches: TermMatch[];
  engineId: string;
  /** Set when online translation failed and the offline engine answered instead. */
  notice?: string | undefined;
  /** Short explanation of the translation, written in the source language. */
  meaning?: string | undefined;
}

/**
 * Contract every translation engine must satisfy. The UI only depends on this.
 * A future native iOS build can implement it with an on-device model.
 */
export interface TranslationEngine {
  id: string;
  label: string;
  onDevice: boolean;
  translate(req: TranslationRequest): Promise<TranslationResult>;
}
