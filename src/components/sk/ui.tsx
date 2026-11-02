import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BookmarkPlus, Check, Copy, Mic, Volume2, VolumeX, Globe, Maximize2, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type PointerEvent as RPointerEvent } from "react";
import { cn } from "@/lib/utils";
import { store, useStore } from "@/lib/store";
import { listen, speak, canSpeak, getRecognitionCtor } from "@/lib/speech";
import { LANGS, LANG_LABEL, LANG_SHORT, otherLang, type Lang } from "@/lib/engine";

export function OfflineBadge({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground", className)}>
      <Globe className="h-3.5 w-3.5" /> VI·中·EN
    </span>
  );
}

/** AI on: online AI helps (best quality). AI off: on-device only (fastest, no data). */
export function AiToggle() {
  const on = useStore((s) => s.settings.onlineTranslate);
  const label = on ? "Tắt dịch bằng AI (chỉ dùng trên máy, nhanh hơn)" : "Bật dịch bằng AI";
  return (
    <button
      aria-label={label}
      aria-pressed={on}
      title={label}
      onClick={() => { navigator.vibrate?.(10); store.updateSettings({ onlineTranslate: !on }); }}
      className={cn(
        "tap inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 text-xs font-bold",
        on ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-border",
      )}
    >
      {on ? "AI bật" : "AI tắt"}
    </button>
  );
}

export function AutoSpeakToggle({ compact }: { compact?: boolean }) {
  const autoSpeak = useStore((s) => s.settings.autoSpeak);
  const label = autoSpeak ? "Tắt tự đọc bản dịch" : "Bật tự đọc bản dịch";
  return (
    <button
      aria-label={label}
      title={label}
      onClick={() => {
        navigator.vibrate?.(10);
        store.updateSettings({ autoSpeak: !autoSpeak });
      }}
      className={cn(
        "tap inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full font-semibold",
        compact ? "h-9 w-9" : "px-3 py-1.5 text-xs",
        autoSpeak ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-border",
      )}
    >
      {autoSpeak ? <Volume2 className={cn(compact ? "h-4.5 w-4.5" : "h-4 w-4")} /> : <VolumeX className={cn(compact ? "h-4.5 w-4.5" : "h-4 w-4")} />}
      {!compact && "Tự đọc"}
    </button>
  );
}

export function PageHeader({ title, subtitle, back, right }: { title: string; subtitle?: string; back?: boolean; right?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pb-4 pt-4 max-[359px]:grid-cols-1 max-[359px]:gap-2">
      <div className="flex min-w-0 items-start gap-2">
        {back && (
          <button aria-label="Quay lại" onClick={() => navigate({ to: "/" })} className="tap -ml-2 mt-0.5 rounded-full p-2 hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle && <p className="mt-0.5 truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {right ?? <OfflineBadge className="mt-1.5" />}
    </header>
  );
}

export function IconBtn({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "tap inline-flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground hover:bg-border",
        active && "bg-accent text-primary",
      )}
    >
      {children}
    </button>
  );
}

export function useSpeak() {
  const rate = useStore((s) => s.settings.speechRate);
  return (text: string, lang: Lang) => {
    speak(text, lang, rate);
  };
}

export function copyText(text: string, done?: (ok: boolean) => void) {
  navigator.clipboard?.writeText(text).then(
    () => done?.(true),
    () => done?.(false),
  );
}

