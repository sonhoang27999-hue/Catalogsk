import type { Lang } from "@/lib/engine/types";

export interface DetectedSpeech { text: string; from: Lang; to: Lang }

/** Never guess a side for unknown, mixed or outside-pair speech. */
export function routeSpeech(data: { text?: unknown; languages?: unknown }, me: Lang, them: Lang): DetectedSpeech | null {
  if (typeof data.text !== "string" || !data.text.trim() || !Array.isArray(data.languages) || me === them) return null;
  const codes = [...new Set(data.languages.map((entry: unknown) => {
    if (!entry || typeof entry !== "object" || !("code" in entry) || typeof entry.code !== "string") return "";
    return entry.code.toLowerCase().split("-")[0];
  }))];
  const from = codes[0];
  if (codes.length !== 1 || (from !== me && from !== them)) return null;
  return { text: data.text.trim(), from, to: from === me ? them : me };
}

/** User-key path only: audio goes straight to OpenAI, never to app storage or the app server. */
export async function transcribeConversation(clip: Blob, key: string, me: Lang, them: Lang, signal: AbortSignal): Promise<DetectedSpeech | null> {
  if (!key.trim()) throw new Error("Nhập khóa OpenAI trong Cài đặt để dùng Dịch liên tục.");
  if (!navigator.onLine) throw new Error("Dịch liên tục cần kết nối mạng.");
  const form = new FormData();
  form.append("file", clip, "conversation.wav");
  form.append("model", "gpt-transcribe");
  // Buffered JSON preserves the documented detected-language metadata for routing.
  form.append("response_format", "json");
  form.append("languages[]", me); form.append("languages[]", them);
  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form, signal,
  });
  if (!response.ok) {
    if (response.status === 401) throw new Error("Khóa OpenAI không hợp lệ. Kiểm tra trong Cài đặt.");
    if (response.status === 429) throw new Error("OpenAI hết hạn mức hoặc đang quá tải. Dịch liên tục đã dừng.");
    if (response.status === 403) throw new Error("OpenAI từ chối quyền nhận giọng nói. Dịch liên tục đã dừng.");
    if (response.status === 404) throw new Error("Mô hình nhận giọng OpenAI chưa khả dụng cho khóa này.");
    throw new Error(`Nhận giọng OpenAI lỗi ${response.status}. Bấm Bắt đầu để thử lại.`);
  }
  return routeSpeech(await response.json(), me, them);
}