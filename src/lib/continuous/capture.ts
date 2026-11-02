import { encodeWav } from "./audio";

export interface ContinuousCapture {
  pause(): void;
  resume(): void;
  stop(): void;
}

/** Browser-only opt-in audio; Hark segments speech, PCM keeps each upload independently decodable. */
export async function captureConversation(
  onClip: (clip: Blob) => Promise<void>,
  onSpeaking: (active: boolean) => void,
  onFailure: (error: Error) => void,
  signal: AbortSignal,
): Promise<ContinuousCapture> {
  if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
    throw new Error("Máy này chưa hỗ trợ micro cho Dịch liên tục. Bạn vẫn có thể giữ micro để nói.");
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } });
  let context: AudioContext | undefined;
  if (signal.aborted) { stream.getTracks().forEach((track) => track.stop()); throw new DOMException("Stopped", "AbortError"); }
  try {
    context = new AudioContext({ sampleRate: 16000 });
    await context.resume();
    const ctx = context;
    const { default: hark } = await import("hark");
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(2048, 1, 1);
    const detector = hark(stream, { audioContext: ctx, threshold: -45, interval: 100, history: 8, play: false });
    let stopped = false, paused = false, speaking = false, processing = false;
    let chunks: Float32Array[] = [], preroll: Float32Array[] = [];
    let samples = 0;
    const clear = () => { chunks = []; preroll = []; samples = 0; speaking = false; onSpeaking(false); };
    const control: ContinuousCapture = {
      pause() { paused = true; clear(); },
      resume() { if (!stopped) { clear(); paused = false; } },
      stop() {
        if (stopped) return;
        stopped = true; paused = true;
        signal.removeEventListener("abort", control.stop);
        detector.stop(); processor.onaudioprocess = null;
        processor.disconnect(); source.disconnect();
        stream.getTracks().forEach((track) => track.stop());
        void ctx.close(); clear();
      },
    };
    const flush = () => {
      if (stopped || paused || processing || !chunks.length) return;
      const duration = samples / ctx.sampleRate;
      const clip = duration >= 0.6 ? encodeWav(chunks, ctx.sampleRate) : undefined;
      clear();
      if (!clip) return;
      processing = true; paused = true;
      void onClip(clip).catch((error: unknown) => {
        control.stop();
        if (!signal.aborted) onFailure(error instanceof Error ? error : new Error("Không xử lý được giọng nói."));
      }).finally(() => {
        processing = false;
        if (!stopped && !signal.aborted) control.resume();
      });
    };
    detector.on("speaking", () => {
      if (stopped || paused || processing || speaking) return;
      speaking = true; chunks = [...preroll]; samples = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
      onSpeaking(true);
    });
    detector.on("stopped_speaking", flush);
    processor.onaudioprocess = (event) => {
      if (stopped || paused || processing) return;
      const chunk = new Float32Array(event.inputBuffer.getChannelData(0));
      if (speaking) {
        chunks.push(chunk); samples += chunk.length;
        // Do not silently drop the tail of long speech by pausing mid-sentence.
        if (samples >= ctx.sampleRate * 240) {
          control.stop();
          onFailure(new Error("Câu nói quá dài. Dịch liên tục đã dừng; hãy nói từng câu ngắn hơn."));
        }
      } else {
        preroll.push(chunk); if (preroll.length > 4) preroll.shift();
      }
    };
    source.connect(processor); processor.connect(ctx.destination);
    for (const track of stream.getTracks()) track.onended = () => {
      if (!stopped) { control.stop(); onFailure(new Error("Micro đã ngắt. Bấm Bắt đầu để thử lại.")); }
    };
    signal.addEventListener("abort", control.stop, { once: true });
    if (signal.aborted) control.stop();
    return control;
  } catch (error) {
    stream.getTracks().forEach((track) => track.stop()); await context?.close(); throw error;
  }
}