import { describe, expect, it } from "vitest";
import { detectLineLang, splitLines } from "@/lib/ocr/detect";

describe("detectLineLang", () => {
  it("detects Chinese, Vietnamese and English lines", () => {
    expect(detectLineLang("批发价是多少")).toBe("zh");
    expect(detectLineLang("Giá sỉ là bao nhiêu?")).toBe("vi");
    expect(detectLineLang("Minimum order quantity")).toBe("en");
  });
});

describe("splitLines", () => {
  it("trims, collapses spaces and drops short/empty lines", () => {
    expect(splitLines("  你好   世界 \n\na\nLight   strip\n")).toEqual(["你好世界", "Light strip"]);
  });
});

import { normalizeBox } from "@/lib/engine/openaiDirect";
describe("normalizeBox", () => {
  it("converts 0–1000 boxes to fractions, orders corners and rejects bad boxes", () => {
    expect(normalizeBox([500, 200, 100, 400])).toEqual([0.1, 0.2, 0.5, 0.4]);
    expect(normalizeBox([0.1, 0.1, 0.3, 0.2])).toEqual([0.1, 0.1, 0.3, 0.2]);
    expect(normalizeBox([1, 2, 3])).toBeUndefined();
    expect(normalizeBox([10, 10, 10, 10])).toBeUndefined();
  });
});
