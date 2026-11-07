// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #305 (MIT, © 2026 Seokwoooo)
import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal, X } from 'lucide-react';
import type { Product } from '@/data/catalog';
import { formatPrice } from '@/data/catalog.repository';
import { activeProductFilterCount, countFilteredProducts, emptyProductFilters, productPriceStep, type ProductFacets, type ProductFilters } from '@/lib/productFilter';
import { Drawer, DrawerClose, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

export function ProductFilter({ products, facets, applied, onApply, shown }: {
  products: Product[]; facets: ProductFacets; applied: ProductFilters; onApply: (filters: ProductFilters) => void; shown: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ProductFilters>(applied);
  const trigger = useRef<HTMLButtonElement>(null);
  const count = countFilteredProducts(products, draft);
  const [announced, setAnnounced] = useState(count);
  useEffect(() => { if (!open) return; const timer = window.setTimeout(() => setAnnounced(count), 350); return () => window.clearTimeout(timer); }, [count, open]);
  const activeCount = activeProductFilterCount(applied);
  const changeOpen = (next: boolean) => {
    setOpen(next);
    // Every open begins from applied; every other dismissal discards the draft.
    setDraft(applied);
    if (next) setAnnounced(countFilteredProducts(products, applied));
  };
  const toggle = (field: 'brands' | 'origins', value: string) => setDraft(current => ({...current, [field]: current[field].includes(value) ? current[field].filter(item => item !== value) : [...current[field],value]}));
  const clear = () => onApply(emptyProductFilters());
  const removable = (label: string, action: () => void, key: string) => <Button key={key} variant="secondary" className="min-h-11 h-auto max-w-full gap-2 whitespace-normal rounded-md px-3 py-2 text-left text-xs" onClick={action} aria-label={`Gỡ lọc ${label}`}><span>{label}</span><X className="size-3 shrink-0" /></Button>;
  const selected = (pressed: boolean) => `min-h-11 h-auto whitespace-normal rounded-md border px-3 py-2 ${pressed ? 'border-gold bg-gold text-gold-foreground hover:bg-gold hover:text-gold-foreground' : 'border-border bg-secondary text-foreground'}`;
  return <Drawer open={open} onOpenChange={changeOpen} shouldScaleBackground={false} autoFocus={false} repositionInputs={false}>
    <div className="px-3 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <DrawerTrigger asChild><Button ref={trigger} variant="secondary" className="min-h-11 gap-2" aria-haspopup="dialog" aria-label={`Lọc sản phẩm, ${activeCount} bộ lọc đang bật`}><SlidersHorizontal className="size-4" />Lọc{activeCount ? <span className="flex min-w-5 items-center justify-center rounded-md bg-gold px-1 text-xs text-gold-foreground">{activeCount}</span> : null}</Button></DrawerTrigger>
        {activeCount ? <p className="text-xs text-muted-foreground">Đang hiển thị {shown} / {products.length} sản phẩm</p> : null}
      </div>
      {activeCount ? <div className="mt-2 flex flex-wrap gap-2">
        {applied.price ? removable(`${formatPrice(applied.price[0])} – ${formatPrice(applied.price[1])}`, () => onApply({...applied,price:null}), 'price') : null}
        {applied.brands.map(brand => removable(`Thương hiệu: ${brand}`, () => onApply({...applied,brands:applied.brands.filter(item => item !== brand)}), `brand-${brand}`))}
        {applied.origins.map(origin => removable(`Xuất xứ: ${origin}`, () => onApply({...applied,origins:applied.origins.filter(item => item !== origin)}), `origin-${origin}`))}
        {applied.onSale ? removable('Đang giảm giá', () => onApply({...applied,onSale:false}), 'sale') : null}
        <Button variant="ghost" className="min-h-11 text-xs" onClick={clear}>Xoá lọc</Button>
      </div> : null}
    </div>
    <DrawerContent className="sk-catalog sk-filter-drawer mx-auto h-[85dvh] max-w-[960px]" aria-describedby={undefined} onCloseAutoFocus={event => {event.preventDefault(); trigger.current?.focus({preventScroll:true});}}>
      <div className="flex shrink-0 items-center gap-3 px-4 py-3"><DrawerTitle className="flex-1 text-base">Lọc sản phẩm</DrawerTitle><DrawerClose asChild><Button variant="ghost" size="icon" className="size-11" aria-label="Đóng bộ lọc"><X className="size-5" /></Button></DrawerClose></div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-4" data-vaul-no-drag>
        {facets.priceMeaningful ? <section aria-label="Giá bán"><h3 className="mb-3 text-sm font-semibold">Giá bán</h3>
          <div className="mb-2 flex justify-between gap-2 text-xs tabular-nums"><span>{formatPrice(draft.price?.[0] ?? facets.min)}</span><span>{formatPrice(draft.price?.[1] ?? facets.max)}</span></div>
          <Slider className="min-h-11" min={facets.min} max={facets.max} step={productPriceStep(facets.min,facets.max)} value={draft.price ?? [facets.min,facets.max]} thumbLabels={['Giá thấp nhất','Giá cao nhất']} onValueChange={values => { const low = values[0], high = values[1]; if (low === undefined || high === undefined) return; setDraft(current => ({...current,price: low === facets.min && high === facets.max ? null : [low,high]})); }} />
        </section> : null}
        {facets.brands.length >= 2 ? <section aria-label="Thương hiệu"><h3 className="mb-3 text-sm font-semibold">Thương hiệu</h3><div className="flex flex-wrap gap-2">{facets.brands.map(brand => <Button key={brand} variant="secondary" className={selected(draft.brands.includes(brand))} aria-pressed={draft.brands.includes(brand)} onClick={() => toggle('brands',brand)}>{brand}</Button>)}</div></section> : null}
        {facets.origins.length >= 2 ? <section aria-label="Xuất xứ"><h3 className="mb-3 text-sm font-semibold">Xuất xứ</h3><div className="flex flex-wrap gap-2">{facets.origins.map(origin => <Button key={origin} variant="secondary" className={selected(draft.origins.includes(origin))} aria-pressed={draft.origins.includes(origin)} onClick={() => toggle('origins',origin)}>{origin}</Button>)}</div></section> : null}
        {facets.saleMeaningful ? <Button variant="secondary" className={selected(draft.onSale)} aria-pressed={draft.onSale} onClick={() => setDraft(current => ({...current,onSale:!current.onSale}))}>Đang giảm giá</Button> : null}
      </div>
      <div className="shrink-0 border-t border-border bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <span role="status" aria-live="polite" aria-atomic="true" className="sr-only">{announced ? `${announced} sản phẩm phù hợp` : 'Không có sản phẩm phù hợp'}</span>
        <div className="flex gap-2"><Button variant="secondary" className="min-h-11" onClick={() => setDraft(emptyProductFilters())}>Đặt lại</Button><Button className="min-h-11 h-auto flex-1 whitespace-normal bg-gold text-gold-foreground hover:bg-gold" disabled={count === 0} onClick={() => {onApply(draft);setOpen(false);}}>{count ? <>Xem <span key={count} className="sk-filter-count inline-block min-w-4 tabular-nums">{count}</span> sản phẩm</> : 'Không có sản phẩm phù hợp'}</Button></div>
      </div>
    </DrawerContent>
  </Drawer>;
}