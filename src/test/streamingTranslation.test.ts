import { afterEach, describe, expect, it, vi } from "vitest";
import { translateStreaming, translationPreview, translationReady } from "@/lib/engine/streaming";

const input = { text: "Giao 327 đèn sáng mai, không giao từng phần.", from: "vi" as const, to: "zh" as const, terms: [], brief: true };
const chunk = (value: object) => `data: ${JSON.stringify(value)}\n\n`;
function streamResponse(events: object[]) {
  return new Response(new ReadableStream({ start(controller) {
    for (const event of events) controller.enqueue(new TextEncoder().encode(chunk(event)));
    controller.enqueue(new TextEncoder().encode("data: [DONE]\n\n")); controller.close();
  } }), { headers: { "content-type": "text/event-stream", "x-vercel-ai-ui-message-stream": "v1" } });
}
afterEach(() => vi.unstubAllGlobals());

describe("progressive translation fidelity", () => {
  it("delivers accumulated translated text before returning the complete sentence", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([
      { type: "start" }, { type: "text-start", id: "t" },
      { type: "text-delta", id: "t", delta: "明早交付327盏灯，" },
      { type: "text-delta", id: "t", delta: "不得分批交付。" },
      { type: "text-end", id: "t" }, { type: "finish", finishReason: "stop" },
    ])));
    const progress = vi.fn();
    const result = await translateStreaming(input, progress, { model: "gpt-4o-mini" });
    expect(progress.mock.calls.map(([text]) => text)).toEqual(["明早交付327盏灯，", "明早交付327盏灯，不得分批交付。", "明早交付327盏灯，不得分批交付。"]);
    expect(result.text).toBe("明早交付327盏灯，不得分批交付。");
    expect(result.pinyin).toContain("327");
  });
  it("rejects length truncation even after showing a preview", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([
      { type: "text-delta", id: "t", delta: "327盏灯" }, { type: "finish", finishReason: "length" },
    ])));
    await expect(translateStreaming(input, vi.fn(), { model: "gpt-4o-mini" })).rejects.toThrow("Bản dịch bị ngắt");
  });
  it("rejects a disconnected stream instead of accepting partial text", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([{ type: "text-delta", id: "t", delta: "327盏灯" }])));
    await expect(translateStreaming(input, vi.fn(), { model: "gpt-4o-mini" })).rejects.toThrow("chưa hoàn tất");
  });
  it("rejects cancelled output rather than treating it as completed", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([{ type: "text-delta", id: "t", delta: "327盏灯" }, { type: "abort" }])));
    await expect(translateStreaming(input, vi.fn(), { model: "gpt-4o-mini" })).rejects.toThrow("Đã dừng");
  });
  it("does not expose partial annotation markers as translated words", () => {
    expect(translationPreview("你好\nPINY")).toBe("你好");
    expect(translationPreview("你好\nPINYIN: nǐ hǎo\nMEANING: Xin chào")).toBe("你好");
  });
  it("preserves provider stream errors rather than accepting the preview", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamResponse([{ type: "error", errorText: "AI đang bận" }])));
    await expect(translateStreaming(input, vi.fn(), { model: "gpt-4o-mini" })).rejects.toThrow("AI đang bận");
  });
  it("marks the sentence ready as soon as the Pinyin line starts, not before", () => {
    expect(translationReady("请明早交付327盏灯")).toBe(false);
    expect(translationReady("请明早交付327盏灯。\nPINYIN: Qǐng")).toBe(true);
    expect(translationReady("Giao 327 đèn.\nMEANING: deliver")).toBe(true);
  });
});
