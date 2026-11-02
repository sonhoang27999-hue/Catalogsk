import { describe, it, expect } from "vitest";
import { store } from "@/lib/store";

describe("backup", () => {
  it("export never contains the OpenAI key", () => {
    store.updateSettings({ openaiKey: "sk-secret" });
    expect(store.exportData().settings.openaiKey).toBe("");
  });
  it("import keeps the key already on this device", () => {
    store.updateSettings({ openaiKey: "sk-mine" });
    store.importData({ app: "sk-translate", settings: { openaiKey: "sk-other" }, history: [] });
    expect(store.get().settings.openaiKey).toBe("sk-mine");
  });
  it("rejects files that are not SK Translate backups", () => {
    expect(() => store.importData({ foo: 1 })).toThrow();
  });
});

import { QUICK_CHIPS, PHRASES } from "@/data/phrases";
describe("phrase sets do not overlap", () => {
  it("quick chips contain only everyday phrases, not Công tác topics", () => {
    for (const vi of QUICK_CHIPS) expect(PHRASES.find((p) => p.vi === vi)?.cat).toBe("basic");
  });
  it("no phrase appears twice in Công tác", () => {
    const zh = PHRASES.map((p) => p.zh);
    expect(new Set(zh).size).toBe(zh.length);
  });
});
