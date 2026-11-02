import { describe, expect, it } from "vitest";
import { toPinyin } from "@/lib/pinyin";
import { recentContext, supportsTemperature } from "@/lib/engine/context";
import { translationPrompt } from "@/lib/engine/translationPrompt";
import { translationReady } from "@/lib/engine/streaming";
import { parseAi } from "@/lib/engine/parseAi";
import { TranslationInput } from "@/lib/engine/translationInput";

const base = { from: "vi" as const, to: "zh" as const, terms: [] };

describe("AI engine tuning", () => {
  it("computes pinyin on device, keeping digits", () => {
    expect(toPinyin("你好")).toBe("nǐ hǎo");
    expect(toPinyin("100个灯")).toContain("100");
  });
  it("prompt no longer asks the AI for Pinyin", () => {
    expect(translationPrompt(base)).not.toContain("PINYIN");
  });
  it("still parses legacy cached output with PINYIN", () => {
    expect(parseAi("你好\nPINYIN: nǐ hǎo\nMEANING: xin chào").text).toBe("你好");
  });
  it("ready when MEANING starts or the stream ends", () => {
    expect(translationReady("你好")).toBe(false);
    expect(translationReady("你好\nMEANING: x")).toBe(true);
    expect(translationReady("你好", true)).toBe(true);
  });
  it("adds conversation context as do-not-translate turns", () => {
    const p = translationPrompt({ ...base, context: [{ from: "zh", text: "价格多少？" }] });
    expect(p).toContain("Do NOT translate them");
    expect(p).toContain("- [zh] 价格多少？");
  });
  it("takes the 4 most recent chat turns, oldest first", () => {
    const chat = [1, 2, 3, 4, 5].map((n) => ({ from: "vi" as const, source: `c${n}`, at: n }));
    expect(recentContext(chat).map((c) => c.text)).toEqual(["c2", "c3", "c4", "c5"]);
  });
  it("rejects more than 4 context turns or turns over 500 chars", () => {
    const d = { text: "a", from: "vi", to: "zh", terms: [] };
    expect(TranslationInput.safeParse({ ...d, context: Array(5).fill({ from: "vi", text: "x" }) }).success).toBe(false);
    expect(TranslationInput.safeParse({ ...d, context: [{ from: "vi", text: "x".repeat(501) }] }).success).toBe(false);
    expect(TranslationInput.safeParse({ ...d, context: [{ from: "vi", text: "x" }] }).success).toBe(true);
  });
  it("includes number/money and polite register rules", () => {
    const p = translationPrompt(base);
    expect(p).toContain("'亿' = 10^8");
    expect(p).toContain("贵公司");
  });
  it("temperature 0 only for non-reasoning user models", () => {
    expect(supportsTemperature("gpt-4o-mini")).toBe(true);
    expect(supportsTemperature("o4-mini")).toBe(false);
    expect(supportsTemperature("gpt-5")).toBe(false);
  });
});
