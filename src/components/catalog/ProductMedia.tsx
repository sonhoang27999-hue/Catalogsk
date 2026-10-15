import { SmartImage } from "@/components/SmartImage";
import { ImageZoom } from "@/components/ImageZoom";
import { IMG } from "@/data/images";
import { ProductPlaceholder } from "./ProductPlaceholder";

export function ProductMedia({
  src,
  name,
  price,
  salePrice,
}: {
  src: string | null | undefined;
  name: string;
  price: number;
  salePrice?: number | null | undefined;
}) {
  const missing = !src?.trim() || src === IMG.car;
  const discounted = salePrice != null && salePrice > 0 && salePrice < price;
  return (
    <div className="sk-product-media relative overflow-hidden">
      {missing ? (
        <ProductPlaceholder />
      ) : (
        <ImageZoom src={src} alt={name}>
          <SmartImage
            src={src}
            alt={name}
            size="preview"
            sizes="(max-width: 600px) 100vw, 480px"
            className="sk-product-photo block aspect-[4/3] w-full object-cover"
            fallbackContent={<ProductPlaceholder />}
          />
        </ImageZoom>
      )}
      {discounted ? (
        <span className="sk-discount absolute right-3 top-3 rounded-md px-3 py-1.5 text-sm font-extrabold text-primary-foreground">
          -{Math.round(((price - salePrice) / price) * 100)}%
        </span>
      ) : null}
    </div>
  );
}