export function ActionRow({ source, target, pinyin, from, to: toProp }: { source: string; target: string; pinyin?: string | undefined; from: Lang; to?: Lang | undefined }) {
  const sp = useSpeak();
  const to: Lang = toProp ?? otherLang(from);
  const [big, setBig] = useState(false);
  const [ok, setOk] = useState<"copy" | "quick" | null>(null);
  const flash = (k: "copy" | "quick") => { setOk(k); window.setTimeout(() => setOk(null), 1200); };
  return (
    <div className="flex items-center gap-2">
      {big && <BigScreen text={target} pinyin={pinyin} lang={to} onClose={() => setBig(false)} />}
      <IconBtn label="Đọc" onClick={() => sp(target, to)}><Volume2 className="h-5 w-5" /></IconBtn>
      <IconBtn label="Sao chép" onClick={() => copyText(target, (done) => done && flash("copy"))}>{ok === "copy" ? <Check className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5" />}</IconBtn>
      <IconBtn label="Phóng to cho người đối diện" onClick={() => setBig(true)}><Maximize2 className="h-5 w-5" /></IconBtn>
      <IconBtn
        label="Lưu vào Câu nhanh"
        onClick={() => {
          store.addQuickPhrase({
            vi: from === "vi" ? source : to === "vi" ? target : "",
            zh: from === "zh" ? source : to === "zh" ? target : "",
            en: (from === "en" ? source : to === "en" ? target : "") || undefined,
          });
          flash("quick");
        }}
      >{ok === "quick" ? <Check className="h-5 w-5 text-success" /> : <BookmarkPlus className="h-5 w-5" />}</IconBtn>
    </div>
  );
}

/** Full-screen large text to show the person in front of you. */
export function BigScreen({ text, pinyin, lang, sub, onClose }: { text: string; pinyin?: string | undefined; lang: Lang; sub?: string | undefined; onClose: () => void }) {
  const sp = useSpeak();
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background p-6 pt-[calc(1.5rem+env(safe-area-inset-top))]" onClick={onClose}>
      <button aria-label="Đóng" className="tap ml-auto grid h-12 w-12 place-items-center rounded-full bg-secondary"><X className="h-6 w-6" /></button>
      <div className="flex flex-1 flex-col justify-center gap-4 overflow-y-auto text-center">
        <p className={cn("whitespace-pre-line break-words text-5xl font-bold leading-tight", lang === "zh" && "font-zh")}>{text}</p>
        {pinyin && lang === "zh" && <p className="text-xl text-muted-foreground">{pinyin}</p>}
        {sub && <p className="text-base text-muted-foreground">{sub}</p>}
      </div>
      <button onClick={(e) => { e.stopPropagation(); sp(text, lang); }} className="tap mx-auto mb-[env(safe-area-inset-bottom)] flex h-14 items-center gap-2 rounded-full bg-primary px-8 font-semibold text-primary-foreground"><Volume2 className="h-5 w-5" /> Đọc to</button>
    </div>
  );
}

export type MicTone = "primary" | "partner";

const MIC_TONES: Record<MicTone, { fill: string; ring: string; ping: string; pingSoft: string; banner: string }> = {
  primary: { fill: "bg-primary text-primary-foreground", ring: "ring-primary/30", ping: "bg-primary/30", pingSoft: "bg-primary/15", banner: "bg-primary" },
  partner: { fill: "bg-partner text-partner-foreground", ring: "ring-partner/30", ping: "bg-partner/30", pingSoft: "bg-partner/15", banner: "bg-partner" },
};

