import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AddTile } from "@/components/admin/AddTile";
import { SortControls } from "@/components/admin/SortControls";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { EditButton, externalImage } from "@/components/admin/EditDialogs";
import { AddCategoryDialog } from "@/components/admin/AddDialogs";
import { useAdmin } from "@/hooks/useAdmin";
import { CategoryIcon } from "@/components/CategoryIcon";
import { HomeBanner } from "@/components/HomeBanner";
import { HeaderMenu } from "@/components/HeaderMenu";
import { SearchBar } from "@/components/SearchBar";
import { catalogQueryOptions } from "@/data/catalog.api";
import { searchCatalog } from "@/data/catalog.repository";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions),
  head: () => ({
    meta: [
      { title: "Danh mục Phụ kiện Ô tô | AutoDeco" },
      {
        name: "description",
        content:
          "Tra cứu phụ kiện ô tô theo hãng xe, đời xe và năm sản xuất: đèn trần sao, loa treble, nội thất và báo giá lắp đặt.",
      },
      { property: "og:title", content: "Danh mục Phụ kiện Ô tô | AutoDeco" },
      {
        property: "og:description",
        content: "Catalog phụ kiện ô tô phân cấp theo hãng xe, đời xe và năm sản xuất.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const categories = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const { isAdmin } = useAdmin();
  const [addOpen, setAddOpen] = useState(false);

  const results = useMemo(() => searchCatalog(categories, query), [categories, query]);
  const filtered = categories;

  return (
    <div>
      <HomeBanner />


      <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-card/95 px-3 py-2 backdrop-blur">
        <div className="flex-1">
          <SearchBar value={query} onChange={setQuery} />
        </div>
        <HeaderMenu />
      </div>

      {query ? (
        <section className="p-3">
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground">
            {results.length} kết quả cho “{query}”
          </h2>
          <div className="space-y-2">
            {results.map((r) => (
              <Link
                key={r.id}
                to={
                  r.params.seriesId ? "/c/$categoryId/$seriesId" : "/c/$categoryId"
                }
                params={{ categoryId: r.params.categoryId, seriesId: r.params.seriesId }}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
              >
                <img
                  src={r.image}
                  alt={r.title}
                  loading="lazy"
                  decoding="async"
                  className="size-12 rounded-md bg-muted object-contain"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {r.subtitle}
                  </span>
                </span>
              </Link>
            ))}
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Không tìm thấy kết quả phù hợp.
              </p>
            ) : null}
          </div>
        </section>
      ) : (
        <>
          <div className="bg-secondary px-4 py-3">
            <h1 className="text-base font-bold tracking-wide uppercase">Danh mục Sản phẩm</h1>
          </div>


          <div className="grid grid-cols-4 items-start gap-x-2 gap-y-4 px-3 py-4">
            {filtered.map((c) => (
              <div key={c.id} className="flex flex-col items-center gap-1">
                <Link
                  to="/c/$categoryId"
                  params={{ categoryId: c.id }}
                  className="flex w-full flex-col items-center gap-1.5"
                >
                  <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-card text-brand transition-colors hover:border-gold active:border-gold focus-visible:border-gold">
                    {c.image && /^https?:\/\//.test(c.image) ? (
                      <img
                        src={c.image}
                        alt={c.name}
                        loading="lazy"
                        decoding="async"
                        className="size-full object-contain p-1"
                      />
                    ) : (
                      <CategoryIcon name={c.icon} className="size-7" />
                    )}
                  </span>
                  <span className="line-clamp-2 h-8 text-center text-xs leading-4 font-semibold text-foreground">
                    {c.name}
                  </span>
                </Link>
                {isAdmin ? (
                  <div className="flex items-center justify-center gap-1">
                    <SortControls
                      table="categories"
                      ids={categories.map((x) => x.dbId)}
                      index={categories.findIndex((x) => x.id === c.id)}
                    />
                    <EditButton
                      kind="category"
                      id={c.dbId}
                      values={{
                        name: c.name,
                        icon: c.icon,
                        imageUrl: externalImage(c.image),
                        layout: c.layout,
                      }}
                    />
                    <DeleteButton table="categories" id={c.dbId} name={c.name} warnChildren />
                  </div>
                ) : null}
              </div>
            ))}
            {isAdmin ? <AddTile label="Thêm Hãng Xe" onClick={() => setAddOpen(true)} /> : null}
          </div>

          {isAdmin ? <AddCategoryDialog open={addOpen} onOpenChange={setAddOpen} /> : null}
        </>
      )}
    </div>
  );
}
