/**
 * Khối hiển thị giá sản phẩm: giá niêm yết, giá khuyến mãi và giá nhập.
 * Giá nhập chỉ hiển thị với tài khoản được cấp quyền xem giá.
 */
import { formatPrice } from "@/data/catalog.repository";

type Props = {
  price: number;
  salePrice?: number | null | undefined;
  dealerPrice?: number | null | undefined;
  canViewDealerPrice?: boolean | undefined;
};

export function ProductPrice({ price, salePrice, dealerPrice, canViewDealerPrice }: Props) {
  const onSale = salePrice != null && salePrice > 0 && salePrice < price;
  const off = onSale ? Math.round(((price - salePrice) / price) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-secondary/60 p-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {onSale ? "Giá khuyến mãi" : "Giá niêm yết"}
          </p>
          <p
            className={`mt-0.5 text-2xl leading-tight font-extrabold tabular-nums ${
              onSale ? "text-gold" : "text-foreground"
            }`}
          >
            {formatPrice(onSale ? salePrice : price)}
          </p>
          {onSale ? (
            <p className="mt-0.5 text-sm font-medium text-muted-foreground line-through tabular-nums">
              {formatPrice(price)}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">Giá đã gồm VAT</p>
        </div>

        {onSale && off > 0 ? (
          <span className="shrink-0 rounded-md bg-gold px-2 py-1 text-sm font-extrabold text-gold-foreground">
            -{off}%
          </span>
        ) : null}
      </div>

      {canViewDealerPrice && dealerPrice != null ? (
        <div className="mt-2 flex items-baseline justify-between gap-2 border-t border-border pt-2">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Giá nhập
          </span>
          <span className="text-base font-bold tabular-nums text-success">
            {formatPrice(dealerPrice)}
          </span>
        </div>
      ) : null}
    </div>
  );
}
