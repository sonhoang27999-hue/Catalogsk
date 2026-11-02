import { beforeEach, describe, expect, it } from "vitest";
import { store } from "@/lib/store";
import { kv } from "@/lib/storage";

describe("conversation history", () => {
  beforeEach(() => store.clearAllHistory());

  it("starting a new conversation archives every old message and empties the current chat", () => {
    store.addChat({ from: "vi", to: "zh", source: "Xin chào", target: "你好", ok: true });
    store.addChat({ from: "zh", to: "vi", source: "谢谢", target: "Cảm ơn", ok: true });
    const original = [...store.get().chat];
    store.clearChat();
    expect(store.get().chat).toEqual([]);
    expect(store.get().conversations).toHaveLength(1);
    expect(store.get().conversations[0]?.messages).toEqual(original);
    expect(kv.get("conversations")).toEqual(store.get().conversations);
    expect(kv.get("chat")).toEqual([]);
  });

  it("a new conversation keeps its messages separate from the saved conversation", () => {
    store.addChat({ from: "vi", to: "zh", source: "Xin chào", target: "你好", ok: true });
    store.clearChat();
    store.addChat({ from: "vi", to: "zh", source: "Cảm ơn", target: "谢谢", ok: true });
    expect(store.get().conversations[0]?.messages.map((m) => m.source)).toEqual(["Xin chào"]);
    expect(store.get().chat.map((m) => m.source)).toEqual(["Cảm ơn"]);
  });

  it("does not create a history entry for an empty conversation", () => {
    store.clearChat();
    expect(store.get().conversations).toEqual([]);
  });

  it.each(["me", "them"] as const)("changing the %s language archives the old conversation", (side) => {
    store.addChat({ from: "vi", to: "zh", source: "Xin chào", target: "你好", ok: true });
    store.addChat({ from: "zh", to: "vi", source: "谢谢", target: "Cảm ơn", ok: true });
    const original = [...store.get().chat];
    const pair = store.changeConversationLanguage({ me: "vi", them: "zh" }, side, "en");
    expect(pair).toEqual(side === "me" ? { me: "en", them: "zh" } : { me: "vi", them: "en" });
    expect(store.get().chat).toEqual([]);
    expect(store.get().conversations[0]?.messages).toEqual(original);
    expect(kv.get("conversations")).toEqual(store.get().conversations);
  });

  it("swapping to the other side's language also archives the conversation", () => {
    store.addChat({ from: "vi", to: "zh", source: "Xin chào", target: "你好", ok: true });
    expect(store.changeConversationLanguage({ me: "vi", them: "zh" }, "me", "zh")).toEqual({ me: "zh", them: "vi" });
    expect(store.get().conversations).toHaveLength(1);
    expect(store.get().chat).toEqual([]);
  });

  it("keeping the same language does not end the conversation", () => {
    store.addChat({ from: "vi", to: "zh", source: "Xin chào", target: "你好", ok: true });
    store.changeConversationLanguage({ me: "vi", them: "zh" }, "them", "zh");
    expect(store.get().chat).toHaveLength(1);
    expect(store.get().conversations).toEqual([]);
  });

  it("changing language in an empty conversation does not save an empty archive", () => {
    store.changeConversationLanguage({ me: "vi", them: "zh" }, "them", "en");
    expect(store.get().conversations).toEqual([]);
  });
});