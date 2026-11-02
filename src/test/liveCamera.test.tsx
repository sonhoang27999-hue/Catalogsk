import { act, renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { frameChanged, useLiveCamera } from "@/hooks/use-live-camera";

const trackStop = vi.fn();
const getUserMedia = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: trackStop }] });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

it("does not upload an unchanged frame", () => {
  expect(frameChanged(null, [10, 20])).toBe(true);
  expect(frameChanged([10, 20], [11, 21])).toBe(false);
  expect(frameChanged([10, 20], [30, 40])).toBe(true);
});

it("requests camera only after start, no audio, and discards late results after stop", async () => {
  let finish: ((value: string[]) => void) | undefined;
  const process = vi.fn((_image: string, _signal: AbortSignal) => new Promise<string[]>((resolve) => { finish = resolve; }));
  const onResult = vi.fn();
  const hook = renderHook(() => useLiveCamera({ capture: () => ({ image: "image", signature: [20] }), process, onResult, dataSaver: true }));
  expect(getUserMedia).not.toHaveBeenCalled();
  await act(() => hook.result.current.start(async () => {}));
  expect(getUserMedia.mock.calls[0]?.[0].audio).toBe(false);
  expect(process).toHaveBeenCalledTimes(1);
  act(() => hook.result.current.stop());
  expect(process.mock.calls[0]?.[1].aborted).toBe(true);
  expect(trackStop).toHaveBeenCalledTimes(1);
  await act(async () => { finish?.(["Bản dịch"]); });
  expect(onResult).not.toHaveBeenCalled();
});

it("returns translated frames and releases camera on lost network", async () => {
  const onResult = vi.fn();
  const hook = renderHook(() => useLiveCamera({ capture: () => ({ image: "frame", signature: [20] }), process: async () => ["Lối ra"], onResult, dataSaver: true }));
  await act(() => hook.result.current.start(async () => {}));
  await waitFor(() => expect(onResult).toHaveBeenCalledWith(["Lối ra"], "frame"));
  act(() => window.dispatchEvent(new Event("offline")));
  expect(trackStop).toHaveBeenCalled();
  expect(hook.result.current.active).toBe(false);
});

it("releases a camera granted after cancellation", async () => {
  let grant: ((media: unknown) => void) | undefined;
  getUserMedia.mockImplementation(() => new Promise((resolve) => { grant = resolve; }));
  const attach = vi.fn();
  const hook = renderHook(() => useLiveCamera({ capture: () => null, process: async () => [], onResult: vi.fn(), dataSaver: true }));
  let pending: Promise<void> | undefined;
  act(() => { pending = hook.result.current.start(attach); });
  act(() => hook.result.current.stop());
  await act(async () => { grant?.({ getTracks: () => [{ stop: trackStop }] }); await pending; });
  expect(attach).not.toHaveBeenCalled();
  expect(trackStop).toHaveBeenCalled();
});