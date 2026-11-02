import { parseAi } from "./parseAi";
import { translationPrompt } from "./translationPrompt";
import { toPinyin } from "@/lib/pinyin";
import { supportsTemperature, type ContextTurn } from "./context";
import type { Lang } from "./types";
import type { SourceExample } from "./sourceHistory";

const NAMES = { vi: "Vietnamese", zh: "Simplified Chinese", en: "English" } as const;
type Term = { vi: string; zh: string; en: string };

/** Calls OpenAI directly from the device with the user's own key (key never touches our server). */
export async function openaiTranslate(
  key: string,
  model: string,
  d: { text: string; from: Lang; to: Lang; terms: Term[]; examples?: SourceExample[]; brief?: boolean; context?: ContextTurn[] },
): Promise<{ text: string; pinyin: string; meaning: string }> {
  const wantPinyin = d.to === "zh";
  const system = translationPrompt(d);
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: model || "gpt-4o-mini", ...(supportsTemperature(model || "gpt-4o-mini") ? { temperature: 0 } : {}), messages: [{ role: "system", content: system }, { role: "user", content: d.text }] }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("API key OpenAI không hợp lệ");
    if (res.status === 429) throw new Error("OpenAI: hết hạn mức hoặc quá nhiều yêu cầu");
    if (res.status === 404) throw new Error("Không tìm thấy mô hình OpenAI này");
    throw new Error(`OpenAI lỗi ${res.status}`);
  }
  const j = await res.json();
  if (j.choices?.[0]?.finish_reason === "length") throw new Error("Bản dịch bị ngắt trước khi hoàn tất — chưa thể dùng để đối chiếu đầy đủ nghĩa");
  const out: string = (j.choices?.[0]?.message?.content ?? "").trim();
  if (!out) throw new Error("AI không trả về bản dịch");
  const r = parseAi(out);
  return { ...r, pinyin: wantPinyin ? toPinyin(r.text) : "" };
}

/** box = [x0, y0, x1, y1] as fractions (0–1) of the image size, for drawing the translation over the photo. */
export interface OcrLine { original: string; pinyin: string; translation: string; box?: [number, number, number, number] | undefined }

/** Accepts a model box in 0–1000 (or 0–1) units and returns a clamped, ordered 0–1 box, or undefined if invalid. */
export function normalizeBox(b: unknown): OcrLine["box"] {
  if (!Array.isArray(b) || b.length !== 4 || !b.every((n) => typeof n === "number" && Number.isFinite(n))) return undefined;
  const scale = b.some((n) => n > 1) ? 1000 : 1;
  const c = (b as number[]).map((n) => Math.min(1, Math.max(0, n / scale))) as [number, number, number, number];
  const [x0, x1] = [Math.min(c[0], c[2]), Math.max(c[0], c[2])];
  const [y0, y1] = [Math.min(c[1], c[3]), Math.max(c[1], c[3])];
  if (x1 - x0 < 0.005 || y1 - y0 < 0.005) return undefined;
  return [x0, y0, x1, y1];
}

/** Reads text in a photo and translates it, directly from the device with the user's key. */
export async function openaiImageTranslate(key: string, model: string, dataUrl: string, to: Lang, signal?: AbortSignal): Promise<OcrLine[]> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: signal ?? null,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Read every piece of text in the image (signs, labels, menus, packaging). Return json {"lines":[{"original":"...","pinyin":"Hanyu pinyin with tone marks if original is Chinese else empty","translation":"natural ${NAMES[to]} translation","box":[x0,y0,x1,y1]}]} where box is the tight bounding box of that text line in the image, integers 0-1000 relative to image width/height. Keep numbers/units. If no text, return {"lines":[]}.` },
        { role: "user", content: [{ type: "image_url", image_url: { url: dataUrl } }] },
      ],
    }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("API key OpenAI không hợp lệ");
    if (res.status === 429) throw new Error("OpenAI: hết hạn mức hoặc quá nhiều yêu cầu");
    throw new Error(`OpenAI lỗi ${res.status}`);
  }
  const j = await res.json();
  try {
    const lines = (JSON.parse(j.choices?.[0]?.message?.content ?? "{}").lines ?? []) as Array<OcrLine & { box?: unknown }>;
    return lines.map((l) => ({ original: l.original, pinyin: l.pinyin ?? "", translation: l.translation, box: normalizeBox(l.box) }));
  } catch { return []; }
}
