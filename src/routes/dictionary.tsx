import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { downloadCedict, INDUSTRY_ENTRIES, initCedict, lookupCedict, useCedictStatus } from "@/lib/dict/cedict";
import { Button } from "@/components/ui/button";
import { VnedictPanel } from "@/components/sk/VnedictPanel";
import { parseDelimited, rowsToTerms } from "@/lib/dict/importTerms";
import { Check, Download, FileUp, Loader2, Pencil, Plus, Trash2, Volume2 } from "lucide-react";
import { store, useStore } from "@/lib/store";
import { DICT_CATEGORIES, seedEn, type DictEntry } from "@/data/dictionarySeed";
import { Empty, IconBtn, PageHeader, SearchInput, useSpeak } from "@/components/sk/ui";

export const Route = createFileRoute("/dictionary")({
  head: () => ({
    meta: [
      { title: "Từ điển SK — SK Translate" },
      { name: "description", content: "Thuật ngữ riêng: đèn ambient ô tô, sản xuất, thương mại — lưu trên thiết bị." },
      { property: "og:title", content: "Từ điển SK — SK Translate" },
      { property: "og:description", content: "Thuật ngữ riêng lưu trên thiết bị." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DictionaryPage,
});

type Draft = Omit<DictEntry, "id" | "updatedAt"> & { id?: string };
const EMPTY: Draft = { vi: "", zh: "", pinyin: "", category: "Chung", notes: "" };

function DictionaryPage() {
  const dict = useStore((s) => s.dictionary);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Draft | null>(null);
  const sp = useSpeak();
  const w = useStore((s) => s.settings.workLang);
  const list = dict.filter((d) => !q || `${d.vi} ${d.zh} ${d.en ?? seedEn(d.id) ?? ""} ${d.pinyin} ${d.category} ${d.notes}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-3">
      <PageHeader back title="Từ điển SK" subtitle={`${w === "en" ? "Dictionary" : "词典"} · ${dict.length} thuật ngữ`} />
      <div className="flex gap-2">
        <div className="flex-1"><SearchInput value={q} onChange={setQ} placeholder="Tìm: 氛围灯, khuôn, MOQ…" /></div>
        <button aria-label="Thêm thuật ngữ" onClick={() => setEdit(EMPTY)} className="tap inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <ImportButton />
      {edit && <Editor value={edit} onClose={() => setEdit(null)} />}

      {list.length === 0 && !q && <Empty title="Chưa có thuật ngữ" desc="Thêm thuật ngữ mới bằng nút +." />}
      {list.length === 0 && q && <p className="px-1 text-sm text-muted-foreground">Không có trong từ điển của bạn.</p>}
      {list.map((d) => { const en = d.en || seedEn(d.id); const showEn = w === "en" && !!en; return (
        <article key={d.id} className="surface p-4">
          <div className="flex flex-wrap items-baseline gap-x-2">
            {showEn ? <span className="text-2xl font-semibold">{en}</span> : <><span className="font-zh text-2xl font-semibold">{d.zh}</span><span className="text-sm text-primary">{d.pinyin}</span></>}
          </div>
          <p className="font-medium">{d.vi}{showEn ? <span className="font-zh text-muted-foreground"> · {d.zh}</span> : en ? <span className="text-muted-foreground"> · {en}</span> : null}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted-foreground">
              <span className="rounded bg-secondary px-1.5 py-0.5 font-semibold">{d.category}</span>
              {d.notes && <span className="ml-2">{d.notes}</span>}
            </p>
            <div className="flex shrink-0 gap-1">
              <IconBtn label="Đọc" onClick={() => (showEn ? sp(en, "en") : sp(d.zh, "zh"))}><Volume2 className="h-4 w-4" /></IconBtn>
              <IconBtn label="Sửa" onClick={() => setEdit(d)}><Pencil className="h-4 w-4" /></IconBtn>
              <IconBtn label="Xoá" onClick={() => confirm(`Xoá "${d.zh}"?`) && store.deleteTerm(d.id)}><Trash2 className="h-4 w-4" /></IconBtn>
            </div>
          </div>
        </article>
      ); })}
      <CedictPanel q={q} />
      <VnedictPanel query={q} />
    </div>
  );
}

function ImportButton() {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const onFile = async (f: File) => {
    setBusy(true);
    try {
      let rows: unknown[][];
      if (/\.xlsx$/i.test(f.name)) {
        const { default: readXlsx } = await import("read-excel-file/browser");
        rows = ((await readXlsx(f))[0]?.data ?? []) as unknown[][];
      } else rows = parseDelimited(await f.text());
      const terms = rowsToTerms(rows);
      if (!terms.length) { setMsg({ ok: false, text: "Không đọc được thuật ngữ nào — cần cột Tiếng Việt và 中文" }); return; }
      const [a, u] = store.importTerms(terms);
      setMsg({ ok: true, text: `Đã nhập ${a} thuật ngữ mới${u ? `, cập nhật ${u}` : ""}` });
    } catch { setMsg({ ok: false, text: "Không mở được file này" }); }
    finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  };
  return (
    <div>
      <input ref={ref} type="file" accept=".xlsx,.csv,.tsv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} />
      <button onClick={() => ref.current?.click()} disabled={busy} className="tap inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary text-sm font-semibold">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />} Nhập từ Excel / CSV
      </button>
      <p className="mt-1 px-1 text-[11px] text-muted-foreground">Cột: Tiếng Việt · 中文 · Pinyin · English · Nhóm · Ghi chú. Trùng chữ Trung sẽ được cập nhật.</p>
      {msg && <p className={msg.ok ? "mt-1 px-1 text-xs font-medium text-success" : "mt-1 px-1 text-xs font-medium text-destructive"}>{msg.text}</p>}
    </div>
  );
}

function CedictPanel({ q }: { q: string }) {
  const st = useCedictStatus();
  const [added, setAdded] = useState<string[]>([]);
  const sp = useSpeak();
  useEffect(() => { void initCedict(); }, []);
  const hits = lookupCedict(q);
  return (
    <section className="space-y-2">
      <div className="surface space-y-2 p-4">
        <p className="font-semibold">Kho từ điển Trung–Anh offline</p>
        <p className="text-sm text-muted-foreground">{INDUSTRY_ENTRIES.length} thuật ngữ SK có sẵn ngoại tuyến · Trung–Anh · Pinyin</p>
        {st === "ready" ? <p className="text-sm text-muted-foreground">Kho Trung–Anh offline đã sẵn sàng · CC-CEDICT + thuật ngữ SK</p> : <>
        <p className="text-sm text-muted-foreground">Tải thêm ~118.000 từ CC-CEDICT (~3 MB nén). Dung lượng tải không phải giới hạn số từ.</p>
        <Button onClick={() => void downloadCedict()} disabled={st === "downloading" || st === "unknown"} className="tap h-11 w-full font-semibold">
          {st === "downloading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {st === "downloading" ? "Đang tải…" : st === "error" ? "Tải lại" : "Tải kho từ điển"}
        </Button>
        {st === "error" && <p className="text-xs text-destructive">Tải không được. Kiểm tra mạng rồi thử lại.</p>}
        </>}
      </div>
      {q.trim() && <>
      <h2 className="px-1 text-sm font-semibold text-muted-foreground">Kho Trung–Anh · SK{st === "ready" ? " + CC-CEDICT" : ""}</h2>
      {hits.length === 0 && <p className="px-1 text-sm text-muted-foreground">Không tìm thấy trong kho.</p>}
      {hits.map((h) => (
        <article key={h.zh + h.pinyin} className="surface flex items-center gap-2 p-3">
          <div className="min-w-0 flex-1">
            <p><span className="font-zh text-xl font-semibold">{h.zh}</span> <span className="text-sm text-primary">{h.pinyin}</span></p>
            <p className="text-sm text-muted-foreground">{h.en}</p>
          </div>
          <IconBtn label="Đọc" onClick={() => sp(h.zh, "zh")}><Volume2 className="h-4 w-4" /></IconBtn>
          {!INDUSTRY_ENTRIES.some((e) => e.zh === h.zh) && <IconBtn label="Thêm vào từ điển" onClick={() => { store.upsertTerm({ vi: "", zh: h.zh, en: h.en.split(";")[0], pinyin: h.pinyin, category: "Chung", notes: "CC-CEDICT" }); setAdded((p) => (p.includes(h.zh) ? p : [...p, h.zh])); }}>{added.includes(h.zh) ? <Check className="h-4 w-4 text-success" /> : <Plus className="h-4 w-4" />}</IconBtn>}
        </article>
      ))}
      </>}
      {st === "ready" && <p className="px-1 text-[10px] text-muted-foreground">Dữ liệu CC-CEDICT · MDBG · CC BY-SA 4.0; thuật ngữ chuyên ngành · SK</p>}
    </section>
  );
}

function Editor({ value, onClose }: { value: Draft; onClose: () => void }) {
  const [v, setV] = useState<Draft>(value);
  const f = (k: keyof Draft) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });
  const cls = "h-12 w-full rounded-xl bg-secondary px-4 outline-none focus:ring-2 focus:ring-ring";
  return (
    <div className="surface space-y-2 p-4">
      <p className="font-semibold">{value.id ? "Sửa thuật ngữ" : "Thêm thuật ngữ"}</p>
      <input className={cls} placeholder="Tiếng Việt" value={v.vi} onChange={f("vi")} />
      <input className={`${cls} font-zh`} placeholder="中文" value={v.zh} onChange={f("zh")} />
      <input className={cls} placeholder="Pinyin" value={v.pinyin} onChange={f("pinyin")} />
      <input className={cls} placeholder="English" value={v.en ?? ""} onChange={f("en")} />
      <select className={cls} value={v.category} onChange={f("category")}>
        {DICT_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input className={cls} placeholder="Ghi chú" value={v.notes} onChange={f("notes")} />
      <div className="flex gap-2 pt-1">
        <button onClick={onClose} className="tap h-12 flex-1 rounded-xl bg-secondary font-semibold">Huỷ</button>
        <button
          disabled={!v.zh.trim() || !(v.vi.trim() || v.en?.trim())}
          onClick={() => { store.upsertTerm({ ...v, vi: v.vi.trim(), zh: v.zh.trim(), en: v.en?.trim() || undefined }); onClose(); }}
          className="tap h-12 flex-1 rounded-xl bg-foreground font-semibold text-background disabled:opacity-40"
        >
          Lưu
        </button>
      </div>
    </div>
  );
}
