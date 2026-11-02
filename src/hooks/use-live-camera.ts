import { useCallback, useEffect, useRef, useState } from "react";

export interface CameraFrame { image: string; signature: number[] }
export function frameChanged(previous: number[] | null, next: number[]) {
  if (!previous || previous.length !== next.length) return true;
  return next.reduce((sum, value, i) => sum + Math.abs(value - (previous[i] ?? 0)), 0) / Math.max(1, next.length) > 8;
}

/** Serial, opt-in capture. Never retain a stream or apply a result after Stop. */
export function useLiveCamera<T>({ capture, process, onResult, dataSaver }: {
  capture: () => CameraFrame | null;
  process: (image: string, signal: AbortSignal) => Promise<T>;
  onResult: (result: T, image: string) => void;
  dataSaver: boolean;
}) {
  const [active, setActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const session = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef<AbortController | null>(null);
  const callbacks = useRef({ capture, process, onResult, dataSaver });
  callbacks.current = { capture, process, onResult, dataSaver };

  const stop = useCallback(() => {
    session.current += 1;
    if (timer.current) clearTimeout(timer.current);
    request.current?.abort();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    setActive(false); setStarting(false); setBusy(false);
  }, []);

  const start = useCallback(async (attach: (stream: MediaStream) => Promise<void>) => {
    stop(); setError(""); setStarting(true);
    const id = session.current;
    try {
      if (!navigator.onLine) throw new Error("Dịch camera trực tuyến cần kết nối mạng.");
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("Trình duyệt này không mở được camera trực tiếp. Hãy dùng Chụp ảnh.");
      const media = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 960 } } });
      if (id !== session.current) { media.getTracks().forEach((track) => track.stop()); return; }
      stream.current = media;
      await attach(media);
      if (id !== session.current) return;
      setActive(true); setStarting(false);
      let previous: number[] | null = null;
      const tick = async () => {
        if (id !== session.current) return;
        const frame = callbacks.current.capture();
        if (frame && frameChanged(previous, frame.signature)) {
          const controller = new AbortController(); request.current = controller;
          const timeout = setTimeout(() => controller.abort(), 30000);
          setBusy(true);
          try {
            const result = await callbacks.current.process(frame.image, controller.signal);
            if (id !== session.current || controller.signal.aborted) return;
            previous = frame.signature;
            callbacks.current.onResult(result, frame.image);
          } catch (e) {
            if (id !== session.current) return;
            stop();
            setError(controller.signal.aborted ? "Dịch ảnh quá lâu — hãy thử lại." : (e instanceof Error ? e.message : "Không dịch được hình camera."));
            return;
          } finally { clearTimeout(timeout); if (id === session.current) setBusy(false); }
        }
        if (id === session.current) timer.current = setTimeout(() => void tick(), callbacks.current.dataSaver ? 5000 : 2000);
      };
      void tick();
    } catch (e) {
      if (id !== session.current) return;
      stop();
      const name = e instanceof Error ? e.name : "";
      setError(name === "NotAllowedError" ? "Chưa được cấp quyền camera. Hãy cho phép camera rồi thử lại." : name === "NotFoundError" ? "Không tìm thấy camera trên thiết bị." : e instanceof Error ? e.message : "Không mở được camera.");
    }
  }, [stop]);

  useEffect(() => {
    const background = () => { if (document.hidden) stop(); };
    const offline = () => { stop(); setError("Đã dừng camera trực tuyến vì mất mạng."); };
    document.addEventListener("visibilitychange", background);
    window.addEventListener("offline", offline);
    window.addEventListener("pagehide", stop);
    return () => { stop(); document.removeEventListener("visibilitychange", background); window.removeEventListener("offline", offline); window.removeEventListener("pagehide", stop); };
  }, [stop]);
  return { active, starting, busy, error, start, stop };
}