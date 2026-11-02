import { DefaultChatTransport, streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { translationPrompt } from "./translationPrompt";
import { parseAi } from "./parseAi";
import { toPinyin } from "@/lib/pinyin";
import { supportsTemperature } from "./context";
import type { TranslationInputData } from "./translationInput";

export const TRUNCATED = "Bản dịch bị ngắt trước khi hoàn tất — chưa thể dùng để đối chiếu đầy đủ nghĩa";

/** The translated sentence is final once the meaning line (or a legacy Pinyin line) starts, or the stream ends. */
export function translationReady(raw: string, ended = false) {
  return ended || /\n\s*(?:PINYIN|MEANING)\s*:/i.test(raw);
}

/** Only the translated sentence is shown while Pinyin/meaning are still arriving. */
export function translationPreview(raw: string) {
  return parseAi(raw.replace(/\n\s*(?:P(?:I(?:N(?:Y(?:I(?:N(?::)?)?)?)?)?)?|M(?:E(?:A(?:N(?:I(?:N(?:G(?::)?)?)?)?)?)?)?)\s*$/i, "")).text;
}

export async function translateStreaming(
  d: TranslationInputData, onProgress: (text: string, ready?: boolean) => void,
  options: { key?: string | undefined; model: string; signal?: AbortSignal | undefined },
) {
  let raw = "";
  let finished = false;
  if (options.key) {
    // User credentials stay on the device, including in streaming mode.
    const provider = createOpenAI({ apiKey: options.key });
    const result = streamText({
      model: provider.chat(options.model || "gpt-4o-mini"),
      ...(supportsTemperature(options.model || "gpt-4o-mini") ? { temperature: 0 } : {}),
      instructions: translationPrompt(d), prompt: d.text,
      ...(options.signal ? { abortSignal: options.signal } : {}), maxRetries: 0,
    });
    for await (const part of result.fullStream) {
      if (part.type === "text-delta") { raw += part.text; onProgress(translationPreview(raw), translationReady(raw)); }
      if (part.type === "error") throw part.error;
      if (part.type === "finish") {
        if (part.finishReason === "length") throw new Error(TRUNCATED);
        if (part.finishReason !== "stop") throw new Error("AI chưa hoàn tất bản dịch.");
        finished = true;
        onProgress(translationPreview(raw), true);
      }
    }
  } else {
    const transport = new DefaultChatTransport({
      api: "/api/translate-stream",
      prepareSendMessagesRequest: () => ({ body: d }),
    });
    const stream = await transport.sendMessages({
      chatId: "translation", messages: [], trigger: "submit-message", messageId: undefined,
      abortSignal: options.signal,
    });
    const reader = stream.getReader();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value.type === "text-delta") { raw += value.delta; onProgress(translationPreview(raw), translationReady(raw)); }
        if (value.type === "error") throw new Error(value.errorText);
        if (value.type === "abort") throw new DOMException("Đã dừng dịch", "AbortError");
        if (value.type === "finish") {
          if (value.finishReason === "length") throw new Error(TRUNCATED);
          if (value.finishReason !== "stop") throw new Error("AI chưa hoàn tất bản dịch.");
          finished = true;
          onProgress(translationPreview(raw), true);
        }
      }
    } finally { await reader.cancel(); reader.releaseLock(); }
  }
  if (options.signal?.aborted) throw new DOMException("Đã dừng dịch", "AbortError");
  if (!finished || !raw.trim()) throw new Error("AI chưa hoàn tất bản dịch.");
  const r = parseAi(raw.trim());
  return { ...r, pinyin: d.to === "zh" ? toPinyin(r.text) : "" };
}