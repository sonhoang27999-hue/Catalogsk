// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #242 (MIT, © 2026 Seokwoooo)
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { Product } from '@/data/catalog';
import { Button } from '@/components/ui/button';
import { chipScrollLeft, selectActiveProduct } from '@/lib/productJump';

export function ProductJumpNav({ products, listRef }: { products: Product[]; listRef: RefObject<HTMLDivElement | null> }) {
  const nav = useRef<HTMLElement>(null);
  const underline = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState(products[0]?.id ?? '');
  useEffect(() => {
    const list = listRef.current;
    const bar = nav.current;
    if (!list || !bar || !window.IntersectionObserver) return;
    const cards = Array.from(list.querySelectorAll<HTMLElement>('[data-jump-product]'));
    setActive(products[0]?.id ?? '');
    const visible = new Set<HTMLElement>();
    let observer: IntersectionObserver | undefined;
    const observe = () => {
    observer?.disconnect(); visible.clear();
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) { if (entry.isIntersecting) visible.add(entry.target as HTMLElement); else visible.delete(entry.target as HTMLElement); }
      const id = selectActiveProduct(Array.from(visible, card => { const rect = card.getBoundingClientRect(); return { id: card.dataset['jumpProduct'] ?? '', top: rect.top, bottom: rect.bottom }; }));
      if (id) setActive(id);
    }, { rootMargin: `-114px 0px -${Math.max(0, window.innerHeight - 118)}px 0px`, threshold: 0 });
    cards.forEach(card => observer?.observe(card));
    };
    observe();
    window.addEventListener('resize', observe, {passive:true});
    return () => { observer?.disconnect(); window.removeEventListener('resize', observe); };
  }, [products, listRef]);
  useEffect(() => {
    const bar = nav.current;
    const chip = Array.from(bar?.querySelectorAll<HTMLElement>('[data-chip]') ?? []).find(item => item.dataset['chip'] === active);
    if (!bar || !chip) return;
    if (underline.current) underline.current.style.transform = `translateX(${chip.offsetLeft + 12}px) scaleX(${Math.max(0, chip.offsetWidth - 24)})`;
    bar.scrollTo({left: chipScrollLeft(chip.offsetLeft, chip.offsetWidth, bar.scrollLeft, bar.clientWidth), behavior: 'instant'});
  }, [active]);
  return <nav ref={nav} aria-label="Nhảy tới sản phẩm" className="sk-sticky-sub sk-product-jump sticky top-14 z-20 flex h-12 items-center gap-1 overflow-x-auto border-b border-border bg-card px-2">
    {products.map(product => <Button key={product.id} variant="ghost" data-chip={product.id} aria-label={product.name} aria-current={active === product.id ? 'true' : undefined} className="sk-product-chip relative h-10 max-w-36 shrink-0 rounded-none px-3" onClick={() => {
      const card = Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-jump-product]') ?? []).find(item => item.dataset['jumpProduct'] === product.id);
      card?.scrollIntoView({block:'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }}><span className="truncate">{product.name}</span></Button>)}
    <span ref={underline} className="sk-chip-line" aria-hidden="true" />
  </nav>;
}