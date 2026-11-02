import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, Volume2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { targetOf } from "@/lib/engine";
import { Empty, PageHeader, formatTime, useSpeak } from "@/components/sk/ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/history_/$conversationId")({
  head: () => ({ meta: [
    { title: "Chi tiết hội thoại — SK Translate" },
    { name: "description", content: "Xem lại từng câu trong cuộc hội thoại hai chiều đã lưu trên thiết bị." },
    { property: "og:title", content: "Chi tiết hội thoại — SK Translate" },
    { property: "og:description", content: "Lịch sử đầy đủ của một cuộc hội thoại hai chiều trong SK Translate." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: ConversationHistoryPage,
});

function ConversationHistoryPage() {
  const { conversationId } = Route.useParams();
  const conversation = useStore((s) => conversationId === "current"
    ? (s.chat[0] ? { at: s.chat[0].at, messages: s.chat } : undefined)
    : s.conversations.find((c) => c.id === conversationId));
  const sp = useSpeak();
  const firstLanguage = conversation?.messages[0]?.from;

  return (
    <div className="space-y-3">
      <Link to="/history" search={{ tab: "conv" }} className="tap -ml-2 inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-sm text-muted-foreground"><ChevronLeft className="h-4 w-4" />Danh sách hội thoại</Link>
      <PageHeader title="Chi tiết hội thoại" subtitle={conversation ? `${formatTime(conversation.at)} · ${conversation.messages.length} câu` : "Hội thoại đã lưu"} />
      {!conversation ? <Empty title="Không tìm thấy hội thoại" desc="Cuộc hội thoại này có thể đã bị xoá trên thiết bị." /> : (
        <div className="space-y-2">
          {conversation.messages.map((m) => {
            const to = targetOf(m);
            const mine = m.from === firstLanguage;
            const viZh = m.from === "vi" && to === "zh" || m.from === "zh" && to === "vi";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[92%] rounded-[16px] px-[14px] py-[10px]", mine ? "bg-foreground text-background" : "bubble")}>
                  <p className={cn("break-words text-[14px] opacity-70", m.from === "zh" && "font-zh")}>{m.source}</p>
                  {m.ok ? <>
                    <p className={cn("mt-[2px] break-words text-[18px] font-semibold leading-snug", to === "zh" && "font-zh")}>
                      {m.target}{" "}<Button variant="ghost" size="icon" aria-label="Đọc bản dịch" title="Đọc bản dịch" onClick={() => sp(m.target, to)} className="inline-flex h-[32px] w-[32px] rounded-full align-middle text-inherit hover:bg-transparent hover:text-inherit hover:opacity-70"><Volume2 /></Button>
                    </p>
                    {m.pinyin && !viZh && <p className="text-[14px] opacity-80">{m.pinyin}</p>}
                  </> : <p className="mt-1 text-[14px] italic opacity-80">Chưa dịch được câu này (offline)</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}