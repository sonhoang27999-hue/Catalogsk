import { beforeEach, describe, expect, it, vi } from "vitest";
import { kv } from "@/lib/storage";
import { parseVnedict } from "@/lib/dict/vnedict";
import { translate } from "@/lib/engine";
import { isMtReady, translateMt } from "@/lib/mt/offlineMt";

vi.mock("@/lib/mt/offlineMt", () => ({ isMtReady: vi.fn(), translateMt: vi.fn() }));

describe("new offline resources", () => {
  beforeEach(() => { kv.clear(); vi.clearAllMocks(); });

  it("parses licensed Vietnamese–English meanings and rejects invalid entries", () => {
    expect(parseVnedict('[["kền kền","vulture"],["hậu nghiệm","a posteriori"]]')).toEqual([
      { vi: "kền kền", en: "vulture" }, { vi: "hậu nghiệm", en: "a posteriori" },
    ]);
    expect(() => parseVnedict('[["khuôn",null]]')).toThrow();
  });

  it("translates a never-saved sentence with the downloaded model offline", async () => {
    vi.mocked(isMtReady).mockReturnValue(true);
    vi.mocked(translateMt).mockResolvedValue("明天请送来三百套灯。");
    const result = await translate("Ngày mai vui lòng giao ba trăm bộ đèn.", "vi", "zh", [], "offline");
    expect(result.engineId).toBe("on-device-mt");
    expect(result.text).toBe("明天请送来三百套灯。");
    expect(translateMt).toHaveBeenCalledWith("Ngày mai vui lòng giao ba trăm bộ đèn.", "vi", "zh");
    expect(kv.get("aiCache")).toBeUndefined();
  });

  it("prefers the downloaded model over an old cached sentence in offline mode", async () => {
    kv.set("aiCache", { "vi>zh:câu mới dùng mô hình": { text: "bản cũ" } });
    vi.mocked(isMtReady).mockReturnValue(true);
    vi.mocked(translateMt).mockResolvedValue("使用模型的新句子");
    const result = await translate("câu mới dùng mô hình", "vi", "zh", [], "offline");
    expect(result.text).toBe("使用模型的新句子");
    expect(result.engineId).toBe("on-device-mt");
  });

  it("never fabricates a sentence when no model or saved translation exists", async () => {
    vi.mocked(isMtReady).mockReturnValue(false);
    const result = await translate("câu hoàn toàn mới 739 không nằm trong kho", "vi", "zh", [], "offline");
    expect(result.status).toBe("none");
    expect(result.text).toBe("");
    expect(translateMt).not.toHaveBeenCalled();
  });
});