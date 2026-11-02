import { useRef, useState } from "react";
import { Upload, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { store, useStore } from "@/lib/store";
import { parseSourceHistory } from "@/lib/engine/sourceHistory";

export function SourceHistoryCard() {
  const count = useStore((s) => s.sourceHistory.length);
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const importFile = async (f?: File) => {
    if (!f) return;
    setBusy(true); setMessage(""); setFailed(false);
    try {
      if (f.size > 12_000_000) throw new Error("Tệp quá lớn (tối đa 12 MB). Chọn MyActivity.html trong mục Google Dịch, không chọn ZIP.");
      const entries = parseSourceHistory(await f.text());
      if (!entries.length) throw new Error("Không tìm thấy câu Việt–Trung–Anh có hướng dịch rõ ràng. Chọn MyActivity.html của Google Dịch hoặc tệp tham khảo SK.");
      const total = store.importSourceHistory(entries);
      setMessage(`Đã nhập · ${total.toLocaleString("vi-VN")} câu tham khảo trên máy. Bản dịch đã lưu không đổi; dùng Dịch lại để dịch mới.`);
    } catch (e) { setFailed(true); setMessage(e instanceof Error ? e.message : "Không đọc được tệp"); }
    finally { setBusy(false); }
  };
  return <section className="surface space-y-3 p-4" aria-label="Tham khảo cách nói">
    <div className="flex items-center justify-between gap-2">
      <h2 className="font-semibold">Tham khảo cách nói</h2>
      <span className="shrink-0 text-xs text-muted-foreground">{count.toLocaleString("vi-VN")} câu</span>
    </div>
    <p className="text-xs text-muted-foreground">Lưu trên máy. Khi dịch trực tuyến, gửi kèm tối đa 3 câu liên quan; không gửi toàn bộ lịch sử. Đây không phải bản dịch chuẩn.</p>
    <div className="flex gap-2">
      <Button variant="secondary" disabled={busy} className="h-12 flex-1" onClick={() => file.current?.click()}><Upload />{busy ? "Đang nhập…" : "Nhập lịch sử"}</Button>
      <Button variant="outline" disabled={!count || busy} className="h-12 w-12 shrink-0" title="Xoá câu tham khảo" aria-label="Xoá câu tham khảo" onClick={() => { if (confirm("Xoá tất cả câu tham khảo? Lịch sử dịch và hội thoại không bị xoá.")) { store.clearSourceHistory(); setFailed(false); setMessage("Đã xoá câu tham khảo"); } }}><Trash2 /></Button>
    </div>
    <input ref={file} type="file" hidden accept=".html,.json,text/html,application/json" onChange={(e) => { void importFile(e.target.files?.[0]); e.target.value = ""; }} />
    {message && <p role="status" className={`text-xs ${failed ? "text-destructive" : "text-success"}`}>{message}</p>}
  </section>;
}