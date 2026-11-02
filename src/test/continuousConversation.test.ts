import { describe, it, expect, vi, afterEach } from "vitest";
import { routeSpeech, transcribeConversation } from "@/lib/continuous/transcribe";
import { encodeWav } from "@/lib/continuous/audio";

afterEach(() => vi.unstubAllGlobals());
describe("continuous conversation", () => {
  it("routes Vietnamese speech to selected Chinese", () => {
    expect(routeSpeech({ text: "Giá sỉ là bao nhiêu?", languages: [{ code: "vi" }] }, "vi", "zh"))
      .toEqual({ text: "Giá sỉ là bao nhiêu?", from: "vi", to: "zh" });
  });
  it("routes Chinese speech to selected Vietnamese", () => {
    expect(routeSpeech({ text: "批发价是多少？", languages: [{ code: "zh" }] }, "vi", "zh")?.to).toBe("vi");
  });
  it("routes English speech to the other selected language", () => {
    expect(routeSpeech({ text: "How much?", languages: [{ code: "en-US" }] }, "zh", "en")?.to).toBe("zh");
  });
  it("never routes outside-pair speech", () => {
    expect(routeSpeech({ text: "Hello", languages: [{ code: "en" }] }, "vi", "zh")).toBeNull();
  });
  it("never guesses mixed or undetected language", () => {
    expect(routeSpeech({ text: "Hello", languages: [] }, "vi", "en")).toBeNull();
    expect(routeSpeech({ text: "Hello xin chào", languages: [{ code: "vi" }, { code: "en" }] }, "vi", "en")).toBeNull();
  });
  it("uploads no audio without a user key", async () => {
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    await expect(transcribeConversation(new Blob(), "", "vi", "zh", new AbortController().signal)).rejects.toThrow("OpenAI");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("sends complete WAV and selected languages with the stop signal", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ text: "你好", languages: [{ code: "zh" }] }) });
    vi.stubGlobal("fetch", fetch);
    const signal = new AbortController().signal;
    const clip = encodeWav([new Float32Array([0, 0.5, -0.5])], 16000);
    expect(clip.size).toBe(50); expect(clip.type).toBe("audio/wav");
    expect(await transcribeConversation(clip, "test-placeholder", "vi", "zh", signal)).toEqual({ text: "你好", from: "zh", to: "vi" });
    const init = fetch.mock.calls[0]?.[1];
    expect(init.signal).toBe(signal);
    expect(init.body.getAll("languages[]")).toEqual(["vi", "zh"]);
    expect(init.body.get("model")).toBe("gpt-transcribe");
  });
  it("stops on provider rejection without retry", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, status: 403 }); vi.stubGlobal("fetch", fetch);
    await expect(transcribeConversation(new Blob(), "test-placeholder", "vi", "zh", new AbortController().signal)).rejects.toThrow("từ chối");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});