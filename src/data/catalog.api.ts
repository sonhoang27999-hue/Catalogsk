/**
 * Nạp toàn bộ catalog (4 tầng) từ Lovable Cloud và dựng thành cây lồng nhau.
 * Dữ liệu nhỏ nên tải một lần rồi cache bằng React Query.
 */
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage, type CatalogNode, type Category, type Model, type Product, type Series, type Spec, type Variant, type Video } from "./catalog";

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export async function fetchCatalogTree(): Promise<Category[]> {
  const [cats, sers, mods, prods, vids] = await Promise.all([
    supabase.from("categories").select("*").order("sort"),
    supabase.from("series").select("*").order("sort"),
    supabase.from("models").select("*").order("sort"),
    supabase.from("products").select("*").order("sort"),
    supabase.from("videos").select("*").order("sort"),
  ]);
  const nodesRes = await supabase.from("nodes").select("*").order("sort");

  const err = nodesRes.error ?? cats.error ?? sers.error ?? mods.error ?? prods.error ?? vids.error;
  if (err) throw new Error(err.message);

  // Giá nhập nằm ở bảng riêng: chỉ tài khoản được cấp quyền mới đọc được (RLS).
  const dealer = await supabase.from("product_dealer_prices").select("product_id, dealer_price");
  const dealerPriceById = new Map<string, number>();
  for (const d of dealer.data ?? []) {
    if (d.dealer_price !== null) dealerPriceById.set(d.product_id, Number(d.dealer_price));
  }

  const productsByModel = new Map<string, Product[]>();
  const productsByNode = new Map<string, Product[]>();
  const productsByCategory = new Map<string, Product[]>();
  for (const p of prods.data ?? []) {
    const item: Product = {
      id: p.id,
      dbId: p.id,
      name: p.name,
      formCode: p.form_code,
      image: resolveImage(p.image_url, p.image_key),
      price: Number(p.price ?? 0),
      salePrice: p.sale_price === null || p.sale_price === undefined ? null : Number(p.sale_price),
      dealerPrice: dealerPriceById.get(p.id) ?? null,
      installPrice: p.install_price === null ? null : Number(p.install_price),
      priceNote: p.price_note,
      description: p.description,
      brand: p.brand,
      origin: p.origin,
      videoUrl: p.video_url,
      detailUrl: (p as { detail_url?: string | null }).detail_url ?? null,
      specs: asArray<Spec>(p.specs),
      variants: asArray<Variant>(p.variants),
    };
    if (p.node_id) {
      const list = productsByNode.get(p.node_id) ?? [];
      list.push(item);
      productsByNode.set(p.node_id, list);
    } else if (p.category_id) {
      const list = productsByCategory.get(p.category_id) ?? [];
      list.push(item);
      productsByCategory.set(p.category_id, list);
    } else if (p.model_id) {
      const list = productsByModel.get(p.model_id) ?? [];
      list.push(item);
      productsByModel.set(p.model_id, list);
    }
  }

  const videosByModel = new Map<string, Video[]>();
  for (const v of vids.data ?? []) {
    const list = videosByModel.get(v.model_id) ?? [];
    list.push({ id: v.id, title: v.title, url: v.url });
    videosByModel.set(v.model_id, list);
  }

  const modelsBySeries = new Map<string, Model[]>();
  for (const m of mods.data ?? []) {
    const list = modelsBySeries.get(m.series_id) ?? [];
    list.push({
      id: m.slug,
      dbId: m.id,
      name: m.name,
      years: m.years,
      image: resolveImage(m.image_url, m.image_key),
      products: productsByModel.get(m.id) ?? [],
      videos: videosByModel.get(m.id) ?? [],
    });
    modelsBySeries.set(m.series_id, list);
  }

  const seriesByCategory = new Map<string, Series[]>();
  for (const s of sers.data ?? []) {
    const list = seriesByCategory.get(s.category_id) ?? [];
    list.push({
      id: s.slug,
      dbId: s.id,
      name: s.name,
      image: resolveImage(s.image_url, s.image_key),
      models: modelsBySeries.get(s.id) ?? [],
    });
    seriesByCategory.set(s.category_id, list);
  }

  // Dựng cây nodes (đệ quy) cho các hãng dùng cấu trúc cây linh hoạt.
  type NodeRow = NonNullable<typeof nodesRes.data>[number];
  const childrenOf = new Map<string, NodeRow[]>();
  const rootsOf = new Map<string, NodeRow[]>();
  for (const n of nodesRes.data ?? []) {
    if (n.parent_id) {
      const list = childrenOf.get(n.parent_id) ?? [];
      list.push(n);
      childrenOf.set(n.parent_id, list);
    } else {
      const list = rootsOf.get(n.category_id) ?? [];
      list.push(n);
      rootsOf.set(n.category_id, list);
    }
  }
  const buildNode = (n: NodeRow): CatalogNode => ({
    id: n.id,
    name: n.name,
    image: resolveImage(n.image_url, null),
    children: (childrenOf.get(n.id) ?? []).map(buildNode),
    products: productsByNode.get(n.id) ?? [],
  });

  return (cats.data ?? []).map((c) => ({
    id: c.slug,
    dbId: c.id,
    name: c.name,
    icon: c.icon,
    image: resolveImage(c.image_url, c.image_key),
    series: seriesByCategory.get(c.id) ?? [],
    layout: (c.layout === "tree" ? "tree" : "classic") as "tree" | "classic",
    nodes: (rootsOf.get(c.id) ?? []).map(buildNode),
    rootProducts: productsByCategory.get(c.id) ?? [],
  }));
}

export const catalogQueryOptions = queryOptions({
  queryKey: ["catalog"],
  queryFn: fetchCatalogTree,
  staleTime: 60_000,
});
