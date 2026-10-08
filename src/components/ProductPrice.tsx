/**
 * Khối hiển thị giá sản phẩm: giá niêm yết, giá khuyến mãi và giá nhập.
 * Giá nhập chỉ hiển thị với tài khoản được cấp quyền xem giá.
 */
import { formatPrice } from "@/data/catalog.repository";
import { setDealerVatMode, useDealerVatMode } from "@/hooks/useDealerVatMode";

type Props = {
  price: number;
  salePrice?: number | null | undefined;
  dealerPrice?: number | null | undefined;
  /** Giá nhập đã gồm VAT nhập từ file Excel. */
  dealerPriceVat?: number | null | undefined;
  canViewDealerPrice?: boolean | undefined;
};

export function ProductPrice({ price, salePrice, dealerPrice, dealerPriceVat, canViewDealerPrice }: Props) {
  const vatMode = useDealerVatMode();
  const onSale = salePrice != null && salePrice > 0 && salePrice < price;
  const off = onSale ? Math.round(((price - salePrice) / price) * 100) : 0;

  return (
    <div className="rounded-lg border border-border bg-secondary/60 p-3">
      <div className="lux-price flex items-end justify-between gap-3 rounded-xl px-3 py-2.5">
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

      {canViewDealerPrice && (dealerPrice != null || dealerPriceVat != null) ? (
        <div className="mt-2 border-t border-border pt-2">
          <div
            role="radiogroup"
            aria-label="Chế độ giá nhập"
            className="mb-2 grid grid-cols-2 gap-1 rounded-md border border-border bg-background/60 p-0.5 text-[11px] font-semibold"
          >
            {(
              [
                ["excl", "Chưa VAT"],
                ["incl", "Đã gồm VAT"],
              ] as const
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={vatMode === m}
                onClick={() => setDealerVatMode(m)}
                className={`rounded px-2 py-1 transition-colors ${
                  vatMode === m
                    ? "bg-gold text-gold-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {vatMode === "incl" ? "GIÁ NHẬP ĐÃ GỒM VAT" : "GIÁ NHẬP CHƯA GỒM VAT"}
            </span>
            <span className="text-base font-bold tabular-nums text-success">
              {(vatMode === "incl" ? dealerPriceVat : dealerPrice) != null
                ? formatPrice((vatMode === "incl" ? dealerPriceVat : dealerPrice)!)
                : "Chưa có giá"}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
