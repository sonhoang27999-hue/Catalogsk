import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageSquare, Trash2 } from "lucide-react";
import { store, useStore, type ConversationLog } from "@/lib/store";
import { ActionRow, DirTag, Empty, PageHeader, SearchInput, formatTime } from "@/components/sk/ui";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/history")({
  validateSearch: (search: Record<string, unknown>): { tab?: "tr" | "conv" | undefined } => ({
    tab: search["tab"] === "conv" ? "conv" : search["tab"] === "tr" ? "tr" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Lịch sử — SK Translate" },
      { name: "description", content: "Lịch sử bản dịch và hội thoại 2 chiều, lưu trên thiết bị của bạn." },
      { property: "og:title", content: "Lịch sử — SK Translate" },
      { property: "og:description", content: "Lịch sử bản dịch và hội thoại 2 chiều, lưu trên thiết bị." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const history = useStore((s) => s.history);
  const chat = useStore((s) => s.chat);
  const conversations = useStore((s) => s.conversations);
  const { tab = "tr" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const ql = q.toLowerCase();
  const list = history.filter((h) => !q || `${h.source} ${h.target} ${h.pinyin ?? ""}`.toLowerCase().includes(ql));
  const convs: (ConversationLog & { current?: boolean })[] = [
    ...(chat[0] ? [{ id: "current", at: chat[0].at, messages: chat, current: true }] : []),
    ...conversations,
  ].filter((c) => !q || c.messages.some((m) => `${m.source} ${m.target}`.toLowerCase().includes(ql)));
  const total = history.length + conversations.length + (chat.length ? 1 : 0);

  return (
    <div className="space-y-3">
      <Link to="/settings" className="tap -ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Cài đặt</Link>
      <PageHeader title="Lịch sử" subtitle="历史 · lưu trên thiết bị" />
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
        {([["tr", `Bản dịch (${history.length})`], ["conv", `Hội thoại (${conversations.length + (chat.length ? 1 : 0)})`]] as const).map(([k, l]) => (
          <Button key={k} variant="ghost" onClick={() => navigate({ search: { tab: k }, replace: true })} className={cn("tap h-11 rounded-lg text-sm font-semibold", tab === k ? "bg-card shadow-sm" : "text-muted-foreground")}>{l}</Button>
        ))}
      </div>
      <SearchInput value={q} onChange={setQ} placeholder="Tìm trong lịch sử… / 搜索" />

      {tab === "tr" && (<>
        {list.length === 0 && <Empty title="Chưa có lịch sử" desc="Các bản dịch thành công sẽ được lưu tại đây, chỉ trên thiết bị này." />}
        {list.map((h) => (
          <article key={h.id} className="surface p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2"><DirTag from={h.from} to={h.to} /><span className="text-xs text-muted-foreground">{formatTime(h.at)}</span></div>
              <button aria-label="Xoá" onClick={() => store.deleteHistory(h.id)} className="tap rounded-full p-2 text-muted-foreground hover:bg-muted"><Trash2 className="h-4 w-4" /></button>
            </div>
            <p className={cn("text-sm text-muted-foreground", h.from === "zh" && "font-zh")}>{h.source}</p>
            <p className={cn("text-xl font-semibold", h.to === "zh" && "font-zh")}>{h.target}</p>
            {h.pinyin && <p className="text-sm text-primary">{h.pinyin}</p>}
            <div className="mt-3"><ActionRow source={h.source} target={h.target} pinyin={h.pinyin} from={h.from} to={h.to} /></div>
          </article>
        ))}
        {history.length > 0 && (
          <button onClick={() => confirm("Xoá toàn bộ lịch sử bản dịch?") && store.clearHistory()} className="tap w-full py-3 text-sm font-semibold text-destructive">Xoá lịch sử bản dịch</button>
        )}
      </>)}

      {tab === "conv" && (<>
        {convs.length === 0 && <Empty title="Chưa có hội thoại" desc="Các cuộc hội thoại 2 chiều sẽ được lưu tại đây." />}
        {convs.map((c) => <ConvCard key={c.id} c={c} />)}
      </>)}

      {total > 0 && (
        <button onClick={() => confirm("Xoá TOÀN BỘ lịch sử (bản dịch và hội thoại)? Không thể hoàn tác.") && store.clearAllHistory()} className="tap surface w-full py-4 font-semibold text-destructive">
          Xoá toàn bộ lịch sử
        </button>
      )}
    </div>
  );
}

function ConvCard({ c }: { c: ConversationLog & { current?: boolean } }) {
  return (
    <article className="surface flex items-center gap-1 p-2">
      <Link to="/history/$conversationId" params={{ conversationId: c.id }} aria-label={`Xem cuộc hội thoại: ${c.messages[0]?.source ?? "Hội thoại"}`} className="tap flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-lg p-2">
        <MessageSquare className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{c.current ? "Đang diễn ra" : "Hội thoại"} · {c.messages.length} câu</p>
          <p className={cn("mt-1 truncate text-sm text-muted-foreground", c.messages[0]?.from === "zh" && "font-zh")}>{c.messages[0]?.source}</p>
          <p className="mt-1 text-xs text-muted-foreground">{formatTime(c.at)}</p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </Link>
      <Button variant="ghost" size="icon" aria-label="Xoá hội thoại" onClick={() => confirm("Xoá cuộc hội thoại này?") && (c.current ? store.discardCurrentChat() : store.deleteConversation(c.id))} className="h-11 w-11 shrink-0 text-muted-foreground"><Trash2 /></Button>
    </article>
  );
}
