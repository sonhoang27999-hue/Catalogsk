import type { Product } from '@/data/catalog';
import { ProductMedia } from './ProductMedia';
import { formatPrice } from '@/data/catalog.repository';
import { LazyEmbed } from '@/components/LazyEmbed';
import { toEmbedUrl, isVerticalUrl } from '@/lib/video';
import { safeWebLink } from '@/lib/productChecks';
export function SafeProductCard({product,children}: {product:Product;children?:React.ReactNode}) {
  const sale = product.salePrice != null && product.salePrice > 0 && product.salePrice < product.price;
  const discount = sale ? Math.round(((product.price - (product.salePrice ?? product.price)) / product.price) * 100) : 0;
  return <div className="sk-reveal"><article className="sk-edge sk-product-card overflow-hidden rounded-lg">
    <div className="bg-secondary px-3 py-3"><h2 className="text-xl font-bold">{product.name}</h2>{product.description ? <p className="mt-1 text-sm text-muted-foreground">{product.description}</p> : null}{children}</div>
    <ProductMedia src={product.image} name={product.name} price={product.price} salePrice={product.salePrice} />
    {product.detailUrl && safeWebLink(product.detailUrl) ? <a href={product.detailUrl} target="_blank" rel="noopener noreferrer" className="block px-3 py-3 text-center text-sm text-gold">Xem sản phẩm lên xe thực tế</a> : null}
    {toEmbedUrl(product.videoUrl) ? <LazyEmbed src={toEmbedUrl(product.videoUrl) ?? ''} title={product.name} vertical={isVerticalUrl(product.videoUrl)} /> : null}
    <div className="px-3 py-3">
      <div className="flex flex-wrap items-center gap-2"><p className="text-xs text-muted-foreground">{sale ? 'Giá khuyến mãi' : 'Giá niêm yết'}</p>{sale ? <span className="sk-discount rounded-md px-2 py-0.5 text-xs font-extrabold text-primary-foreground">-{discount}%</span> : null}</div>
      <p className="text-3xl font-extrabold">{formatPrice(sale ? (product.salePrice ?? product.price) : product.price)}</p>
      {sale ? <p className="text-sm text-muted-foreground line-through">{formatPrice(product.price)}</p> : null}
    </div>
  </article></div>;
}
