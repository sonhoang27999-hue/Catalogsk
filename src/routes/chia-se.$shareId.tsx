import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { asProduct } from '@/data/workflow.api';
import { shareOptions } from '@/data/share.query';
import { SafeProductCard } from '@/components/catalog/SafeProductCard';
import { PageHeader } from '@/components/PageHeader';

export const Route = createFileRoute('/chia-se/$shareId')({
  loader: ({params,context}) => context.queryClient.ensureQueryData(shareOptions(params.shareId)),
  head: ({loaderData}) => {const title = `${loaderData?.title ?? 'Danh sách tư vấn'} | SK`; const description = 'Danh sách phụ kiện ô tô và giá bán dành cho khách hàng SK Ambient Light Luxury.';return {meta:[{title},{name:'description',content:description},{property:'og:title',content:title},{property:'og:description',content:description},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]};},
  component: SharePage,
  notFoundComponent: () => <div className="p-6 text-center"><p>Danh sách không tồn tại hoặc đã được thu hồi.</p><Link to="/" className="mt-4 block text-gold">Về danh mục</Link></div>,
});
function SharePage() {const {shareId} = Route.useParams();const {data} = useSuspenseQuery(shareOptions(shareId));return <div><PageHeader title={data.title} />{data.products.length ? <p className="px-3 text-center text-xs text-muted-foreground">Giá niêm yết đã gồm VAT</p> : null}<div className="sk-product-list space-y-6 p-3">{data.products.map(p => <SafeProductCard key={p.id} product={asProduct(p)} />)}{!data.products.length ? <p className="py-8 text-center text-muted-foreground">Các sản phẩm trong danh sách không còn được bán.</p> : null}</div></div>;}
