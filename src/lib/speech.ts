import type { Lang } from "./engine";
import { store } from "./store";
import { blobs } from "./storage";
import { allowVoiceDownload } from "./dataPolicy";

/** Device/browser speech. Replace with native AVSpeechSynthesizer / on-device ASR later. */
export const BCP47: Record<Lang, string> = { vi: "vi-VN", zh: "zh-CN", en: "en-US" };

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

// One shared <audio> element: iOS only allows programmatic playback on an element
// that was first played during a user tap, so we "unlock" it on the first touch.
let audio: HTMLAudioElement | null = null;
const SILENT = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAACAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAASDs90hvAAAAAAAAAAAAAAAAAAAA//sQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV";
let unlocked = false;
function el() { if (!audio && typeof Audio !== "undefined") audio = new Audio(); return audio; }
export function unlockAudio() {
  const a = el();
  if (unlocked || !a) return;
  unlocked = true;
  a.src = SILENT; a.play().catch(() => { unlocked = false; });
}
if (typeof document !== "undefined") document.addEventListener("pointerdown", unlockAudio, { capture: true, passive: true });

const urlCache = new Map<string, string>();
const ck = (voice: string, text: string) => `tts:${voice}|${text.trim()}`;

/** Get OpenAI voice audio: memory → device cache (works offline) → network (then saved). */
const voiceRequests = new Map<string, Promise<string>>();
function getVoice(key: string, voice: string, text: string, allowNetwork = true): Promise<string> {
  const id = `${ck(voice, text)}|${allowNetwork}`;
  const pending = voiceRequests.get(id);
  if (pending) return pending;
  const job = loadVoice(key, voice, text, allowNetwork).finally(() => { voiceRequests.delete(id); });
  voiceRequests.set(id, job);
  return job;
}
async function loadVoice(key: string, voice: string, text: string, allowNetwork: boolean): Promise<string> {
  const k = ck(voice, text);
  const hit = urlCache.get(k);
  if (hit) return hit;
  let blob = await blobs.get(k);
  if (!blob) {
    if (!allowNetwork) throw new Error("data-saver");
    if (typeof navigator !== "undefined" && !navigator.onLine) throw new Error("offline");
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: "gpt-4o-mini-tts", voice, input: text, response_format: "mp3",
        instructions: "Speak clearly and naturally at a calm pace, like a friendly professional interpreter." }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS ${res.status}`);
    blob = await res.blob();
    await blobs.set(k, blob);
  }
  const url = URL.createObjectURL(blob);
  if (urlCache.size > 60) { urlCache.forEach((u) => URL.revokeObjectURL(u)); urlCache.clear(); }
  urlCache.set(k, url);
  return url;
}

/** Download & save the OpenAI voice for a translation so it can be replayed offline later. */
export function prefetchVoice(text: string) {
  const st = store.get().settings;
  if (st.dataSaver || st.voiceEngine !== "openai" || !st.openaiKey || !text) return;
  getVoice(st.openaiKey, st.openaiVoice || "alloy", text).catch(() => {});
}

// Sequential queue so continuous translations are read one after another, not cut off.
let chain: Promise<void> = Promise.resolve();
let gen = 0;

function playUrl(url: string, rate: number, g: number) {
  return new Promise<void>((ok, fail) => {
    const a = el();
    if (!a || g !== gen) return ok();
    a.pause(); a.src = url;
    a.playbackRate = Math.min(1.5, Math.max(0.6, rate / 0.9));
    a.onended = () => ok(); a.onerror = () => fail(new Error("play"));
    a.play().catch(fail);
  });
}

/** Speak text. `queue: true` waits for the current reading to finish (used by auto-speak). */
export function speak(text: string, lang: Lang, rate = 0.9, opts: { queue?: boolean } = {}): boolean {
  if (!text || typeof window === "undefined") return false;
  const st = store.get().settings;
  if (st.voiceEngine === "openai" && st.openaiKey) {
    if (!opts.queue) { gen++; chain = Promise.resolve(); el()?.pause(); }
    if (canSpeak()) window.speechSynthesis.cancel();
    const g = gen;
    const job = getVoice(st.openaiKey, st.openaiVoice || "alloy", text, allowVoiceDownload(st.dataSaver, Boolean(opts.queue)));
    chain = chain.then(() => job.then((u) => playUrl(u, rate, g))).catch((e: Error) => {
      if (g !== gen) return;
      deviceSpeak(text, lang, rate, opts.queue);
    });
    return true;
  }
  return deviceSpeak(text, lang, rate, opts.queue);
}

function deviceSpeak(text: string, lang: Lang, rate: number, queue = false): boolean {
  if (!canSpeak() || !text) return false;
  if (!queue) { audio?.pause(); window.speechSynthesis.cancel(); }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = BCP47[lang];
  u.rate = rate;
  const st2 = store.get().settings;
  const voices = window.speechSynthesis.getVoices();
  const chosen = st2.deviceVoices?.[lang];
  const voice = (chosen ? voices.find((v) => v.name === chosen) : undefined) ?? voices.find((v) => v.lang.replace("_", "-").startsWith(BCP47[lang].slice(0, 2)));
  if (voice) u.voice = voice;
  window.speechSynthesis.speak(u);
  return true;
}

/** Await actual playback end before re-opening continuous microphone capture. */
export async function speakConversation(text: string, lang: Lang, rate: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return;
  gen++; audio?.pause();
  if (canSpeak()) window.speechSynthesis.cancel();
  const settings = store.get().settings;
  if (settings.voiceEngine === "openai" && settings.openaiKey) {
    // Keep travel policy: automatic audio may only use saved files in data-saving mode.
    let url: string | undefined;
    try { url = await getVoice(settings.openaiKey, settings.openaiVoice || "alloy", text, allowVoiceDownload(settings.dataSaver, true)); }
    catch { /* use device voice, without retrying the provider */ }
    if (signal.aborted) return;
    const player = el();
    if (url && player) {
      await new Promise<void>((resolve, reject) => {
        const finish = (error?: Error) => {
          signal.removeEventListener("abort", abort); player.onended = null; player.onerror = null;
          if (error) reject(error); else resolve();
        };
        const abort = () => { player.pause(); finish(); };
        signal.addEventListener("abort", abort, { once: true });
        player.src = url; player.playbackRate = Math.min(1.5, Math.max(0.6, rate / 0.9));
        player.onended = () => finish(); player.onerror = () => finish(new Error("Không phát được giọng đọc. Tắt Tự đọc để tiếp tục."));
        player.play().catch(() => finish(new Error("Máy chặn tự đọc. Tắt Tự đọc hoặc bấm nút loa để nghe.")));
      });
      return;
    }
  }
  if (!canSpeak()) throw new Error("Máy chưa có giọng đọc. Tắt Tự đọc để tiếp tục.");
  await new Promise<void>((resolve, reject) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = BCP47[lang]; utterance.rate = rate;
    const voices = window.speechSynthesis.getVoices();
    const chosen = settings.deviceVoices?.[lang];
    const voice = (chosen ? voices.find((v) => v.name === chosen) : undefined) ?? voices.find((v) => v.lang.replace("_", "-").startsWith(lang));
    if (voice) utterance.voice = voice;
    const finish = (error?: Error) => {
      signal.removeEventListener("abort", abort); utterance.onend = null; utterance.onerror = null;
      if (error) reject(error); else resolve();
    };
    const abort = () => { finish(); window.speechSynthesis.cancel(); };
    utterance.onend = () => finish();
    utterance.onerror = () => finish(new Error("Không đọc được bản dịch. Tắt Tự đọc để tiếp tục."));
    signal.addEventListener("abort", abort, { once: true });
    window.speechSynthesis.speak(utterance);
  });
}

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onerror: (e: { error: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export function getRecognitionCtor(): (new () => Rec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w["SpeechRecognition"] || w["webkitSpeechRecognition"] || null) as (new () => Rec) | null;
}

export function listen(lang: Lang, onText: (t: string) => void, onDone: (err?: string) => void) {
  let ended = false;
  const finish = (err?: string) => {
    if (ended) return;
    ended = true;
    onDone(err);
  };
  const Ctor = getRecognitionCtor();
  if (!Ctor) {
    finish("unsupported");
    return () => {};
  }
  const r = new Ctor();
  r.lang = BCP47[lang];
  r.interimResults = true;
  r.continuous = true;
  r.onresult = (e) => { if (!ended) onText(Array.from(e.results).map((x) => (x[0]?.transcript ?? "")).join("")); };
  r.onerror = (e) => finish(e.error);
  r.onend = () => finish();
  try { r.start(); } catch { finish("Không mở được micro. Hãy kiểm tra quyền nhận giọng nói."); }
  return () => { if (!ended) r.stop(); };
}
