import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUpRight, Volume2 } from "lucide-react";
import { BUSINESS_CATEGORIES, PHRASES, type BusinessCategory } from "@/data/phrases";
import { store, useStore } from "@/lib/store";
import { IconBtn, PageHeader, useSpeak } from "@/components/sk/ui";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/business")({
  head: () => ({
    meta: [
      { title: "Chế độ công tác Trung Quốc — SK Translate" },
      { name: "description", content: "Câu mẫu cho sân bay, taxi, khách sạn, nhà máy, đàm phán giá, đặt hàng, logistics và kiểm hàng." },
      { property: "og:title", content: "Chế độ công tác Trung Quốc — SK Translate" },
      { property: "og:description", content: "Câu mẫu tiếng Trung cho chuyến công tác." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessPage,
});

function BusinessPage() {
  const [cat, setCat] = useState<BusinessCategory>("price");
  const navigate = useNavigate();
  const sp = useSpeak();
  const w = useStore((s) => s.settings.workLang);
  const zh = w === "zh";
  return (
    <div className="space-y-4">
      <PageHeader back title="Công tác Trung Quốc" subtitle={zh ? "中国商务 · chạm để dịch hoặc đọc" : "Business · chạm để dịch hoặc đọc"} />
      <div className="grid grid-cols-3 gap-2">
        {BUSINESS_CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={cn("tap surface px-2 py-3 text-center", cat === c.id && "border-foreground bg-foreground text-background")}
          >
            <span className="block text-sm font-semibold leading-tight">{c.vi}</span>
            <span className={cn("text-xs opacity-60", zh && "font-zh")}>{zh ? c.zh : c.en}</span>
          </button>
        ))}
      </div>
      <div className="space-y-2">
        {PHRASES.filter((p) => p.cat === cat).map((p) => (
          <div key={p.zh} className="surface flex items-center gap-3 p-4">
            <button
              className="tap flex-1 text-left"
              onClick={() => {
                store.setDraft({ text: p.vi, from: "vi", to: w });
                navigate({ to: "/" });
              }}
            >
              <p className="text-sm text-muted-foreground">{p.vi}</p>
              <p className={cn("text-xl font-semibold", zh && "font-zh")}>{zh ? p.zh : p.en}</p>
              {zh && <p className="text-sm text-primary">{p.pinyin}</p>}
            </button>
            <div className="flex flex-col gap-2">
              <IconBtn label={zh ? "Đọc tiếng Trung" : "Đọc tiếng Anh"} onClick={() => sp(zh ? p.zh : p.en, w)}><Volume2 className="h-5 w-5" /></IconBtn>
              <IconBtn label="Mở trong trình dịch" onClick={() => { store.setDraft({ text: p.vi, from: "vi", to: w }); navigate({ to: "/" }); }}>
                <ArrowUpRight className="h-5 w-5" />
              </IconBtn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
