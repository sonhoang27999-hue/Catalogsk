/**
 * Giao diện dùng chung cho "Cấu trúc cây linh hoạt":
 * mỗi tầng hiển thị các mục con (lưới) + danh sách sản phẩm của chính tầng đó,
 * kèm 2 nút [+] cho admin: thêm mục con và thêm sản phẩm.
 */
import { useMemo, useRef, useState } from "react";
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
import { ProductActions } from "@/components/catalog/WorkflowProvider";
import { ProductMedia } from "@/components/catalog/ProductMedia";
import { ImmersiveSection } from "@/components/immersive/ImmersiveSection";
import { ExpandableText } from "@/components/catalog/ExpandableText";
import { ProductJumpNav } from "@/components/catalog/ProductJumpNav";
import { canShowProductJump } from "@/lib/productJump";
import { ProductFilter } from "@/components/catalog/ProductFilter";
import { Button } from "@/components/ui/button";
import { activeProductFilterCount, applyProductFilters, buildProductFacets, canShowProductFilter, emptyProductFilters, type ProductFilters } from "@/lib/productFilter";

export function NodeLevel(props: NodeLevelProps) {
  return <NodeLevelContent key={`${props.categoryId}:${props.parentNodeId ?? 'root'}`} {...props} />;
}

type NodeLevelProps = {
  categoryId: string; categoryDbId: string; parentNodeId: string | null; parentName: string; childLabel: string; nodes: CatalogNode[]; products: Product[];
};

function NodeLevelContent({
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
  const { canManage: isAdmin, canViewDealerPrice } = useAdmin();
  const dealerPrices = useDealerPrices(
    canViewDealerPrice,
    products.map((p) => p.dbId),
  );
  const dealerPricesVat = useDealerPrices(
    canViewDealerPrice,
    products.map((p) => p.dbId),
    "vat",
  );
  const [nodeOpen, setNodeOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<ProductFilters>(emptyProductFilters);
  const facets = useMemo(() => buildProductFacets(products), [products]);
  const filtering = !isAdmin && activeProductFilterCount(filters) > 0;
  const visibleProducts = useMemo(() => filtering ? applyProductFilters(products, filters) : products, [products,filters,filtering]);
  const showFilter = canShowProductFilter(products, isAdmin, facets);
  const showJump = canShowProductJump(visibleProducts.length, isAdmin);
  const applyFilters = (next: ProductFilters) => {
    setFilters(next);
    // Schedule after commit; never scroll if the list is already on screen.
    requestAnimationFrame(() => {
      const list = listRef.current;
      if (list && list.getBoundingClientRect().top < 0) list.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    });
  };

  return (
    <div className="pb-8">
      {showJump ? <ProductJumpNav products={visibleProducts} listRef={listRef} /> : null}
      {products.length > 0 ? (
        <p className="px-3 text-center text-xs text-muted-foreground">
          Giá niêm yết đã gồm VAT
        </p>
      ) : null}
      {isAdmin ? (
        <div className="pt-3">
          <PasteBar nodeDbId={parentNodeId} categoryDbId={categoryDbId} targetName={parentName} />
        </div>
      ) : null}
      {nodes.length > 0 || isAdmin ? (
        <div className="grid grid-cols-2 gap-4 p-3 sm:grid-cols-3 lg:grid-cols-4">
          {nodes.map((n, i) => (
            <div key={n.id} className="flex flex-col gap-1">
              <Link
                to="/c/$categoryId/n/$nodeId"
                params={{ categoryId, nodeId: n.id }}
                className="sk-edge sk-shimmer overflow-hidden rounded-lg"
              >
                <span className="sk-loading-frame relative block aspect-square overflow-hidden">
                <SmartImage
                  src={n.image}
                  alt={n.name}
                  size="thumb"
                  sizes="33vw"
                  className="aspect-square w-full rounded-t-lg object-contain p-2"
                />
                <span aria-hidden="true" className="sk-loading-sweep" />
                </span>
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

      {showFilter ? <ProductFilter products={products} facets={facets} applied={filters} shown={visibleProducts.length} onApply={applyFilters} /> : null}
      <div ref={listRef} className={`sk-product-list sk-filter-list space-y-6 px-3 pb-3${filtering ? ' sk-filtered-list' : ''}`}>
        {visibleProducts.map((p, i) => (
          <div key={p.id} data-jump-product={p.id} className={`sk-reveal space-y-2${showJump ? ' sk-jump-target' : ''}`}>
            <div className="sk-edge sk-product-card block overflow-hidden rounded-lg">
              <div className="bg-secondary px-3 py-3">
                <h2 className="text-xl leading-snug font-bold text-foreground">{p.name}</h2>
                {p.description ? (
                  <ExpandableText className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {p.description}
                  </ExpandableText>
                ) : null}
              </div>
              <ProductActions id={p.dbId} name={p.name} />
              <ProductMedia src={p.image} name={p.name} price={p.price} salePrice={p.salePrice} />

              {p.detailUrl ? (
                <a
                  href={p.detailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sk-shimmer block lux-cta px-3 py-3 text-center text-sm font-semibold"
                >
                  Xem sản phẩm hoàn thiện lên xe
                </a>
              ) : null}
              {toEmbedUrl(p.videoUrl) ? (
                <LazyEmbed
                  src={toEmbedUrl(p.videoUrl) ?? ""}
                  title={`Video ${p.name}`}
                  className="border-t border-border"
                />
              ) : null}
              <div className="px-3 py-3">
                <ProductPrice
                  price={p.price}
                  salePrice={p.salePrice}
                  dealerPrice={dealerPrices[p.dbId] ?? p.dealerPrice}
                  dealerPriceVat={dealerPricesVat[p.dbId] ?? null}
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
                    dealerPrice: dealerPrices[p.dbId] ?? p.dealerPrice ?? null,
                    dealerPriceVat: dealerPricesVat[p.dbId] ?? null,
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

        {filtering && visibleProducts.length === 0 ? <div className="py-8 text-center"><p className="text-sm text-muted-foreground">Không có sản phẩm phù hợp với bộ lọc</p><Button variant="secondary" className="mt-3 min-h-11" onClick={() => applyFilters(emptyProductFilters())}>Xoá lọc</Button></div> : null}

        {products.length === 0 && nodes.length === 0 && !isAdmin ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có nội dung trong {parentName}.
          </p>
        ) : null}
      </div>

      {parentNodeId ? (
        <ImmersiveSection
          scope={{ nodeId: parentNodeId }}
          targetName={parentName}
          products={products.map((p) => ({ dbId: p.dbId, name: p.name }))}
        />
      ) : null}

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
