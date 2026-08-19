import { createFileRoute, Link, notFound, Outlet, useChildMatches } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { SearchBar } from "@/components/SearchBar";
import { catalogQueryOptions } from "@/data/catalog.api";
import { getCategory, normalize } from "@/data/catalog.repository";
import { AddTile } from "@/components/admin/AddTile";
import { SortControls } from "@/components/admin/SortControls";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { EditButton, externalImage } from "@/components/admin/EditDialogs";
import { AddSeriesDialog } from "@/components/admin/AddDialogs";
import { useAdmin } from "@/hooks/useAdmin";
import { NodeLevel } from "@/components/NodeLevel";

export const Route = createFileRoute("/c/$categoryId")({
  loader: async ({ params, context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions);
    const category = getCategory(catalog, params.categoryId);
    if (!category) throw notFound();
    return { category };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.category.name ?? "Danh mục";
    const title = `Đời xe ${name} | AutoDeco`;
    const description = `Danh sách đời xe ${name} và phụ kiện tương thích theo từng form xe.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  component: CategoryPage,
});

function CategoryPage() {
  const { category } = Route.useLoaderData();
  const childMatches = useChildMatches();
  const [query, setQuery] = useState("");
  const { isAdmin } = useAdmin();
  const [addOpen, setAddOpen] = useState(false);

  const series = useMemo(
    () => category.series.filter((s) => normalize(s.name).includes(normalize(query))),
    [category.series, query],
  );

  if (childMatches.length > 0) {
    return <Outlet />;
  }

  // Cấu trúc cây linh hoạt: mỗi tầng vừa có mục con vừa có sản phẩm riêng.
  if (category.layout === "tree") {
    return (
      <div>
        <PageHeader title={category.name} />
        <NodeLevel
          categoryId={category.id}
          categoryDbId={category.dbId}
          parentNodeId={null}
          parentName={category.name}
          childLabel="tầng 2"
          nodes={category.nodes}
          products={category.rootProducts}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title={`Đời xe ${category.name}`} />
      <div className="px-3 pt-3">
        <SearchBar value={query} onChange={setQuery} placeholder={`Tìm đời xe ${category.name}...`} />
      </div>
      <div className="grid grid-cols-3 gap-3 p-3">
        {series.map((s) => (
          <div key={s.id} className="flex flex-col gap-1">
          <Link
            to="/c/$categoryId/$seriesId"
            params={{ categoryId: category.id, seriesId: s.id }}
            className="overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-gold active:border-gold focus-visible:border-gold"
          >
            <img
              src={s.image}
              alt={s.name}
              loading="lazy"
              decoding="async"
              className="aspect-square w-full rounded-t-lg object-cover"
            />
            <p className="px-1 py-2 text-center text-[11px] leading-tight font-medium text-foreground">
              {s.name}
            </p>
          </Link>
          {isAdmin ? (
            <div className="flex items-center justify-center gap-1">
              <SortControls
                table="series"
                ids={category.series.map((x) => x.dbId)}
                index={category.series.findIndex((x) => x.id === s.id)}
              />
              <EditButton
                kind="series"
                id={s.dbId}
                values={{ name: s.name, imageUrl: externalImage(s.image) }}
              />
              <DeleteButton table="series" id={s.dbId} name={s.name} warnChildren />
            </div>
          ) : null}
          </div>
        ))}
        {isAdmin ? <AddTile label="Thêm Đời Xe" onClick={() => setAddOpen(true)} /> : null}
        {series.length === 0 && !isAdmin ? (
          <p className="col-span-3 py-8 text-center text-sm text-muted-foreground">
            Không có đời xe phù hợp.
          </p>
        ) : null}
      </div>
      {isAdmin ? (
        <AddSeriesDialog
          open={addOpen}
          onOpenChange={setAddOpen}
          categoryDbId={category.dbId}
          categoryName={category.name}
        />
      ) : null}
    </div>
  );
}
