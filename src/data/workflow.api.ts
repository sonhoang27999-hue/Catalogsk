import { supabase } from '@/integrations/supabase/client';
import { queryOptions } from '@tanstack/react-query';
import { resolveImage, type Product } from '@/data/catalog';

export type RecentVehicle = { path: string; name: string };
export const preferenceOptions = (userId: string | null) => queryOptions({
  queryKey: ['catalog-preferences', userId], enabled: Boolean(userId),
  queryFn: async () => {
    if (!userId) return null;
    const { data, error } = await supabase.from('catalog_preferences').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },
});
export async function currentUserId() { const { data } = await supabase.auth.getUser(); if (!data.user) throw new Error('Vui lòng đăng nhập.'); return data.user.id; }
export async function createShare(title: string, ids: string[]) {
  const userId = await currentUserId();
  const { data, error } = await supabase.from('catalog_share_lists').insert({ user_id: userId, title: title.trim() || 'Danh sách sản phẩm SK', product_ids: [...new Set(ids)] }).select('id').single();
  if (error) throw new Error(error.message); return data.id;
}
export async function toggleFavorite(id: string) {
  const { error } = await supabase.rpc('toggle_catalog_favorite', { _id: id }); if (error) throw new Error(error.message);
}
export function parseRecent(value: unknown): RecentVehicle[] {
  return Array.isArray(value) ? value.filter((v): v is RecentVehicle => Boolean(v && typeof v === 'object' && 'path' in v && typeof v.path === 'string' && /^\/c\/[a-zA-Z0-9_-]+(?:\/(?:[a-zA-Z0-9_-]+|n\/[a-zA-Z0-9_-]+))?$/.test(v.path) && 'name' in v && typeof v.name === 'string')) : [];
}
export async function rememberVehicle(userId: string, vehicle: RecentVehicle) {
  const { data, error } = await supabase.from('catalog_preferences').select('recent_vehicles').eq('user_id', userId).maybeSingle();
  if (error) throw new Error(error.message);
  const recent = [vehicle, ...parseRecent(data?.recent_vehicles).filter(v => v.path !== vehicle.path)].slice(0, 6);
  const { error: writeError } = await supabase.from('catalog_preferences').upsert({ user_id: userId, recent_vehicles: recent, updated_at: new Date().toISOString() });
  if (writeError) throw new Error(writeError.message);
}
export type SafeProductRow = { id: string; name: string; image_url: string | null; image_key: string | null; description: string | null; price: number; sale_price: number | null; video_url: string | null; detail_url: string | null };
export const PUBLIC_PRODUCT_COLUMNS = 'id,name,image_url,image_key,description,price,sale_price,video_url,detail_url';
export function asProduct(row: SafeProductRow): Product {
  return { id: row.id, dbId: row.id, name: row.name, image: resolveImage(row.image_url, row.image_key), price: Number(row.price), salePrice: row.sale_price == null ? null : Number(row.sale_price), description: row.description, videoUrl: row.video_url, detailUrl: row.detail_url, formCode: '', brand: '', origin: '', specs: [], variants: [] };
}
