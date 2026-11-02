import { useEffect, useState } from "react";
import { Download, Languages, Loader2 } from "lucide-react";
import { downloadMt, isMtPairReady, MT_PAIRS } from "@/lib/mt/offlineMt";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/lib/engine";

type St = "absent" | "downloading" | "ready" | "error";

function PairRow({ from, to, label }: { from: Lang; to: Lang; label: string }) {
  const [st, setSt] = useState<St>("absent");
  useEffect(() => { setSt(isMtPairReady(from, to) ? "ready" : "absent"); }, [from, to]);
  const start = async () => {
    setSt("downloading");
    try {
      await downloadMt(from, to);
      setSt("ready");
    } catch {
      setSt("error");
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary px-4 py-3">
      <p className="text-sm font-semibold">{label}</p>
      {st === "ready" && <p className="text-sm font-medium text-primary">Đã sẵn sàng</p>}
      {st === "downloading" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Đang tải…</p>
      )}
      {st === "error" && (
        <Button variant="ghost" onClick={() => void start()} className="tap h-11 text-sm font-semibold text-destructive">Thử lại</Button>
      )}
      {st === "absent" && (
        <Button variant="outline" onClick={() => void start()} className="tap h-11 px-3 text-sm font-semibold">
          <Download className="h-4 w-4" />Tải
        </Button>
      )}
    </div>
  );
}

/** One-time downloadable on-device translation packs (work without internet afterwards). */
export function MtPackCard() {
  return (
    <div className="surface space-y-2 p-4">
      <div className="flex items-center gap-2">
        <Languages className="h-5 w-5 text-primary" />
        <p className="font-semibold">Bộ dịch ngoại tuyến</p>
      </div>
      <p className="text-sm text-muted-foreground">
        Mô hình dịch chạy ngay trên máy (Android và iPhone), dịch cả câu khi không có mạng. Mỗi cặp tải một lần (~80–160 MB, nên dùng Wi-Fi).
      </p>
      <div className="space-y-2">
        {MT_PAIRS.map((p) => <PairRow key={p.label} from={p.from} to={p.to} label={p.label} />)}
      </div>
    </div>
  );
}
