import { SmartImage } from "@/components/SmartImage";
import { ImageZoom } from "@/components/ImageZoom";
import { IMG } from "@/data/images";
import { ProductPlaceholder } from "./ProductPlaceholder";

export function ProductMedia({
  src,
  name,
  // price/salePrice giữ nguyên chữ ký để các nơi gọi không phải đổi; nhãn giảm
  // giá hiển thị trong khối giá (ProductPrice) thay vì đè lên ảnh.
  price,
  salePrice,
}: {
  src: string | null | undefined;
  name: string;
  price: number;
  salePrice?: number | null | undefined;
}) {
  const missing = !src?.trim() || src === IMG.car;
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
            sizes="(max-width: 639px) 100vw, (max-width: 960px) calc(50vw - 26px), 454px"
            className="sk-product-photo block h-auto w-full"
            fallbackContent={<ProductPlaceholder />}
          />
        </ImageZoom>
      )}
    </div>
  );
}
