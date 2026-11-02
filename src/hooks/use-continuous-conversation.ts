import { useEffect, useRef, useState } from "react";
import { translate, type Lang } from "@/lib/engine";
import { recentContext } from "@/lib/engine/context";
import { store } from "@/lib/store";
import { speakConversation } from "@/lib/speech";
import { transcribeConversation } from "@/lib/continuous/transcribe";
import type { ContinuousCapture } from "@/lib/continuous/capture";

export function useContinuousConversation(me: Lang, them: Lang) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<{ source: string; target: string; from: Lang; to: Lang } | null>(null);
  const capture = useRef<ContinuousCapture | undefined>(undefined);
  const session = useRef<AbortController | undefined>(undefined);
  const mounted = useRef(true);
  const stop = (message = "Đã dừng Dịch liên tục.") => {
    session.current?.abort(); session.current = undefined;
    capture.current?.stop(); capture.current = undefined;
    if (mounted.current) { setActive(false); setStatus(message); setPreview(null); }
  };
  useEffect(() => {
    mounted.current = true;
    const hidden = () => { if (document.hidden) stop("Đã dừng khi rời màn hình."); };
    const offline = () => stop("Mất mạng — Dịch liên tục đã dừng.");
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("offline", offline);
    return () => {
      mounted.current = false; stop();
      document.removeEventListener("visibilitychange", hidden); window.removeEventListener("offline", offline);
    };
  }, []);

  const start = async () => {
    if (session.current) return;
    setError("");
    const key = store.get().settings.openaiKey;
    if (!key) { setError("Nhập khóa OpenAI trong Cài đặt để dùng Dịch liên tục."); return; }
    if (!navigator.onLine) { setError("Dịch liên tục cần kết nối mạng."); return; }
    if (!store.get().settings.onlineTranslate) { setError("Bật Dịch bằng AI khi có mạng trong Cài đặt."); return; }
    if (me === them) { setError("Chọn hai ngôn ngữ khác nhau."); return; }
    const controller = new AbortController(); session.current = controller;
    const { signal } = controller;
    setActive(true); setStatus("Đang mở micro…");
    const fail = (cause: Error) => {
      if (signal.aborted || !mounted.current) return;
      stop("");
      setError(cause.name === "NotAllowedError" ? "Chưa cấp quyền micro. Cho phép micro trong cài đặt điện thoại."
        : cause.name === "NotFoundError" ? "Không tìm thấy micro trên máy." : cause.message);
    };
    try {
      const { captureConversation } = await import("@/lib/continuous/capture");
      if (signal.aborted) return;
      const handle = await captureConversation(async (clip) => {
        if (signal.aborted) return;
        setStatus("Đang nhận giọng và ngôn ngữ…");
        const speech = await transcribeConversation(clip, key, me, them, signal);
        if (signal.aborted) return;
        if (!speech) { setStatus("Chưa rõ ngôn ngữ. Mời nói lại bằng một ngôn ngữ đã chọn."); return; }
        setStatus("Đang dịch…");
        const { dictionary } = store.get();
        const result = await translate(speech.text, speech.from, speech.to, dictionary, "auto", {
          brief: true, signal, context: recentContext(store.get().chat),
          onProgress: (target) => {
            if (!signal.aborted && mounted.current) setPreview({ source: speech.text, target, from: speech.from, to: speech.to });
          },
        });
        if (signal.aborted) return;
        setPreview(null);
        store.addChat({ from: speech.from, to: speech.to, source: speech.text, target: result.text, pinyin: result.pinyin, ok: result.status === "ok", engine: result.engineId, missingTerms: result.missingTerms });
        if (result.status !== "ok") throw new Error(result.notice || "Chưa dịch được câu này. Dịch liên tục đã dừng.");
        store.addHistory({ from: speech.from, to: speech.to, source: speech.text, target: result.text, pinyin: result.pinyin });
        const settings = store.get().settings;
        if (settings.autoSpeak) {
          setStatus("Đang đọc bản dịch · micro tạm nghỉ");
          await speakConversation(result.text, speech.to, settings.speechRate, signal);
        }
        if (!signal.aborted) setStatus("Đang nghe hai ngôn ngữ…");
      }, (speaking) => {
        if (!signal.aborted && speaking) setStatus("Đang nghe câu nói…");
      }, fail, signal);
      if (signal.aborted) { handle.stop(); return; }
      capture.current = handle; setStatus("Đang nghe hai ngôn ngữ…");
    } catch (cause) {
      fail(cause instanceof Error ? cause : new Error("Không mở được micro."));
    }
  };
  return { active, status, error, preview, start, stop };
}