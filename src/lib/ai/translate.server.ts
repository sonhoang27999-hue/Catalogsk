import { parseAi } from "@/lib/engine/parseAi";
import { toPinyin } from "@/lib/pinyin";
import { translationPrompt } from "@/lib/engine/translationPrompt";
import type { SourceExample } from "@/lib/engine/sourceHistory";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { getRequest } from "@tanstack/react-start/server";
import type { TranslationInputData } from "@/lib/engine/translationInput";
import { createLovableAiGatewayRunIdFetch, getLovableAiGatewayRunId, withLovableAiGatewayRunIdHeader } from "./run-id.server";

const NAMES = { vi: "Vietnamese", zh: "Simplified Chinese", en: "English" } as const;
type L = keyof typeof NAMES;

/** Fast, no-reasoning model for short/brief requests — change here if needed (verified on the gateway, accepts temperature). */
export const FAST_MODEL = "openai/gpt-6-luna";
/** Accurate model for long passages; requires reasoning (minimum effort "low"). */
export const ACCURATE_MODEL = "openai/gpt-6-astra";

export function pickServerModel(text: string, brief?: boolean) {
  if (brief === true || text.length < 200) {
    return { modelId: FAST_MODEL, temperature: 0 as number | undefined, providerOptions: { forceReasoning: true, reasoningEffort: "none" as const, textVerbosity: "low" as const, store: false } };
  }
  return { modelId: ACCURATE_MODEL, temperature: undefined as number | undefined, providerOptions: { forceReasoning: true, reasoningEffort: "low" as const, textVerbosity: "low" as const, store: false } };
}

export async function aiTranslate(d: { text: string; from: L; to: L; terms: { vi: string; zh: string; en: string }[]; examples?: SourceExample[]; brief?: boolean; context?: { from: L; text: string }[] | undefined }) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { error: "Dịch trực tuyến chưa được cấu hình" };
  const req = getRequest();
  const runIdFetch = createLovableAiGatewayRunIdFetch(req ? getLovableAiGatewayRunId(req) : undefined);
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: runIdFetch.fetch,
  });
  const wantPinyin = d.to === "zh";
  const system = translationPrompt(d);
  const pick = pickServerModel(d.text, d.brief);
  try {
    const result = streamText({
      model: provider.responses(pick.modelId),
      ...(pick.temperature !== undefined ? { temperature: pick.temperature } : {}),
      instructions: system,
      prompt: d.text,
      maxRetries: 0,
      providerOptions: { openai: pick.providerOptions },
    });
    const out = (await result.text).trim();
    if (await result.finishReason === "length") return { error: "Bản dịch bị ngắt trước khi hoàn tất — chưa thể dùng để đối chiếu đầy đủ nghĩa" };
    if (!out) return { error: "AI không trả về bản dịch" };
    const r = parseAi(out);
    return { ...r, pinyin: wantPinyin ? toPinyin(r.text) : "" };
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    console.error("aiTranslate failed", status, e);
    if (status === 402) return { error: "Hết credit AI — đang dùng chế độ offline" };
    if (status === 429) return { error: "AI đang bận, thử lại sau" };
    return { error: "Dịch trực tuyến lỗi — đang dùng chế độ offline" };
  }
}

export async function aiTranslateStream(request: Request, data: TranslationInputData) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return new Response("Dịch trực tuyến chưa được cấu hình", { status: 503 });
  const gateway = createLovableAiGatewayRunIdFetch(getLovableAiGatewayRunId(request));
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1", apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" }, fetch: gateway.fetch,
  });
  const pick = pickServerModel(data.text, data.brief);
  const result = streamText({
    model: provider.responses(pick.modelId),
    ...(pick.temperature !== undefined ? { temperature: pick.temperature } : {}),
    instructions: translationPrompt(data), prompt: data.text,
    maxRetries: 0, abortSignal: request.signal,
    providerOptions: { openai: pick.providerOptions },
  });
  return withLovableAiGatewayRunIdHeader(result.toUIMessageStreamResponse({
    sendReasoning: false,
    onError: (cause) => {
      const status = (cause as { statusCode?: number }).statusCode;
      if (status === 402) return "Hết credit AI — kiểm tra hạn mức trong Lovable.";
      if (status === 429) return "AI đang bận, thử lại sau.";
      if (status === 403) return "AI bị từ chối truy cập — kiểm tra quyền sử dụng trong Lovable.";
      return "Dịch trực tuyến bị gián đoạn — chưa có bản dịch hoàn chỉnh.";
    },
    headers: { "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  }), gateway);
}
