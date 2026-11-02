import { supabase } from '@/integrations/supabase/client';
import { normalizeImageUrl } from '@/lib/imageUrl';
import { toEmbedUrl } from '@/lib/video';

export type ProductCheckInput = { name?: string | undefined; price: number; sale_price?: number | null | undefined; image_url?: string | null | undefined; video_url?: string | null | undefined; detail_url?: string | null | undefined; model_id?: string | null | undefined; node_id?: string | null | undefined; category_id?: string | null | undefined };
export function priceWarnings(price: number, salePrice?: number | null): string[] {
  return salePrice != null && salePrice > price ? ['Giá khuyến mãi cao hơn giá niêm yết.'] : [];
}
export function safeWebLink(value: string): boolean {
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol); } catch { return false; }
}
export function normalizedProductName(name: string): string { return name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' '); }
export async function checkProduct(input: ProductCheckInput, id?: string): Promise<string[]> {
  const warnings = priceWarnings(input.price, input.sale_price);
  let scope = input;
  if (id) {
    const { data, error } = await supabase.from('products').select('model_id,node_id,category_id').eq('id', id).single();
    if (error) throw new Error(error.message);
    scope = { ...input, ...data };
  }
  if (input.name?.trim()) {
    let query = supabase.from('products').select('id,name');
    if (scope.node_id) query = query.eq('node_id', scope.node_id);
    else if (scope.model_id) query = query.eq('model_id', scope.model_id);
    else if (scope.category_id) query = query.eq('category_id', scope.category_id);
    else query = query.eq('form_code', '');
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    if (data?.some(p => p.id !== id && normalizedProductName(p.name) === normalizedProductName(input.name ?? ''))) warnings.push('Đã có sản phẩm cùng tên trong mục này.');
  }
  for (const [label, value] of [['Ảnh', input.image_url], ['Chi tiết', input.detail_url]] as const) {
    if (value && !safeWebLink(value)) warnings.push(`Link ${label.toLowerCase()} không hợp lệ.`);
  }
  if (input.video_url && !toEmbedUrl(input.video_url)) warnings.push('Link video chưa được nhận diện hoặc không hợp lệ.');
  if (input.image_url && safeWebLink(input.image_url) && typeof window !== 'undefined') {
    const imageUrl = input.image_url;
    const loaded = await new Promise<boolean>(resolve => {
      const image = new Image();
      const timer = window.setTimeout(() => { image.onload = null; image.onerror = null; resolve(false); }, 5000);
      image.onload = () => { window.clearTimeout(timer); resolve(true); };
      image.onerror = () => { window.clearTimeout(timer); resolve(false); };
      image.referrerPolicy = 'no-referrer'; image.src = normalizeImageUrl(imageUrl);
    });
    if (!loaded) warnings.push('Ảnh không tải được hoặc phản hồi quá chậm; có thể do dịch vụ ảnh chặn kiểm tra.');
  }
  return warnings;
}
export function confirmWarnings(warnings: string[]): boolean {
  return !warnings.length || window.confirm(`Cần kiểm tra:\n\n${warnings.map(w => `• ${w}`).join('\n')}\n\nVẫn lưu các ngoại lệ này?`);
}
