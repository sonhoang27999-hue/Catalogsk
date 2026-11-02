import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Check, Copy, ImagePlus, Loader2, KeyRound, ScanText, Download, Layers, Video, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageHeader, ActionRow, copyText } from "@/components/sk/ui";
import { store, useStore } from "@/lib/store";
import { openaiImageTranslate, type OcrLine } from "@/lib/engine/openaiDirect";
import { translate, type Lang } from "@/lib/engine";
import { detectLineLang, splitLines } from "@/lib/ocr/detect";
import { downloadOcr, initOcr, recognizeOfflineLines, useOcrStatus } from "@/lib/ocr/offlineOcr";
import { cn } from "@/lib/utils";
import { compressPhoto } from "@/lib/dataPolicy";
import { Button } from "@/components/ui/button";
import { useLiveCamera } from "@/hooks/use-live-camera";

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "Camera dịch — SK Translate" },
      { name: "description", content: "Chụp biển báo, nhãn hàng, thực đơn tiếng Trung và dịch ngay sang tiếng Việt hoặc tiếng Anh." },
      { property: "og:title", content: "Camera dịch — SK Translate" },
      { property: "og:description", content: "Chụp ảnh chữ Trung và dịch ngay." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CameraPage,
});

function CopyBtn({ text, label }: { text: string; label: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button aria-label={label} title={label} onClick={() => copyText(text, (done) => { if (done) { setOk(true); window.setTimeout(() => setOk(false), 1200); } })}
      className="tap inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground hover:bg-border">
      {ok ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

function CameraPage() {
  const s = useStore((x) => x.settings);
  const ocr = useOcrStatus();
  const [to, setTo] = useState<Lang>("vi");
  const [mode, setMode] = useState<"ai" | "offline">(s.openaiKey ? "ai" : "offline");
  const [img, setImg] = useState<string | null>(null);
  const [lines, setLines] = useState<OcrLine[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const cam = useRef<HTMLInputElement>(null);
  const lib = useRef<HTMLInputElement>(null);
  const [overlay, setOverlay] = useState(true);
  const frame = useRef<HTMLDivElement>(null);
  const [frameH, setFrameH] = useState(0);
  useEffect(() => {
    const el = frame.current; if (!el) return;
    const ro = new ResizeObserver(() => setFrameH(el.clientHeight)); ro.observe(el);
    return () => ro.disconnect();
  }, [img]);
  const boxed = lines?.filter((l) => l.box) ?? [];
  const results = useRef<Partial<Record<string, OcrLine[]>>>({});

  const video = useRef<HTMLVideoElement>(null);
  const [consent, setConsent] = useState(false);
  const [liveLines, setLiveLines] = useState<OcrLine[]>([]);
  const [videoRatio, setVideoRatio] = useState(4 / 3);
  const live = useLiveCamera<OcrLine[]>({
    dataSaver: s.dataSaver,
    capture: () => {
      const el = video.current;
      if (!el || el.readyState < 2 || !el.videoWidth) return null;
      const canvas = document.createElement("canvas");
      const ratio = Math.min(1, (s.dataSaver ? 960 : 1280) / Math.max(el.videoWidth, el.videoHeight));
      canvas.width = Math.round(el.videoWidth * ratio); canvas.height = Math.round(el.videoHeight * ratio);
      const ctx = canvas.getContext("2d"); if (!ctx) return null;
      ctx.drawImage(el, 0, 0, canvas.width, canvas.height);
      const sample = document.createElement("canvas"); sample.width = 16; sample.height = 12;
      const small = sample.getContext("2d"); if (!small) return null;
      small.drawImage(canvas, 0, 0, 16, 12);
      const pixels = small.getImageData(0, 0, 16, 12).data;
      const signature = Array.from({ length: 192 }, (_, i) => ((pixels[i * 4] ?? 0) + (pixels[i * 4 + 1] ?? 0) + (pixels[i * 4 + 2] ?? 0)) / 3);
      return { image: canvas.toDataURL("image/jpeg", s.dataSaver ? 0.6 : 0.8), signature };
    },
    process: (image, signal) => { setLiveLines([]); return openaiImageTranslate(s.openaiKey, s.openaiModel, image, to, signal); },
    onResult: (result, image) => { setLiveLines(result); setLines(result); setImg(image); results.current = {}; },
  });
  const cameraRunning = live.active || live.starting;
  const startLive = () => {
    setConsent(false); setLines(null); setLiveLines([]); setErr("");
    void live.start(async (stream) => {
      const el = video.current; if (!el) throw new Error("Không mở được khung camera.");
      el.srcObject = stream;
      await el.play();
      setVideoRatio(el.videoWidth / el.videoHeight || 4 / 3);
    });
  };

  useEffect(() => { initOcr(); }, []);
  const canOffline = ocr === "ready";
  const useAi = mode === "ai" && !!s.openaiKey;

  const runOffline = async (url: string, lang: Lang) => {
    const { dictionary } = store.get();
    const raw = (await recognizeOfflineLines(url)).flatMap((l) => splitLines(l.text).slice(0, 1).map((original) => ({ original, box: l.box })));
    const out: OcrLine[] = [];
    for (const { original, box } of raw) {
      const from = detectLineLang(original);
      if (from === lang) { out.push({ original, translation: original, pinyin: "", box }); continue; }
      const r = await translate(original, from, lang, dictionary, "offline");
      out.push({ original, translation: r.text || original, pinyin: r.pinyin ?? "", box });
      if (r.status === "ok" && r.text) store.addHistory({ from, to: lang, source: original, target: r.text, pinyin: r.pinyin });
    }
    return out;
  };

  const run = async (f?: File, lang = to) => {
    if (!f && !img) return;
    const cacheKey = `${mode}:${lang}`;
    if (!f && results.current[cacheKey]) { setLines(results.current[cacheKey] ?? null); return; }
    setErr(""); setLines(null); setBusy(true);
    try {
      if (f) results.current = {};
      const url = f ? await compressPhoto(f, s.dataSaver) : img;
      if (!url) return;
      setImg(url);
      const r = useAi
        ? await openaiImageTranslate(s.openaiKey, s.openaiModel, url, lang)
        : await runOffline(url, lang);
      setLines(r);
      results.current[cacheKey] = r;
      if (useAi) r.forEach((l) => l.original && store.addHistory({ from: "zh", to: lang, source: l.original, target: l.translation, pinyin: undefined }));
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  const pick = (e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) run(f); };

  return (
    <div className="space-y-4">
      <PageHeader back title="Camera dịch" subtitle="拍照翻译 · Chụp là dịch" />

      <Button variant={cameraRunning ? "destructive" : "default"} disabled={busy} className="h-12 w-full" onClick={() => cameraRunning ? live.stop() : setConsent(!consent)}>
        {cameraRunning ? <Square /> : <Video />}{cameraRunning ? "Dừng camera trực tuyến" : "Dịch camera trực tuyến"}
      </Button>
      {consent && <div className="space-y-3 rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">Khi bật, các khung hình có thay đổi được gửi tới OpenAI bằng khóa của bạn; cần mạng và có phí sử dụng. Ảnh không được lưu vào lịch sử.</p>
        {!s.openaiKey ? <p className="text-sm text-destructive">Hãy thêm khóa OpenAI trong Cài đặt trước khi bật.</p> : <Button className="h-11 w-full" onClick={startLive}><Video />Bật camera và dịch</Button>}
      </div>}
      {live.error && <p role="alert" className="text-sm text-destructive">{live.error}</p>}
      <div className={cn("relative overflow-hidden rounded-lg bg-foreground", !cameraRunning && "hidden")} style={{ aspectRatio: videoRatio }}>
        <video ref={video} autoPlay muted playsInline aria-label="Camera trực tuyến" className="block h-full w-full object-contain" />
        {overlay && liveLines.map((line, i) => {
          if (!line.box) return null;
          const [x0, y0, x1, y1] = line.box;
          return <span key={i} className="absolute flex items-center rounded-sm bg-card/90 px-1 text-sm font-semibold text-foreground shadow-sm" style={{ left: `${x0 * 100}%`, top: `${y0 * 100}%`, minWidth: `${(x1 - x0) * 100}%`, maxWidth: `${(1 - x0) * 100}%`, minHeight: `${(y1 - y0) * 100}%` }}>{line.translation}</span>;
        })}
        <span role="status" className="absolute bottom-2 left-2 flex items-center gap-2 rounded-md bg-card/90 px-3 py-2 text-xs text-foreground">{live.busy || live.starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Video className="h-4 w-4" />}{live.starting ? "Đang mở camera…" : live.busy ? "Đang dịch khung hình…" : "Camera đang mở"}</span>
      </div>

      <div className="surface space-y-2 p-4">
        <div className="flex items-center gap-2">
          <ScanText className="h-5 w-5 text-primary" />
          <p className="font-semibold">Nhận chữ ngoại tuyến</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Bộ nhận chữ Trung · Việt · Anh chạy ngay trên máy (~5 MB, tải một lần). Sau khi tải, đọc chữ trong ảnh không cần mạng. Để dịch cả câu ngoại tuyến, tải thêm "Bộ dịch ngoại tuyến" trong Cài đặt.
        </p>
        {ocr === "ready" && <p className="text-sm font-medium text-primary">Bộ nhận chữ đã sẵn sàng ngoại tuyến.</p>}
        {ocr === "downloading" && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải bộ nhận chữ…</p>}
        {ocr === "error" && <p className="text-sm text-destructive">Tải lỗi — kiểm tra mạng rồi thử lại.</p>}
        {(ocr === "absent" || ocr === "error") && (
          <button onClick={() => void downloadOcr()} className="tap inline-flex h-11 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold">
            <Download className="h-4 w-4" />Tải bộ nhận chữ
          </button>
        )}
      </div>

      {!s.openaiKey && !canOffline ? (
        <div className="surface space-y-3 p-5 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-primary" />
          <p className="font-semibold">Cần API key OpenAI hoặc bộ nhận chữ ngoại tuyến</p>
          <p className="text-sm text-muted-foreground">Dịch bằng AI cần key trong Cài đặt. Không có mạng thì tải bộ nhận chữ ở trên (dịch theo từ điển trên máy).</p>
          <Link to="/settings" className="tap inline-flex h-12 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Mở Cài đặt</Link>
        </div>
      ) : (<>
        {s.openaiKey && canOffline && (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
            {(["ai", "offline"] as const).map((m) => (
              <button key={m} disabled={busy || cameraRunning} onClick={() => { if (mode === m) return; setMode(m); setLines(null); }} className={cn("tap h-11 rounded-lg text-sm font-semibold", mode === m ? "bg-card shadow-sm" : "text-muted-foreground")}>
                {m === "ai" ? "AI trực tuyến" : "Ngoại tuyến"}
              </button>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
          {(["vi", "en"] as const).map((l) => (
            <button key={l} disabled={busy || cameraRunning} onClick={() => { if (to === l) return; setTo(l); if (img) run(undefined, l); }} className={cn("tap h-11 rounded-lg text-sm font-semibold", to === l ? "bg-card shadow-sm" : "text-muted-foreground")}>
              Dịch sang {l === "vi" ? "Tiếng Việt" : "English"}
            </button>
          ))}
        </div>
        <div className={cn("relative flex aspect-[4/3] max-h-[70vh] items-center justify-center overflow-hidden rounded-3xl bg-foreground text-background", cameraRunning && "hidden")}>
          {img ? (
            <div ref={frame} className="relative max-h-full max-w-full">
              <img src={img} alt="Ảnh cần dịch" className="block max-h-[inherit] max-w-full object-contain" style={{ maxHeight: "inherit" }} />
              {overlay && !busy && boxed.map((l, i) => {
                if (!l.box) return null;
                const [x0, y0, x1, y1] = l.box;
                const fs = Math.max(9, Math.min(28, (y1 - y0) * frameH * 0.7));
                return (
                  <span key={i} className="absolute flex items-center overflow-hidden rounded-sm bg-card/90 px-0.5 font-semibold leading-tight text-foreground shadow-sm"
                    style={{ left: `${x0 * 100}%`, top: `${y0 * 100}%`, minWidth: `${(x1 - x0) * 100}%`, maxWidth: `${(1 - x0) * 100}%`, minHeight: `${(y1 - y0) * 100}%`, fontSize: fs }}>
                    {l.translation}
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="text-center"><Camera className="mx-auto h-12 w-12 opacity-80" strokeWidth={1.5} /><p className="mt-2 text-sm opacity-70">Biển báo · nhãn hàng · thực đơn</p></div>
          )}
          {busy && <div className="absolute inset-0 grid place-items-center bg-foreground/60"><Loader2 className="h-10 w-10 animate-spin" /></div>}
        </div>
        {boxed.length > 0 && (
          <button onClick={() => setOverlay((v) => !v)} aria-pressed={overlay} className={cn("tap inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold", overlay ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground")}>
            <Layers className="h-4 w-4" />{overlay ? "Ẩn chữ dịch" : "Hiện chữ dịch"}
          </button>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => cam.current?.click()} disabled={busy || cameraRunning} className="tap inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary font-semibold text-primary-foreground disabled:opacity-50"><Camera className="h-5 w-5" />Chụp ảnh</button>
          <button onClick={() => lib.current?.click()} disabled={busy || cameraRunning} className="tap inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-secondary font-semibold disabled:opacity-50"><ImagePlus className="h-5 w-5" />Chọn ảnh</button>
        </div>
        <input ref={cam} type="file" accept="image/*" capture="environment" hidden onChange={pick} />
        <input ref={lib} type="file" accept="image/*" hidden onChange={pick} />
        {err && <p className="surface p-4 text-sm text-destructive">{err}</p>}
        {lines && lines.length === 0 && <p className="surface p-4 text-center text-sm text-muted-foreground">Không thấy chữ trong ảnh. Hãy chụp gần và rõ hơn.</p>}
        {lines && lines.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => copyText(lines.map((l) => l.original).join("\n"))} className="tap inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold"><Copy className="h-4 w-4" />Chép tất cả bản gốc</button>
            <button onClick={() => copyText(lines.map((l) => l.translation).join("\n"))} className="tap inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold"><Copy className="h-4 w-4" />Chép tất cả bản dịch</button>
          </div>
        )}
        {lines?.map((l, i) => (
          <article key={i} className="surface p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-zh text-lg">{l.original}</p>
              <CopyBtn text={l.original} label="Sao chép chữ gốc" />
            </div>
            {l.pinyin && <p className="text-sm text-primary">{l.pinyin}</p>}
            <div className="mt-1 flex items-start justify-between gap-2">
              <p className="text-xl font-semibold">{l.translation}</p>
              <CopyBtn text={l.translation} label="Sao chép bản dịch" />
            </div>
            <div className="mt-2"><ActionRow source={l.original} target={l.translation} from="zh" to={to} /></div>
          </article>
        ))}
        <p className="text-center text-[11px] text-muted-foreground">
          {(useAi || cameraRunning)
            ? "Ảnh được gửi thẳng tới OpenAI bằng key của bạn để đọc chữ, không lưu ở đâu khác."
            : "Ảnh được đọc ngay trên máy, không gửi đi đâu. Bản dịch ngoại tuyến dựa trên từ điển và các câu đã lưu."}
        </p>
      </>)}
    </div>
  );
}
