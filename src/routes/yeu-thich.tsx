import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { SafeProductCard } from '@/components/catalog/SafeProductCard';
import { ProductActions, useWorkflow } from '@/components/catalog/WorkflowProvider';
import { asProduct, PUBLIC_PRODUCT_COLUMNS } from '@/data/workflow.api';
import { supabase } from '@/integrations/supabase/client';
export const Route = createFileRoute('/yeu-thich')({head:() => ({meta:[{title:'Sản phẩm yêu thích | SK'},{name:'description',content:'Danh sách phụ kiện ô tô yêu thích của bạn tại SK.'},{property:'og:title',content:'Sản phẩm yêu thích | SK'},{property:'og:description',content:'Các phụ kiện được lưu trong tài khoản của bạn.'},{property:'og:type',content:'website'},{name:'twitter:card',content:'summary_large_image'}]}),component:FavoritesPage});
function FavoritesPage() {
  const workflow = useWorkflow(); const ids = workflow?.favorites ?? [];
  const {data,error,isPending} = useQuery({queryKey:['favorite-products',workflow?.userId,ids],enabled:Boolean(workflow?.userId && ids.length),queryFn:async () => {const {data,error} = await supabase.from('products').select(PUBLIC_PRODUCT_COLUMNS).in('id',ids);if(error) throw new Error(error.message);return data;}});
  return <div><PageHeader title="Sản phẩm yêu thích" /><div className="sk-product-list space-y-6 p-3">{!workflow?.userId ? <Link to="/auth" className="block py-8 text-center text-gold">Đăng nhập để xem sản phẩm yêu thích</Link> : !ids.length ? <p className="py-8 text-center text-muted-foreground">Chưa có sản phẩm yêu thích.</p> : error ? <p role="alert">Không tải được danh sách. Vui lòng thử lại.</p> : isPending ? <p>Đang tải…</p> : data?.length ? data.map(row => <SafeProductCard key={row.id} product={asProduct(row)}><ProductActions id={row.id} name={row.name} /></SafeProductCard>) : <p>Các sản phẩm đã lưu không còn trong danh mục.</p>}</div></div>;
}
