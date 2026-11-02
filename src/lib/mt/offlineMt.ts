import { kv } from "@/lib/storage";
import type { Lang } from "@/lib/engine/types";

/**
 * On-device machine translation (OPUS-MT via transformers.js, ONNX int8, WASM).
 * Models are downloaded once on demand and cached in the browser/WebView cache,
 * so translation works without internet afterwards — on Android and iPhone alike.
 * Chinese↔Vietnamese has no small direct model, so it pivots through English
 * (zh→en→vi) reusing the same four models. The library is imported lazily and
 * never runs on the server.
 */

const MODELS: Record<string, string> = {
  "zh>en": "Xenova/opus-mt-zh-en",
  "en>zh": "Xenova/opus-mt-en-zh",
  "vi>en": "Xenova/opus-mt-vi-en",
  "en>vi": "Xenova/opus-mt-en-vi",
};

/** Direct one-model path, or two-hop pivot through English. */
export function mtPath(from: Lang, to: Lang): string[] {
  if (from === to) return [];
  const direct = MODELS[`${from}>${to}`];
  if (direct) return [direct];
  const a = MODELS[`${from}>en`];
  const b = MODELS[`en>${to}`];
  return a && b ? [a, b] : [];
}

const flag = (model: string) => `mtPack:${model}`;
export const isMtReady = (from: Lang, to: Lang) => mtPath(from, to).every((m) => kv.get<boolean>(flag(m)));
/** A ↔ B downloads both directions, including both pivot paths. */
export const mtPairModels = (from: Lang, to: Lang) => [...new Set([...mtPath(from, to), ...mtPath(to, from)])];
export const isMtPairReady = (from: Lang, to: Lang) => isMtReady(from, to) && isMtReady(to, from);

export type MtPair = { from: Lang; to: Lang; label: string };
export const MT_PAIRS: MtPair[] = [
  { from: "zh", to: "vi", label: "Trung ↔ Việt" },
  { from: "zh", to: "en", label: "Trung ↔ Anh" },
  { from: "vi", to: "en", label: "Việt ↔ Anh" },
];

type Translator = (text: string) => Promise<string>;
const pipes = new Map<string, Promise<Translator>>();

async function loadPipe(model: string): Promise<Translator> {
  let p = pipes.get(model);
  if (!p) {
    p = (async () => {
      const { pipeline, env } = await import("@huggingface/transformers");
      env.allowLocalModels = false;
      const pipe = await pipeline("translation", model, { dtype: "q8" });
      return async (text: string) => {
        const out = await pipe(text, { num_beams: 1, do_sample: false, max_new_tokens: 256 } as never);
        const first = Array.isArray(out) ? out[0] : out;
        return String((first as { translation_text?: string })?.translation_text ?? "").trim();
      };
    })();
    pipes.set(model, p);
    p.catch(() => pipes.delete(model));
  }
  return p;
}

/** Download every model a pair needs (one time; kept on this device). Throws on failure. */
export async function downloadMt(from: Lang, to: Lang) {
  for (const model of mtPairModels(from, to)) {
    const t = await loadPipe(model);
    await t("xin chào");
    kv.set(flag(model), true);
  }
}

/** Translate fully on-device. Returns null when the pair's models are not downloaded. */
export async function translateMt(text: string, from: Lang, to: Lang): Promise<string | null> {
  const path = mtPath(from, to);
  if (!path.length || !isMtReady(from, to)) return null;
  let out = text;
  for (const model of path) {
    out = await (await loadPipe(model))(out);
    if (!out) return null;
  }
  return out;
}
