import { beforeEach, describe, expect, it } from "vitest";
import { isMtReady, isMtPairReady, mtPairModels, mtPath } from "@/lib/mt/offlineMt";
import { kv } from "@/lib/storage";

describe("mtPath", () => {
  it("uses one direct model for pairs with a direct model", () => {
    expect(mtPath("zh", "en")).toEqual(["Xenova/opus-mt-zh-en"]);
    expect(mtPath("vi", "en")).toEqual(["Xenova/opus-mt-vi-en"]);
    expect(mtPath("en", "vi")).toEqual(["Xenova/opus-mt-en-vi"]);
  });

  it("pivots Chinese↔Vietnamese through English with the same four models", () => {
    expect(mtPath("zh", "vi")).toEqual(["Xenova/opus-mt-zh-en", "Xenova/opus-mt-en-vi"]);
    expect(mtPath("vi", "zh")).toEqual(["Xenova/opus-mt-vi-en", "Xenova/opus-mt-en-zh"]);
  });

  it("returns an empty path for the same language", () => {
    expect(mtPath("vi", "vi")).toEqual([]);
  });
});

describe("isMtReady", () => {
  beforeEach(() => kv.clear());

  it("requires both directions for a two-way downloaded pack", () => {
    expect(mtPairModels("zh", "vi")).toEqual([
      "Xenova/opus-mt-zh-en", "Xenova/opus-mt-en-vi",
      "Xenova/opus-mt-vi-en", "Xenova/opus-mt-en-zh",
    ]);
    kv.set("mtPack:Xenova/opus-mt-zh-en", true);
    kv.set("mtPack:Xenova/opus-mt-en-vi", true);
    expect(isMtPairReady("zh", "vi")).toBe(false);
    kv.set("mtPack:Xenova/opus-mt-vi-en", true);
    kv.set("mtPack:Xenova/opus-mt-en-zh", true);
    expect(isMtPairReady("zh", "vi")).toBe(true);
  });

  it("is false until every model of the pair is downloaded", () => {
    expect(isMtReady("zh", "vi")).toBe(false);
    kv.set("mtPack:Xenova/opus-mt-zh-en", true);
    expect(isMtReady("zh", "vi")).toBe(false);
    kv.set("mtPack:Xenova/opus-mt-en-vi", true);
    expect(isMtReady("zh", "vi")).toBe(true);
  });

  it("is true for a direct pair once its single model is downloaded", () => {
    kv.set("mtPack:Xenova/opus-mt-vi-en", true);
    expect(isMtReady("vi", "en")).toBe(true);
    expect(isMtReady("en", "vi")).toBe(false);
  });
});
