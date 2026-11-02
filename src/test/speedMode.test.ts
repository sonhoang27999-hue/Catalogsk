import { describe, expect, it } from "vitest";
import { translationPrompt } from "@/lib/engine/translationPrompt";

describe("conversation brief mode", () => {
  it("asks for translation only — no Pinyin or explanation", () => {
    const p = translationPrompt({ from: "vi", to: "zh", terms: [], brief: true });
    expect(p).not.toContain("PINYIN:");
    expect(p).not.toContain("MEANING:");
  });
  it("normal translate page asks for explanation; Pinyin is computed on device", () => {
    const p = translationPrompt({ from: "vi", to: "zh", terms: [] });
    expect(p).not.toContain("PINYIN:");
    expect(p).toContain("MEANING:");
  });
});
