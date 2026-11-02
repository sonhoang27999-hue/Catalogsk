import { describe, expect, it } from "vitest";
import { applyTermFixes, termsInSource } from "@/lib/engine/glossaryFix";

describe("offline translation respects SK Dictionary terms", () => {
  it("picks terms present in the source, longest first", () => {
    const g = [{ vi: "đèn", zh: "灯" }, { vi: "đèn không khí", zh: "氛围灯" }, { vi: "khuôn", zh: "模具" }];
    expect(termsInSource("Báo giá đèn không khí", "vi", "zh", g)).toEqual([{ src: "đèn không khí", dst: "氛围灯" }, { src: "đèn", dst: "灯" }]);
  });
  it("replaces the model's wording with the user's term", () => {
    expect(applyTermFixes("Please quote the mood light.", [{ mt: "mood light", dst: "ambient lamp" }])).toBe("Please quote the ambient lamp.");
  });
  it("never inserts a term the output does not contain", () => {
    expect(applyTermFixes("Hello there.", [{ mt: "mould", dst: "khuôn" }])).toBe("Hello there.");
  });
});
