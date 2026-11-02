import { describe, it, expect } from "vitest";
import { demoEngine } from "@/lib/engine/demoEngine";
import { translate } from "@/lib/engine";
import { kv } from "@/lib/storage";

describe("aiCache missingTerms", () => {
  it("cached results still report glossary terms missing from the translation", async () => {
    const glossary = [{ vi: "khuôn", zh: "模具", en: "mold", pinyin: "mújù" }];
    kv.set("aiCache", { "vi>zh:cần khuôn mới": { text: "灯" } });
    const r = await translate("Cần khuôn mới", "vi", "zh", glossary);
    expect(r.engineId).toBe("ai-cache");
    expect(r.missingTerms).toEqual([{ src: "khuôn", dst: "模具" }]);
  });
});


describe("translation engine", () => {
  it("offline exact phrase vi→zh returns Pinyin", async () => {
    const r = await demoEngine.translate({ text: "Giá sỉ là bao nhiêu?", from: "vi", to: "zh", glossary: [] });
    expect(r.status).toBe("ok");
    expect(r.text).toBe("批发价是多少？");
  });
  it("offline never fabricates for unknown sentences", async () => {
    const r = await translate("xyz câu lạ hoàn toàn", "vi", "zh", [], "offline");
    expect(r.status).not.toBe("ok");
    expect(r.text).toBe("");
  });
  it("offline uses English glossary terms when provided", async () => {
    const r = await demoEngine.translate({ text: "mold", from: "en", to: "zh", glossary: [{ vi: "khuôn", zh: "模具", en: "mold", pinyin: "mújù" }] });
    expect(r.text).toBe("模具");
    expect(r.pinyin).toBe("mújù");
  });
});

import { parseAi } from "@/lib/engine/parseAi";
import { describe as d2, it as i2, expect as e2 } from "vitest";
d2("parseAi", () => {
  i2("splits translation, pinyin and meaning", () => {
    const r = parseAi("批发价是多少？\nPINYIN: pīfā jià shì duōshao?\nMEANING: Giá bán sỉ là bao nhiêu?");
    e2(r).toEqual({ text: "批发价是多少？", pinyin: "pīfā jià shì duōshao?", meaning: "Giá bán sỉ là bao nhiêu?" });
  });
});
