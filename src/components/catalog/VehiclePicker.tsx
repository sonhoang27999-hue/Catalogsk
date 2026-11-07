// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #336 (MIT, © 2026 Seokwoooo)
import { useRef, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Car, ChevronRight, X } from 'lucide-react';
import type { Category, CatalogNode } from '@/data/catalog';
import { categoryQueryOptions } from '@/data/catalog.queries';
import { normalize } from '@/data/catalog.repository';
import { pickerBreadcrumb, pickerNodes, pickerNodeStep } from '@/lib/vehiclePicker';
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SmartImage } from '@/components/SmartImage';

export function VehiclePicker({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<number | string | null>(0.6);
  const [brand, setBrand] = useState<Category | null>(null);
  const [path, setPath] = useState<CatalogNode[]>([]);
  const [filter, setFilter] = useState('');
  const query = useQuery({ ...categoryQueryOptions(brand?.id ?? ''), enabled: open && Boolean(brand) });
  const category = query.data;
  const changeOpen = (value: boolean) => {
    setOpen(value);
    if (!value) { setBrand(null); setPath([]); setFilter(''); setSnap(0.6); }
  };
  const navigate = (kind: 'brand' | 'series' | 'node', id?: string) => {
    if (!brand) return;
    const categoryId = brand.id;
    changeOpen(false);
    if (kind === 'series' && id) void router.navigate({ to: '/c/$categoryId/$seriesId', params: { categoryId, seriesId: id } });
    else if (kind === 'node' && id) void router.navigate({ to: '/c/$categoryId/n/$nodeId', params: { categoryId, nodeId: id } });
    else void router.navigate({ to: '/c/$categoryId', params: { categoryId } });
  };
  const row = (name: string, image: string | null, action: () => void, key: string) => (
    <Button key={key} variant="ghost" className="h-auto min-h-12 w-full justify-start gap-3 rounded-none border-b border-border px-4 py-2 text-left" onClick={action}>
      {image !== null ? <SmartImage src={image} alt="" size="thumb" className="size-10 shrink-0 object-contain" fallbackContent={<Car className="size-6 shrink-0 text-brand" />} /> : <Car className="size-5 shrink-0 text-brand" />}
      <span className="min-w-0 flex-1 whitespace-normal text-sm">{name}</span><ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Button>
  );
  return <Drawer open={open} onOpenChange={changeOpen} snapPoints={[0.6, 0.94]} activeSnapPoint={snap} setActiveSnapPoint={setSnap} shouldScaleBackground={false} autoFocus={false} repositionInputs={false}>
    <DrawerTrigger asChild><Button ref={trigger} variant="ghost" className="sk-edge sk-shimmer mx-3 mt-4 flex h-auto w-[calc(100%-1.5rem)] justify-start gap-3 rounded-lg px-3 py-3 text-left">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-brand"><Car className="size-4" /></span>
      <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Chọn xe của bạn</span><span className="block whitespace-normal text-xs text-muted-foreground">Hãng → dòng xe → phụ kiện đúng xe</span></span><ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Button></DrawerTrigger>
    <DrawerContent className="sk-catalog sk-vehicle-drawer mx-auto h-[94dvh] max-w-[960px]" onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }} aria-describedby={undefined}>
      <div className="flex shrink-0 items-center gap-2 px-3 py-3">
        {brand ? <Button variant="ghost" size="icon" aria-label="Quay lại" onClick={() => { if (path.length) setPath(path.slice(0, -1)); else setBrand(null); }}><ArrowLeft className="size-5" /></Button> : null}
        <DrawerTitle className="flex-1 text-base">Chọn xe của bạn</DrawerTitle>
        <DrawerClose asChild><Button variant="ghost" size="icon" aria-label="Đóng chọn xe"><X className="size-5" /></Button></DrawerClose>
      </div>
      <p className="shrink-0 px-4 pb-3 text-xs text-muted-foreground">{pickerBreadcrumb(brand?.name, path).join(' › ')}</p>
      <div className={`min-h-0 overflow-y-auto overscroll-contain pb-8 ${snap === 0.6 ? 'max-h-[calc(60dvh-8rem)]' : 'flex-1'}`} data-vaul-no-drag>
        {!brand ? <><div className="px-4 pb-3"><Input aria-label="Lọc hãng xe" placeholder="Tìm hãng xe..." value={filter} onChange={e => setFilter(e.target.value)} /></div>
          {categories.filter(c => normalize(c.name).includes(normalize(filter))).map(c => row(c.name, c.image, () => { setBrand(c); setFilter(''); }, c.id))}
          {!categories.some(c => normalize(c.name).includes(normalize(filter))) ? <p className="px-4 py-6 text-sm text-muted-foreground">Không có hãng xe phù hợp.</p> : null}
        </> : <>
          {row(`Xem tất cả ${brand.name}`, null, () => navigate('brand'), 'all')}
          {query.isPending ? <div role="status" aria-label="Đang tải dòng xe" className="space-y-3 p-4">{[0,1,2,3].map(i => <div key={i} className="h-12 rounded-md bg-secondary" />)}</div> : query.isError || !category ? <div className="p-4"><p className="text-sm">Chưa tải được, thử lại</p><Button variant="secondary" className="mt-3" onClick={() => void query.refetch()}>Thử lại</Button></div> : <>
            {category.layout === 'classic' ? category.series.map(s => row(s.name, s.image, () => navigate('series', s.id), s.id)) : <>
              {path.length ? row(`Xem sản phẩm của ${path[path.length - 1]?.name}`, null, () => navigate('node', path[path.length - 1]?.id), 'own') : null}
              {pickerNodes(category.nodes, path).map(node => row(node.name, node.image, () => { const step = pickerNodeStep(path, node); if (step.destination) navigate('node', step.destination); else setPath(step.path); }, node.id))}
            </>}
            {!(category.layout === 'classic' ? category.series.length : pickerNodes(category.nodes, path).length) ? <p className="px-4 py-6 text-sm text-muted-foreground">Chưa có dòng xe.</p> : null}
          </>}
        </>}
      </div>
    </DrawerContent>
  </Drawer>;
}