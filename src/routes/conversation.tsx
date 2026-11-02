import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Loader2, MessageSquarePlus, Send, Volume2, Mic, Square, X } from "lucide-react";
import { useContinuousConversation } from "@/hooks/use-continuous-conversation";
import { translate, targetOf, LANGS, LANG_LABEL, LANG_SHORT, type Lang } from "@/lib/engine";
import { MissingTerms } from "@/components/MissingTerms";
import { recentContext } from "@/lib/engine/context";
import { store, useStore } from "@/lib/store";
import { AiToggle, AutoSpeakToggle, MicButton, PageHeader, useSpeak } from "@/components/sk/ui";
import { Button } from "@/components/ui/button";
import { prefetchVoice, speak } from "@/lib/speech";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/conversation")({
  head: () => ({
    meta: [
      { title: "Hội thoại — SK Translate" },
      { name: "description", content: "Hội thoại hai chiều Việt · 中文 · English, nhấn giữ để nói." },
      { property: "og:title", content: "Hội thoại — SK Translate" },
      { property: "og:description", content: "Hội thoại hai chiều Việt · 中文 · English, nhấn giữ để nói." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ConversationPage,
});

const HOLD: Record<Lang, string> = { vi: "Giữ để nói", zh: "按住说话", en: "Hold to talk" };
const PH: Record<Lang, string> = { vi: "Nhập câu tiếng Việt…", zh: "输入中文…", en: "Type in English…" };

function ConversationPage() {
  const chat = useStore((s) => s.chat);
  const [me, setMe] = useState<Lang>("vi");
  const [them, setThem] = useState<Lang>("zh");
  const [speaker, setSpeaker] = useState<"me" | "them">("me");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ source: string; target: string; from: Lang; to: Lang } | null>(null);
  const translationSession = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => translationSession.current?.abort(), []);
  const [recording, setRecording] = useState({ me: false, them: false });
  const continuous = useContinuousConversation(me, them);
  const [consentOpen, setConsentOpen] = useState(false);
  const languageLocked = busy || recording.me || recording.them || continuous.active;
  const sp = useSpeak();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, busy, preview?.target, continuous.preview?.target]);

  const langOf = (s: "me" | "them") => (s === "me" ? me : them);

  const pending = useRef(0);
  async function send(input?: string, side: "me" | "them" = speaker) {
    if (continuous.active || pending.current > 0) return;
    const t = (input ?? text).trim();
    if (!t) return;
    const from = langOf(side);
    const to = side === "me" ? them : me;
    setText("");
    pending.current++; setBusy(true);
    const controller = new AbortController(); translationSession.current = controller;
    setPreview({ source: t, target: "", from, to });
    const { dictionary, settings } = store.get();
    let r;
    try {
      r = await translate(t, from, to, dictionary, settings.onlineTranslate ? "auto" : "offline", {
        brief: true, signal: controller.signal, context: recentContext(store.get().chat),
        onProgress: (target) => { if (!controller.signal.aborted) setPreview({ source: t, target, from, to }); },
      });
    } catch (cause) {
      if (controller.signal.aborted) return;
      throw cause;
    } finally {
      pending.current--; if (!controller.signal.aborted) { setBusy(false); setPreview(null); }
    }
    if (controller.signal.aborted) return;
    store.addChat({ from, to, source: t, target: r.text, pinyin: r.pinyin, ok: r.status === "ok", engine: r.engineId, missingTerms: r.missingTerms });
    if (r.status === "ok") {
      store.addHistory({ from, to, source: t, target: r.text, pinyin: r.pinyin });
      if (settings.autoSpeak) speak(r.text, to, settings.speechRate, { queue: true });
      else prefetchVoice(r.text);
    }
  }

  const setSide = (side: "me" | "them", l: Lang) => {
    if (languageLocked || l === langOf(side)) return;
    const pair = store.changeConversationLanguage({ me, them }, side, l);
    setMe(pair.me);
    setThem(pair.them);
    setText("");
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Hội thoại"
        subtitle="对话 · Conversation"
        right={(
          <div className="flex items-center gap-1.5 pt-1">
            <AiToggle />
            <AutoSpeakToggle />
          </div>
        )}
      />

      <div className="sticky top-0 z-20 mb-3 border-b bg-background pb-3 md:top-16">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={languageLocked || chat.length === 0 || continuous.active}
            onClick={() => { store.clearChat(); setText(""); }}
            className="min-h-11 min-w-0 flex-1 gap-1 px-2 text-[13px]"
            title={busy ? "Chờ dịch xong để lưu đủ câu" : "Lưu cuộc hiện tại và bắt đầu cuộc mới"}
          >
            <MessageSquarePlus />Cuộc hội thoại mới
          </Button>
          <Button
            variant={continuous.active ? "destructive" : "secondary"}
            className="min-h-11 min-w-0 flex-1 gap-1 px-2 text-[13px]"
            disabled={!continuous.active && (busy || recording.me || recording.them)}
            onClick={() => continuous.active ? continuous.stop() : setConsentOpen(true)}
          >
            {continuous.active ? <Square /> : <Mic />}
            {continuous.active ? "Dừng liên tục" : "Dịch liên tục"}
          </Button>
        </div>

        {consentOpen && !continuous.active && (
          <div className="mt-2 space-y-2">
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm text-muted-foreground">Giọng nói sẽ gửi trực tiếp đến OpenAI bằng khóa trong Cài đặt, có phí và dùng data. Không lưu bản ghi âm. Hai ngôn ngữ: {LANG_LABEL[me]} ↔ {LANG_LABEL[them]}.</p>
              <Button variant="ghost" size="icon" aria-label="Hủy Dịch liên tục" onClick={() => setConsentOpen(false)}><X /></Button>
            </div>
            <Button className="min-h-11 w-full" onClick={() => { setConsentOpen(false); void continuous.start(); }}><Mic />Đồng ý và Bắt đầu</Button>
          </div>
        )}
        {continuous.status && <p role="status" className="mt-2 break-words text-sm text-muted-foreground">{continuous.status}</p>}
        {continuous.error && <p role="alert" className="mt-2 break-words text-sm text-destructive">{continuous.error}</p>}
      </div>

      <div className="space-y-2 pb-[13.5rem] md:pb-[11rem]">
        {chat.length === 0 && !continuous.active && (
          <div className="surface p-6 text-center text-sm text-muted-foreground">
            Mỗi người giữ nút micro của mình để nói, thả tay để dịch. Hoặc gõ phím rồi nhấn gửi.
            <p className="mt-2 font-zh">按住麦克风说话，松开即翻译。</p>
            <p className="mt-1">Hold your mic to talk, release to translate.</p>
          </div>
        )}
        {chat.map((m) => {
          const to = targetOf(m);
          const mine = m.from === me || (m.from !== them && m.from === "vi");
          return (
            <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn("max-w-[92%] px-[14px] py-[10px]", mine ? "bg-foreground text-background" : "bubble")}
                style={{ borderRadius: "16px", borderBottomRightRadius: mine ? "14px" : "16px", borderBottomLeftRadius: mine ? "16px" : "14px" }}
              >
                <p className={cn("text-[14px] opacity-70", m.from === "zh" && "font-zh")}>{m.source}</p>
                {m.ok ? (
                  <>
                    <p className={cn("mt-[2px] break-words text-[18px] font-semibold leading-snug", to === "zh" && "font-zh")}>
                      {m.target}{" "}
                      <Button variant="ghost" size="icon" disabled={continuous.active} aria-label="Đọc" title="Đọc bản dịch" onClick={() => sp(m.target, to)} className="tap inline-flex h-[32px] w-[32px] rounded-full align-middle text-inherit hover:bg-transparent hover:text-inherit hover:opacity-70"><Volume2 /></Button>
                    </p>
                    {m.pinyin && !(m.from === "vi" && to === "zh" || m.from === "zh" && to === "vi") && <p className={cn("text-[14px]", mine ? "opacity-80" : "text-primary")}>{m.pinyin}</p>}
                    <MissingTerms terms={m.missingTerms} />
                  </>
                ) : (
                  <p className="mt-[4px] text-[14px] italic opacity-80">Chưa dịch được câu này (offline)</p>
                )}
              </div>
            </div>
          );
        })}
        {(preview || continuous.preview) && (() => {
          const turn = preview ?? continuous.preview;
          if (!turn) return null;
          return <div className={cn("flex", turn.from === me ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[92%] rounded-2xl px-[14px] py-[10px]", turn.from === me ? "bg-foreground text-background" : "bubble")}>
              <p className={cn("break-words text-[14px] opacity-70", turn.from === "zh" && "font-zh")}>{turn.source}</p>
              <p data-streaming-translation className={cn("mt-[2px] break-words text-[18px] font-semibold leading-snug", turn.to === "zh" && "font-zh")}>{turn.target}<Loader2 className="ml-1 inline h-3.5 w-3.5 animate-spin align-middle" /></p>
            </div>
          </div>;
        })()}
        {busy && !preview && <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>}
        <div ref={end} />
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.75rem+1px+env(safe-area-inset-bottom))] z-30 mx-auto max-w-xl space-y-2 rounded-t-3xl md:max-w-[44rem] border-t bg-card/95 p-2.5 shadow-[0_-8px_24px_-12px_rgb(0_0_0/0.15)] backdrop-blur md:bottom-0 md:max-w-3xl md:p-4">
        <div className="grid grid-cols-2 gap-3">
          {(["me", "them"] as const).map((side) => {
            const l = langOf(side);
            return (
              <div key={side} className="flex flex-col items-center gap-1 rounded-2xl bg-secondary py-2">
                <select
                  aria-label={side === "me" ? "Ngôn ngữ của tôi" : "Ngôn ngữ đối phương"}
                  value={l}
                  disabled={languageLocked}
                  title={languageLocked ? "Chờ thu âm và dịch xong để lưu đủ câu" : "Đổi ngôn ngữ để bắt đầu cuộc hội thoại mới"}
                  onChange={(e) => setSide(side, e.target.value as Lang)}
                  className={cn("h-8 rounded-lg bg-card px-2 text-sm font-semibold outline-none", l === "zh" && "font-zh")}
                >
                  {LANGS.map((x) => <option key={x} value={x}>{LANG_LABEL[x]}</option>)}
                </select>
                <div inert={continuous.active} className={cn("flex", continuous.active && "pointer-events-none opacity-40")}>
                <MicButton
                  lang={l}
                  onText={(t) => { setSpeaker(side); setText(t); }}
                  onRelease={(t) => send(t, side)}
                  onSessionChange={(active) => setRecording((current) => ({ ...current, [side]: active }))}
                  label={`${HOLD[l]} · ${LANG_LABEL[l]}`}
                  size="lg"
                  tone={side === "me" ? "primary" : "partner"}
                  className="h-16 w-16"
                />
                </div>
                <span className={cn("text-[11px] font-semibold", side === "me" ? "text-primary" : "text-partner", l === "zh" && "font-zh")}>{HOLD[l]}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            disabled={continuous.active || busy}
            onClick={() => setSpeaker(speaker === "me" ? "them" : "me")}
            aria-label="Đổi người gõ"
            className={cn("tap h-12 max-w-[5.5rem] shrink-0 truncate rounded-xl bg-secondary px-2.5 text-xs font-semibold", langOf(speaker) === "zh" && "font-zh")}
          >
            {LANG_SHORT[langOf(speaker)]} ⇅
          </Button>
          <input
            value={text}
            disabled={continuous.active || busy}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder={PH[langOf(speaker)]}
            className={cn("h-12 min-w-0 flex-1 rounded-xl bg-secondary px-4 text-base outline-none", langOf(speaker) === "zh" && "font-zh")}
          />
          <Button aria-label="Gửi" onClick={() => send()} disabled={continuous.active || busy || !text.trim()} className="tap inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-40">
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
