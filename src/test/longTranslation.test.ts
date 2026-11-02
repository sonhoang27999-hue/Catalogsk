import { afterEach, describe, expect, it, vi } from "vitest";
import { openaiTranslate } from "@/lib/engine/openaiDirect";

afterEach(() => vi.unstubAllGlobals());

describe("long sentence translation", () => {
  it("sends all source clauses in one request without shortening or extra calls", async () => {
    const source = "Tôi đặt 300 bộ đèn ambient, điện áp 12 V; chỉ giao trước ngày 25/10 nếu mẫu được duyệt, không thay bộ điều khiển và không giao từng phần. ".repeat(8);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: "stop", message: { content: "完整译文\nMEANING: Giữ đủ ý" } }] })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await openaiTranslate("test-only", "gpt-4o-mini", { text: source, from: "vi", to: "zh", terms: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0]?.[1].body);
    expect(body.messages[1].content).toBe(source);
    expect(body.model).toBe("gpt-4o-mini");
    expect(result.text).toBe("完整译文");
  });

  it("rejects truncated translation instead of returning partial output as complete", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ finish_reason: "length", message: { content: "我订购300套" } }] })));
    vi.stubGlobal("fetch", fetchMock);
    await expect(openaiTranslate("test-only", "gpt-4o-mini", { text: "Tôi đặt 300 bộ đèn nhưng không giao từng phần.", from: "vi", to: "zh", terms: [] })).rejects.toThrow("Bản dịch bị ngắt");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});