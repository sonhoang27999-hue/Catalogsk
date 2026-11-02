import { textLevel } from "@/lib/store";
import { isBundledApp } from "@/lib/appTarget";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Cpu, Download, Upload, History, ChevronRight, KeyRound, Eye, EyeOff, Volume2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { openaiTranslate } from "@/lib/engine/openaiDirect";
import { store, useStore, type Settings } from "@/lib/store";
import { getEngine } from "@/lib/engine";
import { PageHeader } from "@/components/sk/ui";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Switch as SettingSwitch } from "@/components/ui/switch";
import { MtPackCard } from "@/components/sk/MtPackCard";
import { SourceHistoryCard } from "@/components/sk/SourceHistoryCard";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Cài đặt — SK Translate" },
      { name: "description", content: "Cỡ chữ, tốc độ đọc, tự động đọc và quyền riêng tư cục bộ." },
      { property: "og:title", content: "Cài đặt — SK Translate" },
      { property: "og:description", content: "Cài đặt và quyền riêng tư của SK Translate." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function Row({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-4">
      <div><p className="font-medium">{title}</p>{desc && <p className="text-xs text-muted-foreground">{desc}</p>}</div>
      {children}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("tap relative h-8 w-14 shrink-0 rounded-full bg-border", on && "bg-primary")}>
      <span className={cn("absolute top-1 left-1 h-6 w-6 rounded-full bg-card shadow transition-transform", on && "translate-x-6")} />
    </button>
  );
}

function StatusLine({ msg }: { msg: { ok: boolean; text: string } | null }) {
  if (!msg) return null;
  return <p className={cn("text-xs", msg.ok ? "text-success" : "text-destructive")}>{msg.text}</p>;
}

