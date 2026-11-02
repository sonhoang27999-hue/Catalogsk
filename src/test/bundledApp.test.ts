import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const translateOnline = vi.fn();
vi.mock("@/lib/translate.functions", () => ({ translateOnline: (a: unknown) => translateOnline(a) }));

import { onlineEngine } from "@/lib/engine/onlineEngine";
import { store } from "@/lib/store";

const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };

describe("packaged app with no server behind it", () => {
  beforeEach(() => {
    store.updateSettings({ openaiKey: "" });
    translateOnline.mockReset();
  });
  afterEach(() => {
    delete w.Capacitor;
  });

  it("asks for an API key instead of calling the missing server", async () => {
    w.Capacitor = { isNativePlatform: () => true };
    await expect(onlineEngine.translate({ text: "Xin chào", from: "vi", to: "zh", glossary: [] })).rejects.toThrow(/API key OpenAI/);
    expect(translateOnline).not.toHaveBeenCalled();
  });

  it("keeps using the built-in server AI in the web app", async () => {
    translateOnline.mockResolvedValue({ text: "你好", pinyin: "", meaning: "" });
    const r = await onlineEngine.translate({ text: "Xin chào", from: "vi", to: "zh", glossary: [] });
    expect(translateOnline).toHaveBeenCalledTimes(1);
    expect(r.text).toBe("你好");
  });
});
