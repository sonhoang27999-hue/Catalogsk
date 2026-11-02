import { useSyncExternalStore } from "react";
import { kv } from "@/lib/storage";

/**
 * On-device OCR (Tesseract) for Chinese + Vietnamese + English.
 * The language data (~5 MB) is downloaded once on demand and cached in
 * IndexedDB by tesseract.js itself, so recognition works without internet.
 * The library is imported lazily so it never loads on the server or on
 * pages that do not use the camera.
 */

type Status = "unknown" | "absent" | "downloading" | "ready" | "error";
const FLAG = "ocrPack:v1";
const LANGS = ["chi_sim", "vie", "eng"];

let status: Status = "unknown";
const ls = new Set<() => void>();
const emit = (s: Status) => { status = s; ls.forEach((l) => l()); };

export function initOcr() {
  if (status !== "unknown") return;
  emit(kv.get<boolean>(FLAG) ? "ready" : "absent");
}

export function useOcrStatus() {
  return useSyncExternalStore(
    (l) => { ls.add(l); return () => ls.delete(l); },
    () => status,
    () => "unknown" as Status,
  );
}

async function makeWorker() {
  const [{ createWorker }, { default: workerPath }, { default: corePath }] = await Promise.all([
    import("tesseract.js"),
    import("tesseract.js/dist/worker.min.js?url"),
    import("tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url"),
  ]);
  return createWorker(LANGS, 1, { workerPath, corePath });
}

/** Download the language data once and keep it on this device. */
export async function downloadOcr() {
  emit("downloading");
  try {
    const worker = await makeWorker();
    await worker.terminate();
    kv.set(FLAG, true);
    emit("ready");
  } catch {
    emit("error");
  }
}

/** Recognize raw text from an image (data URL), fully on-device. */
export async function recognizeOffline(image: string): Promise<string> {
  const worker = await makeWorker();
  try {
    const { data } = await worker.recognize(image);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

/** Recognize text lines with their positions (0–1 fractions of the image), fully on-device. */
export async function recognizeOfflineLines(image: string): Promise<{ text: string; box: [number, number, number, number] }[]> {
  const size = await new Promise<{ w: number; h: number }>((res, rej) => {
    const im = new Image(); im.onload = () => res({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = rej; im.src = image;
  });
  const worker = await makeWorker();
  try {
    const { data } = await worker.recognize(image, {}, { blocks: true });
    const out: { text: string; box: [number, number, number, number] }[] = [];
    for (const b of data.blocks ?? []) for (const p of b.paragraphs) for (const l of p.lines) {
      const { x0, y0, x1, y1 } = l.bbox;
      out.push({ text: l.text, box: [x0 / size.w, y0 / size.h, x1 / size.w, y1 / size.h] });
    }
    return out;
  } finally {
    await worker.terminate();
  }
}