function SettingsPage() {
  const s = useStore((x) => x.settings);
  const up = (p: Partial<Settings>) => store.updateSettings(p);
  const engine = getEngine();
  return (
    <div className="space-y-4">
      <PageHeader title="Cài đặt" subtitle="设置" />

      <Link to="/history" className="tap surface flex items-center gap-3 p-4">
        <History className="h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Lịch sử</p>
          <p className="truncate text-xs text-muted-foreground">Bản dịch & hội thoại 2 chiều · xoá lịch sử</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>

      <SourceHistoryCard />

      <MtPackCard />

      <VoiceCard />

      <div className="surface divide-y">
        <Row title="Tiết kiệm data khi đi nước ngoài" desc="Dùng lại bản dịch đã lưu. Tự đọc dùng giọng OpenAI đã tải hoặc giọng máy; bấm loa để tải giọng mới. Ảnh gửi đi được nén thêm.">
          <SettingSwitch aria-label="Tiết kiệm data" checked={s.dataSaver} onCheckedChange={(v) => up({ dataSaver: v })} />
        </Row>
        <Row title="Dịch trực tuyến bằng AI" desc="Khi có mạng, gửi câu cần dịch, thuật ngữ phù hợp và tối đa 3 câu tham khảo liên quan nếu đã nhập lịch sử.">
          <Switch label="Dịch trực tuyến" on={s.onlineTranslate} onChange={(v) => up({ onlineTranslate: v })} />
        </Row>
        <Row title="Cỡ chữ" desc={`Cỡ ${textLevel(s.textSize)} / 10 · toàn bộ giao diện co theo cỡ chữ, ô hội thoại giữ nguyên`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">A</span>
            <input type="range" min={1} max={10} step={1} aria-label="Cỡ chữ" value={textLevel(s.textSize)} onChange={(e) => up({ textSize: +e.target.value })} className="w-32 accent-[var(--color-primary)]" />
            <span className="text-lg font-semibold text-muted-foreground">A</span>
          </div>
        </Row>
        <Row title="Nhận dạng giọng nói" desc="Dùng nhận dạng của trình duyệt. Một số trình duyệt có thể xử lý âm thanh trên máy chủ của họ.">
          <Switch label="Nhận dạng giọng nói" on={s.allowRecognition} onChange={(v) => up({ allowRecognition: v })} />
        </Row>
      </div>

      <OpenAIKeyCard />


      <div className="surface flex gap-3 p-4">
        <Cpu className="h-6 w-6 shrink-0 text-primary" />
        <div className="text-sm">
          <p className="font-semibold">Bộ máy dịch: {s.onlineTranslate ? "AI trực tuyến + " : ""}{engine.label}</p>
          <p className="text-muted-foreground">Từ điển SK và câu mẫu luôn được ưu tiên. Khi mất mạng, app dùng dữ liệu cục bộ trên máy. Lịch sử và từ điển chỉ lưu trên thiết bị.</p>
        </div>
      </div>

      <BackupCard />

      <button
        onClick={() => {
          if (confirm("Xoá toàn bộ dữ liệu trên thiết bị? Không thể hoàn tác.")) {
            store.clearAll();
          }
        }}
        className="tap surface w-full py-4 font-semibold text-destructive"
      >
        Xoá toàn bộ dữ liệu cục bộ
      </button>
      <p className="text-center text-xs text-muted-foreground">SK Translate · prototype 0.1</p>
    </div>
  );
}

const VOICES = ["alloy", "nova", "shimmer", "coral", "echo", "onyx"];

const MODELS = [
  { id: "gpt-4o-mini", note: "Rẻ · nhanh" },
  { id: "gpt-4o", note: "Chính xác hơn" },
  { id: "gpt-4.1-mini", note: "Cân bằng" },
  { id: "gpt-4.1", note: "Chất lượng cao" },
];

const VOICE_LANGS: Array<{ lang: "zh" | "vi" | "en"; label: string; sample: string }> = [
  { lang: "zh", label: "Tiếng Trung", sample: "你好，很高兴认识你。" },
  { lang: "vi", label: "Tiếng Việt", sample: "Xin chào, rất vui được gặp bạn." },
  { lang: "en", label: "Tiếng Anh", sample: "Hello, nice to meet you." },
];

function VoiceCard() {
  const s = useStore((x) => x.settings);
  const up = (p: Partial<Settings>) => store.updateSettings(p);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices());
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", load);
  }, []);
  return (
    <div className="surface space-y-3 p-4">
      <p className="font-semibold">Giọng đọc</p>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {([["device", "Giọng thiết bị"], ["openai", "Giọng OpenAI"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => { if (k === "openai" && !s.openaiKey) { setMsg("Dán API key OpenAI ở dưới để dùng giọng OpenAI"); return; } setMsg(null); up({ voiceEngine: k }); }}
            className={cn("tap h-11 rounded-lg text-sm font-semibold", s.voiceEngine === k ? "bg-card shadow-sm" : "text-muted-foreground")}>{l}</button>
        ))}
      </div>
      {s.voiceEngine === "openai" ? (
        <div className="grid grid-cols-3 gap-2">
          {VOICES.map((v) => (
            <button key={v} onClick={() => { store.updateSettings({ openaiVoice: v }); speak("你好，很高兴认识你。", "zh", s.speechRate); }}
              className={cn("tap h-11 rounded-xl border text-sm font-medium capitalize", s.openaiVoice === v ? "border-primary bg-primary/10" : "bg-background")}>{v}</button>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {VOICE_LANGS.map(({ lang, label, sample }) => {
            const list = voices.filter((v) => v.lang.toLowerCase().startsWith(lang));
            return (
              <div key={lang} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-sm font-medium">{label}</span>
                <select
                  aria-label={`Giọng ${label}`}
                  value={s.deviceVoices?.[lang] ?? ""}
                  onChange={(e) => up({ deviceVoices: { ...s.deviceVoices, [lang]: e.target.value } })}
                  className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-2 text-sm"
                >
                  <option value="">Mặc định</option>
                  {list.map((v) => (
                    <option key={v.name} value={v.name}>{v.name}</option>
                  ))}
                </select>
                <button onClick={() => speak(sample, lang, s.speechRate)} aria-label={`Nghe thử giọng ${label}`} className="tap grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary">
                  <Volume2 className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      <Row title="Tốc độ đọc" desc={`${s.speechRate.toFixed(1)}×`}>
        <input type="range" min={0.5} max={1.5} step={0.1} value={s.speechRate} onChange={(e) => up({ speechRate: +e.target.value })} onMouseUp={() => speak("你好", "zh", s.speechRate)} onTouchEnd={() => speak("你好", "zh", s.speechRate)} className="w-36 accent-[var(--color-primary)]" />
      </Row>
      <p className="text-[11px] text-muted-foreground">Giọng OpenAI dùng data khi tải lần đầu và được lưu để nghe lại. Khi tiết kiệm data, tự đọc không tải giọng mới; nút loa vẫn tải khi bạn bấm.</p>
      {msg && <p className="text-xs text-destructive">{msg}</p>}
    </div>
  );
}

function OpenAIKeyCard() {
  const s = useStore((x) => x.settings);
  const [key, setKey] = useState(s.openaiKey);
  const [model, setModel] = useState(s.openaiModel);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => { setKey(s.openaiKey); setModel(s.openaiModel); }, [s.openaiKey, s.openaiModel]);
  const save = () => {
    store.updateSettings({ openaiKey: key.trim(), openaiModel: model.trim() || "gpt-4o-mini" });
    setMsg({ ok: true, text: key.trim() ? "Đã lưu API key OpenAI" : isBundledApp() ? "Đã xoá API key — hãy nhập key để dịch bằng AI" : "Đã xoá API key — dùng AI mặc định" });
  };
  const test = async () => {
    if (!key.trim()) { setMsg({ ok: false, text: "Hãy nhập API key trước" }); return; }
    setBusy(true);
    try {
      const r = await openaiTranslate(key.trim(), model.trim(), { text: "Xin chào", from: "vi", to: "zh", terms: [] });
      store.updateSettings({ openaiKey: key.trim(), openaiModel: model.trim() || "gpt-4o-mini" });
      setMsg({ ok: true, text: `Kết nối OK: ${r.text}` });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="surface space-y-3 p-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <p className="font-semibold">API key OpenAI</p>
        <span className={cn("ml-auto rounded-full px-2 py-0.5 text-xs font-medium", s.openaiKey ? "bg-success/15 text-success" : "bg-secondary text-muted-foreground")}>
          {s.openaiKey ? "Đang dùng" : "Chưa có"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">Dán key từ platform.openai.com → API keys. Key chỉ lưu trên máy này và được gửi thẳng tới OpenAI.{isBundledApp() ? " Bản cài này cần key để dịch bằng AI." : " Để trống = dùng AI mặc định."}</p>
      {isBundledApp() && !s.openaiKey ? <p className="text-xs font-medium text-destructive">Chưa có API key — Dịch, Hội thoại và Camera cần key để dịch bằng AI.</p> : null}
      <div className="flex gap-2">
        <input
          type={show ? "text" : "password"}
          value={key}
          onChange={(e) => { setKey(e.target.value); setMsg(null); }}
          placeholder="sk-..."
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          className="h-12 min-w-0 flex-1 rounded-xl border bg-background px-3 text-base"
        />
        <button onClick={() => setShow(!show)} aria-label={show ? "Ẩn key" : "Hiện key"} className="tap grid h-12 w-12 place-items-center rounded-xl bg-secondary">
          {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Mô hình AI</p>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {MODELS.map((m) => (
            <button key={m.id} onClick={() => { setModel(m.id); store.updateSettings({ openaiModel: m.id }); }}
              className={cn("tap rounded-xl border px-3 py-2 text-left", model === m.id ? "border-primary bg-primary/10" : "bg-background")}>
              <p className="truncate text-sm font-semibold">{m.id}</p>
              <p className="text-[11px] text-muted-foreground">{m.note}</p>
            </button>
          ))}
        </div>
        <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Hoặc nhập tên mô hình khác" autoCapitalize="off" spellCheck={false} className="mt-2 h-12 w-full rounded-xl border bg-background px-3 text-base text-foreground" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={save} className="tap h-12 rounded-xl bg-primary font-semibold text-primary-foreground">Lưu</button>
        <button onClick={test} disabled={busy} className="tap h-12 rounded-xl bg-secondary font-semibold disabled:opacity-50">{busy ? "Đang thử…" : "Kiểm tra"}</button>
        <button onClick={() => { setKey(""); store.updateSettings({ openaiKey: "", voiceEngine: "device" }); setMsg({ ok: true, text: "Đã xoá API key" }); }} className="tap h-12 rounded-xl bg-secondary font-semibold text-destructive">Xoá</button>
      </div>
      <StatusLine msg={msg} />
    </div>
  );
}

function BackupCard() {
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const exportNow = async () => {
    const data = JSON.stringify(store.exportData());
    const name = `sk-translate-${new Date().toISOString().slice(0, 10)}.json`;
    const f = new File([data], name, { type: "application/json" });
    const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
    if (nav.canShare?.({ files: [f] })) {
      try { await navigator.share({ files: [f], title: "SK Translate backup" }); return; } catch { /* user cancelled */ return; }
    }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(f); a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg({ ok: true, text: "Đã tải file sao lưu" });
  };
  const importNow = async (f?: File) => {
    if (!f) return;
    try {
      store.importData(JSON.parse(await f.text()));
      setMsg({ ok: true, text: "Đã khôi phục dữ liệu" });
    } catch (e) { setMsg({ ok: false, text: (e as Error).message || "File không hợp lệ" }); }
  };
  return (
    <div className="surface space-y-3 p-4">
      <div><p className="font-semibold">Sao lưu & khôi phục</p>
      <p className="text-xs text-muted-foreground">Lịch sử, hội thoại, từ điển, câu nhanh, thẻ khẩn cấp và cài đặt. API key không nằm trong file.</p></div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={exportNow} className="tap inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary font-semibold"><Download className="h-5 w-5" />Xuất file</button>
        <button onClick={() => file.current?.click()} className="tap inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-secondary font-semibold"><Upload className="h-5 w-5" />Nhập file</button>
      </div>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => { importNow(e.target.files?.[0]); e.target.value = ""; }} />
      <StatusLine msg={msg} />
    </div>
  );
}
