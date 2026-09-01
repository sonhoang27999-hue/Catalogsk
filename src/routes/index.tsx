import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
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
import { categoriesQueryOptions } from "@/data/catalog.queries";
import { SEARCH_MIN_LENGTH, searchQueryOptions } from "@/data/search.queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { SmartImage } from "@/components/SmartImage";
import { PageSkeleton } from "@/components/CatalogSkeleton";

export const Route = createFileRoute("/")({
  // Trang chủ chỉ cần danh sách hãng xe (không nạp sản phẩm/video/giá nhập).
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions),
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
  pendingComponent: PageSkeleton,
});

function Home() {
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions);
  const [query, setQuery] = useState("");
  const { canManage: isAdmin } = useAdmin();
  const [addOpen, setAddOpen] = useState(false);

  // Tìm kiếm chạy ở database: chờ 300ms sau khi ngừng gõ, tối thiểu 2 ký tự.
  // React Query tự huỷ/bỏ qua kết quả cũ theo query key nên không hiện dữ liệu lỗi thời.
  const debouncedQuery = useDebouncedValue(query, 300);
  const { data: searchData, isFetching: isSearching } = useQuery(
    searchQueryOptions(debouncedQuery),
  );
  const results = query.trim() === debouncedQuery.trim() ? (searchData ?? []) : [];
  const tooShort = query.trim().length > 0 && query.trim().length < SEARCH_MIN_LENGTH;

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
            {tooShort ? "Nhập ít nhất 2 ký tự" : `${results.length} kết quả`} cho “{query}”
          </h2>
          <div className="space-y-2">
            {results.map((r) => (
              <Link
                key={r.id}
                to={
                  r.params.seriesId
                    ? "/c/$categoryId/$seriesId"
                    : r.params.nodeId
                      ? "/c/$categoryId/n/$nodeId"
                      : "/c/$categoryId"
                }
                params={{
                  categoryId: r.params.categoryId,
                  seriesId: r.params.seriesId,
                  nodeId: r.params.nodeId,
                }}
                className="flex items-center gap-3 rounded-md border border-border bg-card p-2"
              >
                <SmartImage
                  src={r.image}
                  alt={r.title}
                  size="thumb"
                  width={48}
                  height={48}
                  className="size-12 rounded-md bg-muted object-contain"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{r.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{r.subtitle}</span>
                </span>
              </Link>
            ))}
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {tooShort
                  ? "Nhập ít nhất 2 ký tự để tìm kiếm."
                  : isSearching
                    ? "Đang tìm..."
                    : "Không tìm thấy kết quả phù hợp."}
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
                      <SmartImage
                        src={c.image}
                        alt={c.name}
                        size="thumb"
                        sizes="25vw"
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
