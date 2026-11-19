// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #027 (MIT, © 2026 Seokwoooo); Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #092 (MIT, © 2026 Seokwoooo)
import { useEffect, useId, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock3, MessageCircle, Search, X } from "lucide-react";
import { SearchBar } from "@/components/SearchBar";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/SmartImage";
import { ProductPlaceholder } from "./ProductPlaceholder";
import type { Category } from "@/data/catalog";
import { useDealerContact } from "@/hooks/useDealerContact";
import { zaloHref } from "@/lib/dealerLink";
import { IMG } from "@/data/images";
import type { SearchResult } from "@/data/catalog.repository";
import { RECENT_SEARCH_KEY, recentSearches, rememberSearch, searchTextParts } from "@/lib/catalogSearch";

export function HomeSearch({ value, onChange, categories, results, loading, tooShort, failed }: {
  value: string; onChange: (value: string) => void; categories: Category[]; results: SearchResult[]; loading: boolean; tooShort: boolean; failed: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const tabTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  // Nút hỏi qua Zalo chỉ hiện khi khách vào qua link của đại lý cấp 1.
  const { contact } = useDealerContact();
  const empty = !value.trim();
  const brands = categories.slice(0, 8);
  const count = empty ? recent.length + brands.length : results.length;
  useEffect(() => {
    try { setRecent(recentSearches(JSON.parse(localStorage.getItem(RECENT_SEARCH_KEY) ?? "[]"))); } catch { /* Storage có thể bị chặn. */ }
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("pointerdown", outside); if (tabTimer.current) clearTimeout(tabTimer.current); };
  }, []);
  useEffect(() => { setActive(-1); }, [value, results, recent]);
  useEffect(() => {
    if (active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id]);
  const save = (items: string[]) => { setRecent(items); try { localStorage.setItem(RECENT_SEARCH_KEY, JSON.stringify(items)); } catch { /* Tìm kiếm vẫn dùng được khi lưu trữ bị chặn. */ } };
  const remember = () => save(rememberSearch(recent, value));
  const close = () => { setOpen(false); setActive(-1); };
  const highlight = (text: string) => searchTextParts(text, value).map((part, i) => part.match ? <mark key={i} className="bg-transparent font-extrabold text-gold">{part.text}</mark> : <span key={i}>{part.text}</span>);
  const brandChips = (offset: number, options: boolean) => <div className="flex flex-wrap gap-2">{brands.map((brand, i) => <Button key={brand.id} asChild variant="outline" size="sm" className="max-w-full whitespace-normal text-left"><Link to="/c/$categoryId" params={{ categoryId: brand.id }} onClick={close} id={options ? `${id}-option-${offset + i}` : undefined} role={options ? "option" : undefined} aria-selected={options ? active === offset + i : undefined} className={active === offset + i && options ? "ring-1 ring-ring" : ""}>{brand.name}</Link></Button>)}</div>;
  return <div ref={root} className="relative" data-search-open={open} onKeyDown={event => {
    if (event.key !== "Tab") return;
    if (tabTimer.current) clearTimeout(tabTimer.current);
    tabTimer.current = setTimeout(() => { if (!root.current?.contains(document.activeElement)) close(); }, 0);
  }}>
    <SearchBar value={value} onChange={next => { onChange(next); setOpen(true); }} onFocus={() => setOpen(true)} expanded={open} controls={`${id}-list`} activeDescendant={open && active >= 0 ? `${id}-option-${active}` : undefined} onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Escape") { event.preventDefault(); close(); }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault(); setOpen(true);
        if (count) setActive(previous => event.key === "ArrowDown" ? (previous + 1) % count : (previous <= 0 ? count - 1 : previous - 1));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (value.trim().length >= 2) remember();
        if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.click();
        else if (value.trim().length >= 2) setOpen(true);
      }
    }} />
    {open ? <div className="sk-search-panel absolute top-full right-0 left-0 z-30 mt-2 max-h-[60dvh] overflow-y-auto overscroll-contain rounded-lg border border-border bg-popover p-3">
      {empty ? <>
        <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">Tìm gần đây</h2>{recent.length ? <Button variant="ghost" size="sm" onClick={() => save([])}>Xoá tất cả</Button> : null}</div>
        {recent.length ? <div id={`${id}-list`} role="listbox" aria-label="Gợi ý tìm kiếm">
          {recent.map((term, i) => <div key={term} className="flex items-center gap-1">
            <Button id={`${id}-option-${i}`} role="option" aria-selected={active === i} variant="ghost" className={`min-w-0 flex-1 justify-start ${active === i ? "bg-accent" : ""}`} onClick={() => { onChange(term); setOpen(true); }}><Clock3 className="shrink-0" /><span className="truncate">{term}</span></Button>
            <Button variant="ghost" size="icon" aria-label={`Xoá tìm kiếm ${term}`} onClick={() => save(recent.filter(item => item !== term))}><X /></Button>
          </div>)}
          <h2 className="mt-3 mb-2 text-sm font-semibold">Hãng xe phổ biến</h2>{brandChips(recent.length, true)}
        </div> : <><p className="mb-3 text-xs text-muted-foreground">Chưa có tìm kiếm gần đây</p><h2 className="mb-2 text-sm font-semibold">Hãng xe phổ biến</h2><div id={`${id}-list`} role="listbox" aria-label="Hãng xe phổ biến">{brandChips(0, true)}</div></>}
      </> : <>
        <p className="mb-2 text-xs text-muted-foreground" role="status">{tooShort ? "Nhập ít nhất 2 ký tự để tìm kiếm." : loading ? "Đang tìm…" : `${results.length} kết quả`}</p>
        <div id={`${id}-list`} role="listbox" aria-label="Kết quả tìm kiếm" className="space-y-2">
          {results.map((result, i) => <Link key={result.id} id={`${id}-option-${i}`} role="option" aria-selected={active === i} to={result.params.seriesId ? "/c/$categoryId/$seriesId" : result.params.nodeId ? "/c/$categoryId/n/$nodeId" : "/c/$categoryId"} params={{categoryId:result.params.categoryId,seriesId:result.params.seriesId,nodeId:result.params.nodeId}} onClick={() => { remember(); close(); }} className={`flex items-center gap-3 rounded-md border border-border p-2 ${active === i ? "bg-accent ring-1 ring-ring" : "bg-card"}`}>
            <SmartImage src={result.level === "product" && result.image === IMG.car ? "" : result.image} alt={result.title} size="thumb" width={48} height={48} className="size-12 shrink-0 rounded-md bg-muted object-contain" fallbackContent={result.level === "product" ? <ProductPlaceholder className="size-12 shrink-0 rounded-md [&_svg]:w-10 [&_span]:hidden" /> : undefined} />
            <span className="min-w-0"><span className="block truncate text-sm font-semibold">{highlight(result.title)}</span><span className="block truncate text-xs text-muted-foreground">{highlight(result.subtitle)}</span></span>
          </Link>)}
        </div>
        {!tooShort && !loading && !results.length ? <div className="py-4 text-center">
          <Search className="mx-auto mb-3 size-8 text-gold" />
          <h2 className="break-words text-base font-semibold">{failed ? "Chưa tải được kết quả" : `Chưa thấy “${value.trim()}”`}</h2>
          <p className="mt-2 mb-4 text-sm text-muted-foreground">Thử gõ ngắn hơn, chỉ tên hãng hoặc dòng xe</p>
          {brandChips(0, false)}
          {contact ? <Button asChild variant="secondary" className="mt-4 text-gold"><a href={zaloHref(contact.zalo)} target="_blank" rel="noopener noreferrer"><MessageCircle />Hỏi tư vấn qua Zalo</a></Button> : null}
        </div> : null}
      </>}
    </div> : null}
  </div>;
}