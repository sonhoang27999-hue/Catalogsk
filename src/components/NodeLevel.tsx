/**
 * Giao diện dùng chung cho "Cấu trúc cây linh hoạt":
 * mỗi tầng hiển thị các mục con (lưới) + danh sách sản phẩm của chính tầng đó,
 * kèm 2 nút [+] cho admin: thêm mục con và thêm sản phẩm.
 */
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import type { CatalogNode, Product } from "@/data/catalog";
import { AddFab, AddTile } from "@/components/admin/AddTile";
import { AddNodeDialog, AddProductDialog } from "@/components/admin/AddDialogs";
import { SortControls } from "@/components/admin/SortControls";
import { ProductPrice } from "@/components/ProductPrice";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { EditButton, externalImage } from "@/components/admin/EditDialogs";
import { ProductListNote } from "@/components/ProductListNote";
import { CutProductButton, PasteBar } from "@/components/admin/CutPaste";

import { useAdmin } from "@/hooks/useAdmin";
import { useDealerPrices } from "@/hooks/useDealerPrices";
import { toEmbedUrl } from "@/lib/video";
import { LazyEmbed } from "@/components/LazyEmbed";
import { SmartImage } from "@/components/SmartImage";
import { ImageZoom } from "@/components/ImageZoom";

export function NodeLevel({
  categoryId,
  categoryDbId,
  parentNodeId,
  parentName,
  childLabel,
  nodes,
  products,
}: {
  /** slug của hãng xe, dùng cho đường dẫn. */
  categoryId: string;
  categoryDbId: string;
  /** null nếu đang ở tầng gốc của hãng xe. */
  parentNodeId: string | null;
  parentName: string;
  childLabel: string;
  nodes: CatalogNode[];
  products: Product[];
}) {
  const { isAdmin, canViewDealerPrice } = useAdmin();
  const dealerPrices = useDealerPrices(
    canViewDealerPrice,
    products.map((p) => p.dbId),
  );
  const [nodeOpen, setNodeOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);

  return (
    <div className="pb-32">
      {isAdmin ? (
        <div className="pt-3">
          <PasteBar nodeDbId={parentNodeId} categoryDbId={categoryDbId} targetName={parentName} />
        </div>
      ) : null}
      {nodes.length > 0 || isAdmin ? (
        <div className="grid grid-cols-3 gap-3 p-3">
          {nodes.map((n, i) => (
            <div key={n.id} className="flex flex-col gap-1">
              <Link
                to="/c/$categoryId/n/$nodeId"
                params={{ categoryId, nodeId: n.id }}
                className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-gold active:border-gold focus-visible:border-gold"
              >
                <SmartImage
                  src={n.image}
                  alt={n.name}
                  size="thumb"
                  sizes="33vw"
                  className="aspect-square w-full rounded-t-lg object-cover"
                />
                <p className="px-1 py-2 text-center text-xs leading-snug font-semibold text-foreground">
                  {n.name}
                </p>
              </Link>
              {isAdmin ? (
                <div className="flex items-center justify-center gap-1">
                  <SortControls table="nodes" ids={nodes.map((x) => x.id)} index={i} />
                  <EditButton
                    kind="node"
                    id={n.id}
                    values={{ name: n.name, imageUrl: externalImage(n.image) }}
                  />
                  <DeleteButton table="nodes" id={n.id} name={n.name} warnChildren />
                </div>
              ) : null}
            </div>
          ))}
          {isAdmin ? (
            <AddTile label={`Thêm ${childLabel}`} onClick={() => setNodeOpen(true)} />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4 pb-3">
        {products.map((p, i) => (
          <div key={p.id} className="space-y-1">
            <div className="block overflow-hidden border-y border-border bg-card">
              <div className="bg-secondary px-3 py-3">
                <h2 className="text-base leading-snug font-bold text-foreground">{p.name}</h2>
                {p.description ? (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {p.description}
                  </p>
                ) : null}
              </div>
              <div className="w-full bg-muted">
                <ImageZoom src={p.image} alt={p.name}>
                  <SmartImage
                    src={p.image}
                    alt={p.name}
                    size="preview"
                    sizes="(max-width: 480px) 100vw, 480px"
                    className="block h-auto w-full object-contain"
                  />
                </ImageZoom>
              </div>
              {p.detailUrl ? (
                <a
                  href={p.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block border-t border-border bg-secondary px-3 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-gold hover:text-gold-foreground"
                >
                  Xem sản phẩm hoàn thiện lên xe
                </a>
              ) : null}
              {toEmbedUrl(p.videoUrl) ? (
                <LazyEmbed
                  src={toEmbedUrl(p.videoUrl)!}
                  title={`Video ${p.name}`}
                  className="border-t border-border"
                />
              ) : null}
              <div className="px-3 py-3">
                <ProductPrice
                  price={p.price}
                  salePrice={p.salePrice}
                  dealerPrice={dealerPrices[p.dbId] ?? p.dealerPrice}
                  canViewDealerPrice={canViewDealerPrice}
                />
              </div>
            </div>
            {isAdmin ? (
              <div className="flex items-center justify-end gap-1 px-3">
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

        {products.length === 0 && nodes.length === 0 && !isAdmin ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có nội dung trong {parentName}.
          </p>
        ) : null}
      </div>

      <ProductListNote />

      {isAdmin ? (
        <>
          <AddFab label="Thêm sản phẩm" onClick={() => setProductOpen(true)} />
          <AddNodeDialog
            open={nodeOpen}
            onOpenChange={setNodeOpen}
            categoryDbId={categoryDbId}
            parentNodeId={parentNodeId}
            parentName={parentName}
            levelLabel={childLabel}
          />
          <AddProductDialog
            open={productOpen}
            onOpenChange={setProductOpen}
            {...(parentNodeId ? { nodeDbId: parentNodeId } : { categoryDbId })}
            modelName={parentName}
          />
        </>
      ) : null}
    </div>
  );
}