/** Push-to-talk: hold to speak, release to finish. onRelease receives the final transcript. */
export function MicButton({
  lang, onText, onRelease, onSessionChange, size = "lg", label, className, tone = "primary",
}: { lang: Lang; onText: (t: string) => void; onRelease?: (t: string) => void; onSessionChange?: (active: boolean) => void; size?: "lg" | "md"; label?: string; className?: string; tone?: MicTone }) {
  const c = MIC_TONES[tone];
  const allowed = useStore((s) => s.settings.allowRecognition);
  const [on, setOn] = useState(false);
  const stop = useRef<() => void>(() => {});
  const last = useRef("");
  const holding = useRef(false);
  const done = useRef(false);
  const base = useRef("");
  const tick = useRef(0);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const mounted = useRef(true);
  const [secs, setSecs] = useState(0);
  const [live, setLive] = useState("");
  const [err, setErr] = useState("");
  const errTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const showErr = (code: string) => {
    setErr(micErrorText(code));
    clearTimeout(errTimer.current);
    errTimer.current = setTimeout(() => mounted.current && setErr(""), 6000);
  };
  useEffect(() => () => clearTimeout(errTimer.current), []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      holding.current = false;
      done.current = true;
      clearTimeout(releaseTimer.current);
      window.clearInterval(tick.current);
      stop.current();
    };
  }, []);
  const finish = () => {
    if (done.current || !mounted.current) return;
    done.current = true;
    onSessionChange?.(false);
    clearTimeout(releaseTimer.current);
    window.clearInterval(tick.current);
    setOn(false); setLive("");
    const t = last.current.trim();
    if (t) onRelease?.(t);
  };
  const down = (e: React.PointerEvent) => {
    e.preventDefault();
    if (holding.current || (releaseTimer.current && !done.current)) return;
    if (!getRecognitionCtor()) { showErr("unsupported"); return; }
    setErr("");
    if (!allowed) store.updateSettings({ allowRecognition: true });
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch { /* ignore */ }
    holding.current = true;
    onSessionChange?.(true);
    done.current = false;
    last.current = "";
    setOn(true);
    navigator.vibrate?.(15);
    base.current = "";
    setSecs(0);
    const t0 = Date.now();
    tick.current = window.setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 500);
    const start = () => {
      stop.current = listen(lang, (t) => {
        last.current = (base.current ? base.current + (lang === "zh" ? "" : " ") : "") + t;
        setLive(last.current); onText(last.current);
      }, (err) => {
        const fatal = err && err !== "aborted" && err !== "no-speech";
        // iPhone Safari ends recognition after pauses — keep listening while the finger is down.
        if (holding.current && !fatal) { base.current = last.current; try { start(); } catch { holding.current = false; finish(); } return; }
        holding.current = false;
        if (fatal) showErr(err);
        finish();
      });
    };
    start();
  };
  const up = () => {
    if (!holding.current) return;
    holding.current = false;
    // Hide recording feedback immediately; final text may arrive after release.
    setOn(false); setLive("");
    window.clearInterval(tick.current);
    stop.current();
    // recognition onend will call finish; fallback in case it never fires
    releaseTimer.current = setTimeout(finish, 1200);
  };
  const dim = size === "lg" ? "h-16 w-16" : "h-12 w-12";
  return (
    <>
    {on && (
      <div className="pointer-events-none fixed inset-x-0 top-[calc(0.5rem+env(safe-area-inset-top))] z-50 flex flex-col items-center gap-2 px-3">
        <div className={cn("flex max-w-full items-center gap-2.5 rounded-full px-4 py-2.5 text-primary-foreground shadow-[var(--shadow-float)]", c.banner)}>
          <span className="relative flex h-3 w-3"><span className="absolute inset-0 animate-ping rounded-full bg-primary-foreground" /><span className="relative h-3 w-3 rounded-full bg-primary-foreground" /></span>
          <span className="whitespace-nowrap font-semibold">Ghi âm · {LANG_SHORT[lang]}</span>
          <span className="font-mono text-sm tabular-nums">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, "0")}</span>
          <span className="flex h-5 items-end gap-0.5">
            {[0, 1, 2, 3, 4].map((i) => <span key={i} className="mic-bar w-1 rounded-full bg-primary-foreground" style={{ animationDelay: `${i * 0.12}s` }} />)}
          </span>
          <span className="whitespace-nowrap text-xs opacity-90">Thả để dịch</span>
        </div>
        {live && <p className={cn("line-clamp-3 max-w-full rounded-2xl bg-card/95 px-4 py-2 text-center text-base shadow-[var(--shadow-float)]", lang === "zh" && "font-zh")}>{live}</p>}
      </div>
    )}
    <button
      type="button"
      aria-label={label ?? (on ? "Thả để dừng" : "Giữ để nói")}
      onPointerDown={down}
      onPointerUp={up}
      onPointerCancel={up}
      onContextMenu={(e) => e.preventDefault()}
      style={{ touchAction: "none", WebkitUserSelect: "none", userSelect: "none", WebkitTouchCallout: "none" }}
      className={cn("tap relative inline-flex shrink-0 items-center justify-center rounded-full shadow-[var(--shadow-float)] transition-all duration-150", c.fill, on && cn("scale-125 ring-4", c.ring), dim, className)}
    >
      {on && <>
        <span className={cn("absolute -inset-3 animate-ping rounded-full", c.ping)} />
        <span className={cn("absolute -inset-6 animate-ping rounded-full [animation-delay:0.4s]", c.pingSoft)} />
      </>}
      <Mic className={cn("relative", size === "lg" ? "h-7 w-7" : "h-6 w-6")} />
      {err && (
        <span role="alert" className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-2 w-max max-w-[220px] -translate-x-1/2 rounded-lg bg-card px-2.5 py-1.5 text-center text-xs font-medium leading-snug text-destructive shadow-[var(--shadow-float)]">
          {err}
        </span>
      )}
    </button>
    </>
  );
}

