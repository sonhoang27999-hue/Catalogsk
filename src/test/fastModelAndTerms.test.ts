import { describe, expect, it } from "vitest";
import { ACCURATE_MODEL, FAST_MODEL, pickServerModel } from "@/lib/ai/translate.server";
import { missingTerms } from "@/lib/engine/glossaryFix";

describe("pickServerModel", () => {
  it("brief requests use the fast model without reasoning, temperature 0", () => {
    const p = pickServerModel("x".repeat(500), true);
    expect(p.modelId).toBe(FAST_MODEL);
    expect(p.providerOptions.reasoningEffort).toBe("none");
    expect(p.temperature).toBe(0);
  });
  it("short text (<200 chars) uses the fast model", () => {
    expect(pickServerModel("x".repeat(199)).modelId).toBe(FAST_MODEL);
  });
  it("long non-brief text keeps astra with low reasoning, no temperature", () => {
    const p = pickServerModel("x".repeat(200), false);
    expect(p.modelId).toBe(ACCURATE_MODEL);
    expect(p.providerOptions.reasoningEffort).toBe("low");
    expect(p.temperature).toBeUndefined();
  });
});

describe("missingTerms", () => {
  const g = [{ vi: "đèn không khí", zh: "氛围灯" }, { vi: "khuôn", zh: "模具" }];
  it("flags a mandatory term absent from the translation", () => {
    expect(missingTerms("Báo giá đèn không khí và khuôn", "请报价气氛灯和模具", "vi", "zh", g)).toEqual([{ src: "đèn không khí", dst: "氛围灯" }]);
  });
  it("is empty when every term is used (case/NFC-insensitive)", () => {
    expect(missingTerms("Mould price", "Giá KHUÔN", "en", "vi", [{ vi: "khuôn", zh: "模具", en: "mould" }])).toEqual([]);
  });
});
