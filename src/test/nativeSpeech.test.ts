import { readFileSync } from "node:fs";
import { describe, it, expect, vi, afterEach } from "vitest";
import { listen } from "@/lib/speech";

const script = readFileSync("native/android/speech-bridge.js", "utf8");
type Event = { text?: string; final?: boolean; done?: boolean; error?: string };
type Recognition = { lang: string; start: () => void; stop: () => void; onresult?: (event: { results: { transcript: string }[][] }) => void; onend?: () => void; onerror?: (event: { error: string }) => void };
const w = window as unknown as { Capacitor?: unknown; SKAndroidSpeechInstalled?: boolean; SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: unknown };

afterEach(() => {
  delete w.Capacitor;
  delete w.SKAndroidSpeechInstalled;
  delete w.SpeechRecognition;
  delete w.webkitSpeechRecognition;
  vi.restoreAllMocks();
});

function install() {
  let callback: (event?: Event, error?: { message: string }) => void = () => {};
  const nativeCallback = vi.fn((_plugin, _method, _options, cb) => { callback = cb; });
  const nativePromise = vi.fn(() => Promise.resolve());
  w.Capacitor = { nativeCallback, nativePromise };
  window.eval(script);
  return { nativeCallback, nativePromise, emit: (event?: Event, error?: { message: string }) => callback(event, error) };
}

describe("Android offline microphone adapter", () => {
  it.each([["vi", "vi-VN"], ["zh", "zh-CN"], ["en", "en-US"]] as const)("routes %s speech through Android even offline", (lang, locale) => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const bridge = install();
    const onText = vi.fn();
    const onDone = vi.fn();
    const stop = listen(lang, onText, onDone);
    expect(bridge.nativeCallback).toHaveBeenCalledWith("OfflineSpeech", "start", { language: locale, sessionId: "1" }, expect.any(Function));
    bridge.emit({ text: "Xin chào", final: false });
    stop();
    expect(bridge.nativePromise).toHaveBeenCalledWith("OfflineSpeech", "stop", { sessionId: "1" });
    bridge.emit({ text: "Xin chào", final: true, done: true });
    expect(onText).toHaveBeenLastCalledWith("Xin chào");
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it("reports missing offline models without a browser or network fallback", () => {
    const bridge = install();
    const onDone = vi.fn();
    const onText = vi.fn();
    listen("zh", onText, onDone);
    bridge.emit(undefined, { message: "Máy chưa có gói nhận giọng ngoại tuyến" });
    bridge.emit({ text: "stale", done: true });
    expect(onDone).toHaveBeenCalledExactlyOnceWith("Máy chưa có gói nhận giọng ngoại tuyến");
    expect(onText).not.toHaveBeenCalled();
  });

  it("notifies completion only once when browser recognition emits error then end", () => {
    let rec: Recognition | undefined;
    w.SpeechRecognition = class {
      lang = "";
      onerror?: (event: { error: string }) => void;
      onend?: () => void;
      constructor() { rec = this; }
      start() {}
      stop() {}
    };
    const onDone = vi.fn();
    listen("vi", vi.fn(), onDone);
    rec?.onerror?.({ error: "not-allowed" });
    rec?.onend?.();
    expect(onDone).toHaveBeenCalledExactlyOnceWith("not-allowed");
  });
});