function micErrorText(code: string): string {
  switch (code) {
    case "unsupported": return "Máy này chưa có nhận giọng nói. Hãy gõ chữ thay thế.";
    case "not-allowed":
    case "service-not-allowed": return "Chưa cấp quyền micro. Mở cài đặt điện thoại để cho phép.";
    case "audio-capture": return "Không tìm thấy micro trên máy.";
    case "network": return "Cần mạng hoặc gói giọng nói ngoại tuyến.";
    case "language-not-supported": return "Chưa có gói giọng nói cho ngôn ngữ này. Tải trong cài đặt Android.";
    default: return code.length > 30 ? code : "Micro không hoạt động. Thử lại.";
  }
}

export function LangPicker({ from, to, onChange }: { from: Lang; to: Lang; onChange: (from: Lang, to: Lang) => void }) {
  const Sel = ({ value, set, label }: { value: Lang; set: (l: Lang) => void; label: string }) => (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => set(e.target.value as Lang)}
      className={cn("tap min-w-0 flex-1 appearance-none rounded-xl bg-transparent px-2 py-1 text-center text-base font-semibold outline-none", value === "zh" && "font-zh")}
    >
      {LANGS.map((l) => <option key={l} value={l}>{LANG_LABEL[l]}</option>)}
    </select>
  );
  return (
    <div className="surface flex w-full items-center gap-2 px-3 py-2.5">
      <Sel label="Ngôn ngữ nguồn" value={from} set={(l) => onChange(l, l === to ? from : to)} />
      <button aria-label="Đổi chiều" onClick={() => onChange(to, from)} className="tap rounded-full bg-accent px-3 py-1 text-sm text-primary">⇄</button>
      <Sel label="Ngôn ngữ đích" value={to} set={(l) => onChange(l === from ? to : from, l)} />
    </div>
  );
}

export function NavCard({ to, title, icon, className, iconClassName }: { to: "/dictionary" | "/business" | "/camera" | "/emergency"; title: string; icon: ReactNode; className?: string; iconClassName?: string }) {
  return (
    <Link to={to} className={cn("tap surface lift group flex flex-col items-center gap-2 p-3 text-center hover:border-primary/30", className)}>
      <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-primary transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6", iconClassName)}>{icon}</span>
      <span className="text-[13px] font-semibold leading-tight">{title}</span>
    </Link>
  );
}

export const speechSupported = canSpeak;

export function formatTime(t: number) {
  return new Date(t).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
}

export function DirTag({ from, to }: { from: Lang; to?: Lang | undefined }) {
  return (
    <span className="rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
      {LANG_SHORT[from]} → {LANG_SHORT[to ?? otherLang(from)]}
    </span>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="surface h-12 w-full px-4 text-base outline-none focus:border-primary"
    />
  );
}

export function Empty({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="surface flex flex-col items-center px-6 py-12 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
