import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { catalogQueryOptions } from "@/data/catalog.api";
import { PageHeader } from "@/components/PageHeader";
import { AddFab } from "@/components/admin/AddTile";
import { AddProductDialog } from "@/components/admin/AddDialogs";
import { useAdmin } from "@/hooks/useAdmin";
import { useDealerPrices } from "@/hooks/useDealerPrices";
import { SortControls } from "@/components/admin/SortControls";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { CutProductButton, PasteBar } from "@/components/admin/CutPaste";

import { EditButton, externalImage } from "@/components/admin/EditDialogs";
import { formatPrice, getSeries } from "@/data/catalog.repository";
import { ProductPrice } from "@/components/ProductPrice";
import { ProductListNote } from "@/components/ProductListNote";
import { toEmbedUrl } from "@/lib/video";
import { SmartImage } from "@/components/SmartImage";

export const Route = createFileRoute("/c/$categoryId/$seriesId")({
  loader: async ({ params, context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions);
    const found = getSeries(catalog, params.categoryId, params.seriesId);
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.series.name ?? "Đời xe";
    const title = `Phụ kiện ${name} | AutoDeco`;
    const description = `Danh sách phụ kiện, báo giá và video lắp đặt thực tế cho ${name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: SeriesPage,
});

function SeriesPage() {
  const { series } = Route.useLoaderData();
  const { isAdmin, canViewDealerPrice } = useAdmin();
  const dealerPrices = useDealerPrices(canViewDealerPrice);
  const [addOpen, setAddOpen] = useState(false);

  const products = useMemo(() => series.models.flatMap((m) => m.products), [series.models]);
  const videos = useMemo(() => series.models.flatMap((m) => m.videos), [series.models]);
  const targetModel = series.models[0];

  return (
    <div>
      <PageHeader title={series.name} />

      <div className="space-y-4 p-3 pb-32">
        {isAdmin ? (
          <PasteBar
            modelDbId={targetModel?.dbId ?? null}
            seriesDbId={series.dbId}
            targetName={series.name}
          />
        ) : null}
        {products.map((p, i) => (
          <div key={p.id} className="space-y-1">
          <div className="block overflow-hidden rounded-2xl border border-border bg-card">
            <div className="bg-secondary px-3 py-3">
              <h2 className="text-base leading-snug font-bold text-foreground">{p.name}</h2>
              {p.description ? (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{p.description}</p>
              ) : null}
            </div>
            <div className="w-full bg-muted">
              <SmartImage
                src={p.image}
                alt={p.name}
                className="block h-auto w-full object-contain"
              />
            </div>

            {p.detailUrl ? (
              <a
                href={p.detailUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 border-t border-border bg-secondary px-3 py-3 text-center text-sm font-semibold text-primary underline-offset-2 hover:underline"
              >
                Xem sản phẩm lên xe thực tế
                <ExternalLink className="size-3.5 shrink-0" />
              </a>
            ) : null}
            {toEmbedUrl(p.videoUrl) ? (
              <div className="relative aspect-video w-full border-t border-border">
                <iframe
                  src={toEmbedUrl(p.videoUrl)!}
                  title={`Video ${p.name}`}
                  loading="lazy"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            ) : null}
            <div className="px-3 py-3">
              <ProductPrice
                price={p.price}
                salePrice={p.salePrice}
                dealerPrice={dealerPrices[p.dbId] ?? p.dealerPrice}
                canViewDealerPrice={canViewDealerPrice}
              />
            </div>
            <p className="px-3 pb-3 text-xs text-muted-foreground">
              {p.installPrice ? `Công lắp đặt: ${formatPrice(p.installPrice)}` : p.priceNote}
            </p>
          </div>
          {isAdmin ? (
            <div className="flex items-center justify-end gap-1">
              <SortControls table="products" ids={products.map((x) => x.dbId)} index={i} />
              <EditButton
                kind="product"
                id={p.dbId}
                values={{
                  name: p.name,
                  description: p.description ?? "",
                  imageUrl: externalImage(p.image),
                  videoUrl: p.videoUrl ?? "",
                  detailUrl: p.detailUrl ?? "",
                  price: p.price,
                  salePrice: p.salePrice ?? null,
                  dealerPrice: p.dealerPrice ?? null,
                  brand: p.brand,
                  origin: p.origin,
                }}
              />
              <CutProductButton id={p.dbId} name={p.name} />
              <DeleteButton table="products" id={p.dbId} name={p.name} />

            </div>
          ) : null}
          </div>
        ))}

        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có sản phẩm cho {series.name}.
          </p>
        ) : null}

        {videos.length > 0 ? (
          <section className="space-y-3 pt-2">
            <h2 className="text-base font-bold text-foreground">Video lắp đặt thực tế</h2>
            {videos.map((v) => (
              <div key={v.id} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="relative aspect-video w-full">
                  <iframe
                    src={v.url}
                    title={v.title}
                    loading="lazy"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full"
                  />
                </div>
                <p className="px-3 py-2 text-sm font-medium">{v.title}</p>
              </div>
            ))}
          </section>
        ) : null}
      </div>

      <ProductListNote />

      {isAdmin ? (
        <>
          <AddFab label="Thêm sản phẩm" onClick={() => setAddOpen(true)} />
          <AddProductDialog
            open={addOpen}
            onOpenChange={setAddOpen}
            {...(targetModel ? { modelDbId: targetModel.dbId } : { seriesDbId: series.dbId })}
            modelName={series.name}
          />
        </>
      ) : null}
    </div>
  );
}
