import { useEffect } from "react";
import { Download, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconBtn, useSpeak } from "@/components/sk/ui";
import { downloadVnedict, initVnedict, lookupVnedict, useVnedictStatus } from "@/lib/dict/vnedict";

export function VnedictPanel({ query }: { query: string }) {
  const status = useVnedictStatus();
  const speak = useSpeak();
  useEffect(() => { void initVnedict(); }, []);
  const hits = lookupVnedict(query);
  return (
    <section className="space-y-2">
      <div className="surface space-y-2 p-4">
        <h2 className="font-semibold">Kho từ điển Việt–Anh offline</h2>
        <p className="text-sm text-muted-foreground">VNEDICT · 54.356 mục · 0,8 MB</p>
        {status === "ready" ? <p role="status" className="text-sm text-success">Đã sẵn sàng</p> : <Button className="tap h-11 w-full" disabled={status === "downloading" || status === "unknown"} onClick={() => void downloadVnedict()}>
          {status === "downloading" ? <Loader2 className="animate-spin" /> : <Download />}
          {status === "downloading" ? "Đang tải…" : status === "error" ? "Tải lại kho Việt–Anh" : "Tải kho Việt–Anh"}
        </Button>}
        {status === "error" && <p role="alert" className="text-xs text-destructive">Không tải hoặc lưu được kho. Kiểm tra mạng và dung lượng máy rồi thử lại.</p>}
        <p className="text-xs text-muted-foreground"><a className="underline" href="http://www.denisowski.org/Vietnamese/vnedict_readme.htm" target="_blank" rel="noreferrer">Paul Denisowski · VNEDICT</a> · CC BY 3.0 · bản 15/02/2019</p>
      </div>
      {query.trim() && status === "ready" && <>
        <h2 className="px-1 text-sm font-semibold text-muted-foreground">Kết quả Việt–Anh · VNEDICT</h2>
        {!hits.length && <p className="px-1 text-sm text-muted-foreground">Không tìm thấy trong kho Việt–Anh.</p>}
        {hits.map((hit, i) => <article key={`${hit.vi}:${i}`} className="surface flex items-center gap-2 p-3">
          <div className="min-w-0 flex-1"><p className="font-semibold">{hit.vi}</p><p className="text-sm text-muted-foreground">{hit.en}</p></div>
          <IconBtn label="Đọc tiếng Anh" onClick={() => speak(hit.en, "en")}><Volume2 className="h-4 w-4" /></IconBtn>
        </article>)}
      </>}
    </section>
  );
}