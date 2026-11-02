import { MissingTerms } from "@/components/MissingTerms";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BookOpen, Briefcase, Camera, Loader2, Repeat, Siren, Plus, X } from "lucide-react";
import { translate, otherLang, type Lang, type TranslationResult, LANG_LABEL } from "@/lib/engine";
import { store, useStore, type QuickPhrase } from "@/lib/store";
import { QUICK_CHIPS, PHRASES } from "@/data/phrases";
import { ActionRow, AiToggle, AutoSpeakToggle, LangPicker, MicButton, NavCard, OfflineBadge, PageHeader } from "@/components/sk/ui";
import { prefetchVoice, speak } from "@/lib/speech";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dịch — SK Translate" },
      { name: "description", content: "Dịch Tiếng Việt, 中文 và English với Pinyin, AI trực tuyến và chế độ offline." },
      { property: "og:title", content: "Dịch — SK Translate" },
      { property: "og:description", content: "Dịch Việt · Trung · Anh với Pinyin." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TranslatePage,
});

function TranslatePage() {
  const draft = useStore((s) => s.draft);
  const [from, setFrom] = useState<Lang>("vi");
  const [to, setTo] = useState<Lang>("zh");
  // Reference pages (Từ điển, Công tác, Khẩn cấp) follow the foreign language picked here.
  useEffect(() => {
    const w = to !== "vi" ? to : from !== "vi" ? from : null;
    if (w && store.get().settings.workLang !== w) store.updateSettings({ workLang: w });
  }, [from, to]);
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ r: TranslationResult; source: string; from: Lang; to: Lang } | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ text: string; to: Lang; ready?: boolean } | null>(null);
  const translationSession = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => translationSession.current?.abort(), []);
  const [addOpen, setAddOpen] = useState(false);
  const quick = useStore((s) => s.quickPhrases);

  async function run(t = text, f = from, tt = to, force = false) {
    if (!t.trim()) return;
    translationSession.current?.abort();
    const controller = new AbortController(); translationSession.current = controller;
    setPreview(null); setResult(null);
    setBusy(true);
    const { dictionary, settings } = store.get();
    let r;
    try {
      r = await translate(t, f, tt, dictionary, settings.onlineTranslate ? "auto" : "offline", {
        force, signal: controller.signal,
        onProgress: (value, ready) => { if (!controller.signal.aborted) setPreview(value ? { text: value, to: tt, ready: !!ready } : null); },
      });
    } catch (cause) { if (controller.signal.aborted) return; throw cause; }
    finally { if (!controller.signal.aborted) { setBusy(false); setPreview(null); } }
    if (controller.signal.aborted) return;
    setResult({ r, source: t.trim(), from: f, to: tt });
    if (r.status === "ok") {
      store.addHistory({ from: f, to: tt, source: t.trim(), target: r.text, pinyin: r.pinyin });
      if (settings.autoSpeak) speak(r.text, tt, settings.speechRate, { queue: true });
      else prefetchVoice(r.text);
    }
  }

  useEffect(() => {
    if (!draft) return;
    const dt = draft.to ?? (draft.from === "vi" ? "zh" : "vi");
    setFrom(draft.from);
    setTo(dt);
    setText(draft.text);
    store.setDraft(null);
    run(draft.text, draft.from, dt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  const chips = QUICK_CHIPS.map((vi) => PHRASES.find((p) => p.vi === vi)!).filter((p) => p && !quick.some((q) => q.vi.trim().toLowerCase() === p.vi.toLowerCase() || q.zh.trim() === p.zh));

  function runCustomChip(p: QuickPhrase) {
    const cands: Array<[Lang, string]> = [["vi", p.vi], ["zh", p.zh], ["en", p.en ?? ""]];
    const usable = cands.filter(([, v]) => v.trim() !== "");
    if (!usable.length) return;
    const pick = usable.find(([l]) => l === from) ?? usable[0]!;
    const toL = pick[0] === to ? otherLang(pick[0]) : to;
    setText(pick[1]);
    run(pick[1], pick[0], toL);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="SK Translate" subtitle="Việt · 中文 · English" right={<div className="flex items-center gap-2 pt-1"><AiToggle /><AutoSpeakToggle compact /><OfflineBadge /></div>} />

      <LangPicker
        from={from}
        to={to}
        onChange={(f, t) => {
          translationSession.current?.abort(); setBusy(false); setPreview(null);
          const swapped = f === to && t === from;
          setFrom(f);
          setTo(t);
          if (swapped && result?.r.status === "ok") setText(result.r.text);
          setResult(null);
        }}
      />

      <div className="surface rise p-4 transition-shadow focus-within:border-primary/40 focus-within:shadow-[var(--shadow-float)]" style={{ animationDelay: "60ms" }}>
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                run();
              }
            }}
            rows={3}
            placeholder={from === "vi" ? "Nhập tiếng Việt… ví dụ: Giá sỉ là bao nhiêu?" : from === "zh" ? "输入中文… 例如：批发价是多少？" : "Type English… e.g. What is the wholesale price?"}
            className={cn("w-full resize-none bg-transparent pr-8 text-xl leading-relaxed outline-none placeholder:text-muted-foreground/70 min-h-[5.5rem]", from === "zh" && "font-zh")}
          />
          {text && (
            <button aria-label="Xoá" onClick={() => { setText(""); setResult(null); }} className="tap absolute right-0 top-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <div className="mt-3 flex items-center gap-3">
          <MicButton lang={from} onText={setText} onRelease={(t) => { setText(t); void run(t); }} />
          <button
            onClick={() => run()}
            disabled={!text.trim() || busy}
            className="tap h-14 flex-1 rounded-2xl bg-primary text-lg font-semibold text-primary-foreground glow transition-all hover:brightness-110 disabled:opacity-40 disabled:shadow-none"
          >
            {busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Dịch"}
          </button>
        </div>
      </div>

      {preview && <div className="surface border-l-4 border-l-primary p-5">
        <p className="text-xs font-semibold uppercase text-muted-foreground">{LANG_LABEL[preview.to]}</p>
        <p data-streaming-translation className={cn("mt-1 break-words text-3xl font-semibold leading-snug", preview.to === "zh" && "font-zh")}>{preview.text}{!preview.ready && <Loader2 className="ml-1 inline h-4 w-4 animate-spin align-middle text-muted-foreground" />}</p>
        {preview.ready && <p data-translation-ready className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />{preview.to === "zh" ? "Đang thêm Pinyin và giải nghĩa…" : "Đang thêm giải nghĩa…"}</p>}
      </div>}
      {result && <ResultCard {...result} onRetranslate={() => run(result.source, result.from, result.to, true)} retranslating={busy} />}

      <section className="rise" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-2 text-sm font-semibold text-muted-foreground">Câu nhanh</h2>
        <div className="flex flex-wrap gap-2">
          {chips.map((p) => (
            <button
              key={p.vi}
              onClick={() => {
                const src = from === "en" ? "vi" : from;
                const t = p[src];
                if (src !== from) setFrom(src);
                setText(t);
                run(t, src, to === src ? (src === "vi" ? "zh" : "vi") : to);
              }}
              className={cn("tap rounded-full border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-primary/50 hover:bg-accent hover:text-accent-foreground", from === "zh" && "font-zh")}
            >
              {from === "zh" ? p.zh : p.vi}
            </button>
          ))}
          {quick.map((p) => {
            const label = from === "zh" ? (p.zh || p.vi) : from === "en" ? (p.en || p.vi) : (p.vi || p.zh);
            return (
              <span key={p.id} className="tap inline-flex items-center gap-0.5 rounded-full border border-primary/40 bg-card pl-4 pr-1">
                <button
                  onClick={() => runCustomChip(p)}
                  className={cn("py-2.5 text-sm font-medium", from === "zh" && "font-zh")}
                >
                  {label}
                </button>
                <button aria-label="Xoá câu nhanh" onClick={() => store.deleteQuickPhrase(p.id)} className="tap rounded-full p-1.5 text-muted-foreground hover:bg-muted">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            );
          })}
          <button
            onClick={() => setAddOpen(true)}
            className="tap inline-flex items-center gap-1 rounded-full border border-dashed px-4 py-2.5 text-sm font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
          >
            <Plus className="h-4 w-4" /> Thêm
          </button>
        </div>
      </section>

      <section className="rise grid grid-cols-2 gap-2 min-[360px]:grid-cols-4" style={{ animationDelay: "180ms" }}>
        <NavCard to="/business" title="Công tác" icon={<Briefcase className="h-5 w-5" />} />
        <NavCard to="/dictionary" title="Từ điển" icon={<BookOpen className="h-5 w-5" />} />
        <NavCard to="/camera" title="Camera" icon={<Camera className="h-5 w-5" />} />
        <NavCard
          to="/emergency"
          title="Khẩn cấp"
          icon={<Siren className="h-5 w-5" />}
          className="border-destructive/30 bg-destructive/5"
          iconClassName="bg-destructive/10 text-destructive"
        />
      </section>

      {addOpen && <QuickPhraseDialog onClose={() => setAddOpen(false)} />}
    </div>
  );
}

function QuickPhraseDialog({ onClose }: { onClose: () => void }) {
  const [vi, setVi] = useState("");
  const [zh, setZh] = useState("");
  const [en, setEn] = useState("");
  const canSave = vi.trim() || zh.trim() || en.trim();
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 px-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]" onClick={onClose}>
      <div className="surface flex flex-1 flex-col overflow-hidden rounded-2xl p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold">Thêm câu nhanh</p>
          <button aria-label="Đóng" onClick={onClose} className="tap rounded-full p-2 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Câu này sẽ nằm trong hàng Câu nhanh ở màn Dịch. Điền ngôn ngữ bạn muốn (đủ càng tốt).</p>
        <div className="mt-3 flex-1 space-y-3 overflow-y-auto">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tiếng Việt</span>
            <textarea value={vi} onChange={(e) => setVi(e.target.value)} rows={2} placeholder="Ví dụ: Giao hàng trong 2 tuần" className="mt-1 w-full resize-none rounded-xl bg-secondary px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground/60" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">中文</span>
            <textarea value={zh} onChange={(e) => setZh(e.target.value)} rows={2} placeholder="例如：两周内交货" className={cn("mt-1 w-full resize-none rounded-xl bg-secondary px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground/60 font-zh")} />
          </label>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">English</span>
            <textarea value={en} onChange={(e) => setEn(e.target.value)} rows={2} placeholder="e.g. Delivery within 2 weeks" className="mt-1 w-full resize-none rounded-xl bg-secondary px-3 py-2.5 text-base outline-none placeholder:text-muted-foreground/60" />
          </label>
        </div>
        <button
          disabled={!canSave}
          onClick={() => {
            store.addQuickPhrase({ vi, zh, en: en.trim() || undefined });
            onClose();
          }}
          className="tap mt-3 h-12 shrink-0 rounded-2xl bg-foreground font-semibold text-background disabled:opacity-40"
        >
          Lưu
        </button>
      </div>
    </div>
  );
}

