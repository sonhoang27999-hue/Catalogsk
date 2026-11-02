import { describe, expect, it, vi } from "vitest";
import { DICT_SEED } from "@/data/dictionarySeed";
import { INDUSTRY_ENTRIES, lookupCedict } from "@/lib/dict/cedict";

describe("complete industry offline Chinese–English dictionary", () => {
  it("includes all 151 built-in terms with their English meanings and pinyin", () => {
    expect(INDUSTRY_ENTRIES).toHaveLength(151);
    for (const term of DICT_SEED) {
      expect(lookupCedict(term.zh)).toContainEqual({ zh: term.zh, en: term.en, pinyin: term.pinyin });
    }
  });

  it("finds all 151 terms by English without downloading CC-CEDICT", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    for (const term of DICT_SEED) {
      expect(lookupCedict(term.en ?? "", 200).some((hit) => hit.zh === term.zh)).toBe(true);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("returns industry meanings for Chinese and English while offline", () => {
    expect(lookupCedict("氛围灯")[0]?.en).toBe("ambient light");
    expect(lookupCedict("light strip")[0]?.zh).toBe("灯带");
    expect(lookupCedict("LED芯片")[0]?.en).toBe("LED chip");
    expect(lookupCedict(" ")).toEqual([]);
  });
});