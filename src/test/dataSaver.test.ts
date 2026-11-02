import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { allowVoiceDownload, compressPhoto } from "@/lib/dataPolicy";
import { store } from "@/lib/store";
import { kv } from "@/lib/storage";
import { onlineEngine } from "@/lib/engine/onlineEngine";
import { translate } from "@/lib/engine";
import { prefetchVoice, speak } from "@/lib/speech";

vi.mock("@/lib/engine/onlineEngine", () => ({ onlineEngine: { translate: vi.fn() } }));
vi.mock("@/lib/storage", async (original) => {
  const actual = await original<typeof import("@/lib/storage")>();
  return { ...actual, blobs: { get: vi.fn(async () => undefined), set: vi.fn(async () => {}), clear: vi.fn(async () => {}) } };
});

beforeEach(() => {
  store.clearAll();
  vi.mocked(onlineEngine.translate).mockReset();
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("travel data saving", () => {
  it("defaults to data saving without turning off online text translation", () => {
    expect(store.get().settings.dataSaver).toBe(true);
    expect(store.get().settings.onlineTranslate).toBe(true);
  });
  it("blocks new automatic voice downloads but permits explicit listening", () => {
    expect(allowVoiceDownload(true, true)).toBe(false);
    expect(allowVoiceDownload(true, false)).toBe(true);
    expect(allowVoiceDownload(false, true)).toBe(true);
  });
  it("reuses an existing AI translation online without another request", async () => {
    kv.set("aiCache", { "vi>en:câu kiểm tra riêng": { text: "Saved result" } });
    const r = await translate("câu kiểm tra riêng", "vi", "en", []);
    expect(r.text).toBe("Saved result");
    expect(onlineEngine.translate).not.toHaveBeenCalled();
  });
  it("retranslate (force) asks the AI again and overwrites the saved copy", async () => {
    kv.set("aiCache", { "vi>en:câu dịch lại": { text: "Old saved result" } });
    vi.mocked(onlineEngine.translate).mockImplementation(async () => ({ status: "ok", text: "Fresh AI result", matches: [], engineId: "online-ai" }));
    const r = await translate("câu dịch lại", "vi", "en", [], "auto", { force: true });
    expect(r.text).toBe("Fresh AI result");
    expect(onlineEngine.translate).toHaveBeenCalledTimes(1);
    expect(kv.get<Record<string, { text: string }>>("aiCache")?.["vi>en:câu dịch lại"]?.text).toBe("Fresh AI result");
  });
  it("still translates new sentences online and merges simultaneous cache writes", async () => {
    vi.mocked(onlineEngine.translate).mockImplementation(async ({ text }) => ({ status: "ok", text: `AI ${text}`, matches: [], engineId: "online-ai" }));
    const [a, b] = await Promise.all([translate("câu mới thứ nhất", "vi", "en", []), translate("câu mới thứ hai", "vi", "en", [])]);
    expect(a.text).toBe("AI câu mới thứ nhất");
    expect(b.text).toBe("AI câu mới thứ hai");
    expect(Object.keys(kv.get<Record<string, unknown>>("aiCache") ?? {})).toHaveLength(2);
  });
  it("shares one network request for concurrent identical translations", async () => {
    vi.mocked(onlineEngine.translate).mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { status: "ok", text: "Shared result", matches: [], engineId: "online-ai" };
    });
    await Promise.all([translate("câu đồng thời", "vi", "en", []), translate("câu đồng thời", "vi", "en", [])]);
    expect(onlineEngine.translate).toHaveBeenCalledTimes(1);
  });
  it("caches only the complete sentence, never streaming previews", async () => {
    vi.mocked(onlineEngine.translate).mockImplementation(async ({ onProgress }) => {
      onProgress?.("Deliver 327");
      expect(kv.get<Record<string, unknown>>("aiCache")?.["b:vi>en:giao 327 đèn ngày mai"]).toBeUndefined();
      return { status: "ok", text: "Deliver 327 lamps tomorrow.", matches: [], engineId: "online-ai" };
    });
    await translate("giao 327 đèn ngày mai", "vi", "en", [], "auto", { brief: true, onProgress: vi.fn() });
    expect(kv.get<Record<string, { text: string }>>("aiCache")?.["b:vi>en:giao 327 đèn ngày mai"]?.text).toBe("Deliver 327 lamps tomorrow.");
  });
  it("does not cache a result completed after cancellation", async () => {
    const controller = new AbortController();
    vi.mocked(onlineEngine.translate).mockImplementation(async () => {
      controller.abort();
      return { status: "ok", text: "Do not save this", matches: [], engineId: "online-ai" };
    });
    await expect(translate("câu dịch đã dừng", "vi", "en", [], "auto", { signal: controller.signal })).rejects.toThrow("Đã dừng");
    expect(kv.get<Record<string, unknown>>("aiCache")?.["vi>en:câu dịch đã dừng"]).toBeUndefined();
  });
  it("does not fetch audio in the background or during automatic reading", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    store.updateSettings({ voiceEngine: "openai", openaiKey: "test-only", dataSaver: true });
    prefetchVoice("Travel phrase");
    speak("Travel phrase", "en", 0.9, { queue: true });
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("shares one audio download between simultaneous background requests", async () => {
    const fetcher = vi.fn(async () => ({ ok: true, blob: async () => new Blob(["audio"]) }));
    vi.stubGlobal("fetch", fetcher);
    vi.stubGlobal("URL", { createObjectURL: () => "blob:voice-test", revokeObjectURL: () => {} });
    store.updateSettings({ voiceEngine: "openai", openaiKey: "test-only", dataSaver: false });
    prefetchVoice("Unique shared audio");
    prefetchVoice("Unique shared audio");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("compresses a photo before upload instead of sending the original file", async () => {
    vi.stubGlobal("URL", { createObjectURL: () => "blob:photo", revokeObjectURL: vi.fn() });
    vi.stubGlobal("Image", class {
      width = 4000; height = 3000;
      onload?: () => void;
      set src(_value: string) { this.onload?.(); }
    });
    const draw = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: draw } as unknown as CanvasRenderingContext2D);
    const encode = vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/jpeg;base64,small");
    await compressPhoto(new File(["original"], "photo.jpg"), true);
    expect(encode).toHaveBeenCalledWith("image/jpeg", 0.65);
    expect(draw).toHaveBeenCalledWith(expect.anything(), 0, 0, 1280, 960);
  });
});