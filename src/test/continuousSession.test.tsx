import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { store } from "@/lib/store";

const mocks = vi.hoisted(() => ({
  capture: vi.fn(), transcribe: vi.fn(), translate: vi.fn(), speak: vi.fn(), stop: vi.fn(),
}));
vi.mock("@/lib/continuous/capture", () => ({ captureConversation: mocks.capture }));
vi.mock("@/lib/continuous/transcribe", () => ({ transcribeConversation: mocks.transcribe }));
vi.mock("@/lib/engine", () => ({ translate: mocks.translate }));
vi.mock("@/lib/speech", () => ({ speakConversation: mocks.speak }));
import { useContinuousConversation } from "@/hooks/use-continuous-conversation";

beforeEach(() => {
  vi.clearAllMocks(); store.clearAll();
  store.updateSettings({ openaiKey: "test-placeholder", autoSpeak: true });
  mocks.capture.mockResolvedValue({ stop: mocks.stop });
  mocks.translate.mockResolvedValue({ status: "ok", text: "批发价是多少？", engineId: "test" });
  mocks.speak.mockResolvedValue(undefined);
});

describe("continuous session lifecycle", () => {
  it("saves detected speech and awaits optional playback before completing its turn", async () => {
    mocks.transcribe.mockResolvedValue({ text: "Giá sỉ là bao nhiêu?", from: "vi", to: "zh" });
    const hook = renderHook(() => useContinuousConversation("vi", "zh"));
    await act(() => hook.result.current.start());
    const clip = mocks.capture.mock.calls[0]?.[0];
    await act(() => clip(new Blob()));
    expect(store.get().chat[0]?.from).toBe("vi");
    expect(store.get().chat[0]?.to).toBe("zh");
    expect(store.get().chat[0]?.target).toBe("批发价是多少？");
    expect(mocks.speak).toHaveBeenCalledWith("批发价是多少？", "zh", 0.9, expect.any(AbortSignal));
    expect(hook.result.current.status).toBe("Đang nghe hai ngôn ngữ…");
    hook.unmount(); expect(mocks.stop).toHaveBeenCalled();
  });
  it("does not speak when shared auto-reading is off", async () => {
    store.updateSettings({ autoSpeak: false });
    mocks.transcribe.mockResolvedValue({ text: "你好", from: "zh", to: "vi" });
    const hook = renderHook(() => useContinuousConversation("vi", "zh"));
    await act(() => hook.result.current.start());
    await act(() => mocks.capture.mock.calls[0]?.[0](new Blob()));
    expect(mocks.speak).not.toHaveBeenCalled();
    expect(store.get().chat[0]?.to).toBe("vi"); hook.unmount();
  });
  it("ignores a transcription completed after Stop", async () => {
    let finish: ((value: unknown) => void) | undefined;
    mocks.transcribe.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const hook = renderHook(() => useContinuousConversation("vi", "zh"));
    await act(() => hook.result.current.start());
    let turn: Promise<void> | undefined;
    act(() => { turn = mocks.capture.mock.calls[0]?.[0](new Blob()); });
    act(() => hook.result.current.stop());
    await act(async () => { finish?.({ text: "你好", from: "zh", to: "vi" }); await turn; });
    expect(store.get().chat).toHaveLength(0); expect(mocks.translate).not.toHaveBeenCalled();
    expect(hook.result.current.active).toBe(false); hook.unmount();
  });
  it("stops and releases capture when network disappears", async () => {
    const hook = renderHook(() => useContinuousConversation("vi", "zh"));
    await act(() => hook.result.current.start());
    act(() => window.dispatchEvent(new Event("offline")));
    await waitFor(() => expect(hook.result.current.active).toBe(false));
    expect(mocks.stop).toHaveBeenCalled(); hook.unmount();
  });
  it("keeps preview transient and discards translation completed after Stop", async () => {
    let finish: ((value: unknown) => void) | undefined;
    mocks.transcribe.mockResolvedValue({ text: "Giao 327 đèn", from: "vi", to: "zh" });
    mocks.translate.mockImplementation((...args) => {
      args[5].onProgress("交付327");
      return new Promise((resolve) => { finish = resolve; });
    });
    const hook = renderHook(() => useContinuousConversation("vi", "zh"));
    await act(() => hook.result.current.start());
    let turn: Promise<void> | undefined;
    await act(async () => { turn = mocks.capture.mock.calls[0]?.[0](new Blob()); await Promise.resolve(); });
    expect(hook.result.current.preview?.target).toBe("交付327");
    expect(store.get().chat).toHaveLength(0);
    expect(mocks.speak).not.toHaveBeenCalled();
    act(() => hook.result.current.stop());
    expect(mocks.translate.mock.calls[0]?.[5].signal.aborted).toBe(true);
    await act(async () => { finish?.({ status: "ok", text: "交付327盏灯", engineId: "test" }); await turn; });
    expect(hook.result.current.preview).toBeNull();
    expect(store.get().chat).toHaveLength(0);
    expect(mocks.speak).not.toHaveBeenCalled();
    hook.unmount();
  });
});