function ResultCard({ r, source, from, to, onRetranslate, retranslating }: { r: TranslationResult; source: string; from: Lang; to: Lang; onRetranslate?: () => void; retranslating?: boolean }) {
  if (r.status !== "ok") {
    return (
      <div className="surface space-y-3 p-5">
        <p className="font-semibold">Chưa có bản dịch offline cho câu này</p>
        {r.notice && <p className="rounded-lg bg-accent px-3 py-2 text-sm text-accent-foreground">{r.notice}</p>}
        <p className="text-sm text-muted-foreground">
          Khi offline, app chỉ dịch các câu có sẵn trong thư viện và Từ điển SK. Bật mạng (hoặc bật Dịch trực tuyến trong Cài đặt) để dịch mọi câu.
        </p>
        {r.matches.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Thuật ngữ tìm thấy</p>
            {r.matches.map((m) => (
              <div key={m.source} className="flex items-baseline justify-between gap-3">
                <span className={cn(from === "zh" && "font-zh")}>{m.source}</span>
                <span className="text-right">
                  <span className={cn("font-semibold", to === "zh" && "font-zh")}>{m.target}</span>
                  {to === "zh" && m.pinyin && <span className="ml-2 text-xs text-muted-foreground">{m.pinyin}</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="surface rise border-l-4 border-l-primary p-5 shadow-[var(--shadow-float)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{LANG_LABEL[to]}</p>
      <p className={cn("mt-1 text-3xl font-semibold leading-snug", to === "zh" && "font-zh")}>{r.text}</p>
      {r.pinyin && <p className="mt-1.5 text-lg text-primary">{r.pinyin}</p>}
      <MissingTerms terms={r.missingTerms} />
      {r.meaning && (
        <div className="mt-3 rounded-xl bg-secondary px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{from === "zh" ? "意思" : from === "en" ? "Meaning" : "Ý nghĩa"}</p>
          <p className={cn("text-sm", from === "zh" && "font-zh")}>{r.meaning}</p>
        </div>
      )}
      <BackCheck key={r.text} text={r.text} from={from} to={to} />
      {(from === "zh" || to === "zh") && <SaveTerm key={`s-${r.text}`} source={source} r={r} from={from} to={to} />}
      <div className="mt-4 flex items-center justify-between gap-2">
        <ActionRow source={source} target={r.text} pinyin={r.pinyin} from={from} to={to} />
        <div className="flex items-center gap-2">
          {onRetranslate && (
            <button
              onClick={onRetranslate}
              disabled={retranslating}
              title="Dịch lại bằng AI, bỏ qua bản đã lưu"
              className="tap inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold text-muted-foreground hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              {retranslating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Repeat className="h-3.5 w-3.5" />}
              Dịch lại
            </button>
          )}
          <span className="text-[11px] text-muted-foreground">{r.engineId === "online-ai" ? "AI trực tuyến" : "Từ điển offline"}</span>
        </div>
      </div>
    </div>
  );
}

/** Back-translation: translate the result back into the input language and read it aloud, to check the meaning. */
function BackCheck({ text, from, to }: { text: string; from: Lang; to: Lang }) {
  const [back, setBack] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const check = async () => {
    setBusy(true); setErr(null);
    const { dictionary, settings } = store.get();
    const r = await translate(text, to, from, dictionary, settings.onlineTranslate ? "auto" : "offline");
    setBusy(false);
    if (r.status !== "ok") { setErr("Chưa dịch ngược được câu này"); return; }
    setBack(r.text);
  };
  return (
    <div className="mt-3">
      {back ? (
        <div className="rounded-xl border border-dashed px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Dịch ngược · {LANG_LABEL[from]}</p>
          <p className={cn("text-sm", from === "zh" && "font-zh")}>{back}</p>
        </div>
      ) : (
        <button onClick={check} disabled={busy} className="tap inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Repeat className="h-4 w-4" />}
          Dịch ngược để kiểm tra nghĩa
        </button>
      )}
      {err && <p className="mt-1 text-xs text-destructive">{err}</p>}
    </div>
  );
}

/** Save the source + translation as a term in the SK dictionary (needs Chinese on one side). */
function SaveTerm({ source, r, from, to }: { source: string; r: TranslationResult; from: Lang; to: Lang }) {
  const [saved, setSaved] = useState(false);
  const save = () => {
    const pair: Record<Lang, string> = { vi: "", zh: "", en: "" };
    pair[from] = source; pair[to] = r.text;
    const zh = pair.zh.trim();
    const exists = store.get().dictionary.find((d) => d.zh === zh);
    store.upsertTerm({ ...(exists ?? { category: "Chung", notes: "" }), ...(exists ? { id: exists.id } : {}), vi: pair.vi || exists?.vi || "", zh, en: pair.en || exists?.en, pinyin: (from === "zh" ? "" : r.pinyin) || exists?.pinyin || "" });
    setSaved(true);
  };
  return (
    <button onClick={save} disabled={saved} className="tap mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border text-sm font-semibold disabled:opacity-60">
      <BookOpen className="h-4 w-4" /> {saved ? "Đã lưu vào từ điển" : "Lưu vào từ điển"}
    </button>
  );
}
