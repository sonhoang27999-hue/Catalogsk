import { describe, expect, it } from "vitest";
import { parseDelimited, rowsToTerms } from "@/lib/dict/importTerms";

describe("dictionary import", () => {
  it("reads header columns in any order", () => {
    const t = rowsToTerms(parseDelimited("中文,Tiếng Việt,English\n模具,khuôn,mold\n"));
    expect(t).toEqual([{ vi: "khuôn", zh: "模具", en: "mold", pinyin: "", category: "Chung", notes: "" }]);
  });
  it("uses default order without header and skips rows without Chinese", () => {
    const t = rowsToTerms(parseDelimited("giá sỉ\t批发价\tpīfā jià\nchỉ việt\t\t\n"));
    expect(t.length).toBe(1);
    expect(t[0]!.pinyin).toBe("pīfā jià");
  });
  it("handles quoted commas", () => {
    expect(rowsToTerms(parseDelimited('vi,zh,notes\n"a, b",甲,"x, y"'))[0]!.notes).toBe("x, y");
  });
});
