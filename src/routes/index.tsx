import { createFileRoute, Link } from "@tanstack/react-router";

import { useState, type CSSProperties } from "react";
import { BookOpen, Car, ChevronRight } from "lucide-react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AddTile } from "@/components/admin/AddTile";
import { SortControls } from "@/components/admin/SortControls";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { EditButton, externalImage } from "@/components/admin/EditDialogs";
import { AddCategoryDialog } from "@/components/admin/AddDialogs";
import { useAdmin } from "@/hooks/useAdmin";
import { HomeBanner } from "@/components/HomeBanner";
import { HeaderMenu } from "@/components/HeaderMenu";
import { SearchBar } from "@/components/SearchBar";
import { categoriesQueryOptions } from "@/data/catalog.queries";
import { SEARCH_MIN_LENGTH, searchQueryOptions } from "@/data/search.queries";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { SmartImage } from "@/components/SmartImage";
import { PageSkeleton } from "@/components/CatalogSkeleton";
import { HOME_BANNER_KEY, settingsQueryOptions } from "@/data/settings.api";
import { imageUrl } from "@/lib/imageUrl";
import { IMG } from "@/data/images";
import { ProductPlaceholder } from "@/components/catalog/ProductPlaceholder";

export const Route = createFileRoute("/")({
  // Trang chủ chỉ cần danh sách hãng xe (không nạp sản phẩm/video/giá nhập).
  // settings đã được root loader nạp — ensureQueryData ở đây chỉ đọc lại từ
  // cache (React Query gộp request trùng key), dùng để preload ảnh banner LCP.
  loader: async ({ context }) => {
    const [, settings] = await Promise.all([
      context.queryClient.ensureQueryData(categoriesQueryOptions),
      context.queryClient.ensureQueryData(settingsQueryOptions).catch(() => null),
    ]);
    const banner = settings?.[HOME_BANNER_KEY]?.trim();
    return { bannerHref: banner ? imageUrl(banner, "preview") : null };
  },
  head: ({ loaderData }) => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      ...(loaderData?.bannerHref?.startsWith("https://")
        ? [
            { property: "og:image", content: loaderData.bannerHref },
            { name: "twitter:image", content: loaderData.bannerHref },
          ]
        : []),
      { title: "Danh mục Phụ kiện Ô tô | SK" },
      {
        name: "description",
        content:
          "Tra cứu phụ kiện ô tô theo hãng xe, đời xe và năm sản xuất: đèn trần sao, loa treble, nội thất và báo giá lắp đặt.",
      },
      { property: "og:title", content: "Danh mục Phụ kiện Ô tô | SK" },
      {
        property: "og:description",
        content: "Catalog phụ kiện ô tô phân cấp theo hãng xe, đời xe và năm sản xuất.",
      },
    ],
    // Preload ảnh banner (phần tử LCP) để trình duyệt tải NGAY từ HTML,
    // không phải chờ JS — lần mở đầu banner hiện sớm và rõ nét.
    links: loaderData?.bannerHref
      ? [{ rel: "preload", as: "image", href: loaderData.bannerHref, fetchPriority: "high" }]
      : [],
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

  return (
    <div>
      <HomeBanner />
      <div className="sk-glass sticky top-0 z-20 flex items-center gap-2 px-3 py-3">
        <div className="flex-1">
          <SearchBar value={query} onChange={setQuery} />
        </div>
        <HeaderMenu />
      </div>

      {/* Hướng dẫn sử dụng LED: đặt ngay dưới ô tìm kiếm để khách thấy ngay khi mở trang. */}
      <Link
        to="/huong-dan-su-dung"
        className="sk-edge sk-shimmer mx-3 mt-4 flex items-center gap-3 rounded-lg px-3 py-3"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-brand">
          <BookOpen className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">Hướng dẫn sử dụng LED</span>
          <span className="block truncate text-xs text-muted-foreground">
            4 bước kích hoạt, tải app và điều khiển LED nội thất
          </span>
        </span>
        <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
      </Link>

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
                  src={r.level === "product" && r.image === IMG.car ? "" : r.image}
                  alt={r.title}
                  size="thumb"
                  width={48}
                  height={48}
                  className="size-12 rounded-md bg-muted object-contain"
                  fallbackContent={
                    r.level === "product" ? (
                      <ProductPlaceholder className="size-12 shrink-0 rounded-md [&_svg]:w-10 [&_span]:hidden" />
                    ) : undefined
                  }
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
          <div className="flex items-end justify-between gap-3 px-4 pt-7 pb-3">
            <h2
              className="sk-gradient-text sk-title-sweep w-fit text-2xl font-bold"
              data-text="Danh mục Sản phẩm"
              style={{ "--sk-sweep-delay": "2.8s" } as CSSProperties}
            >
              Danh mục Sản phẩm
            </h2>
            <span className="shrink-0 pb-1 text-xs text-muted-foreground">
              {categories.length} danh mục
            </span>
          </div>

          <div className="grid grid-cols-2 items-start gap-4 px-3 py-4 sm:grid-cols-3 lg:grid-cols-4">
            {categories.map((c, tileIndex) => (
              <div key={c.id} className="sk-reveal flex flex-col items-center gap-1">
                <Link
                  to="/c/$categoryId"
                  params={{ categoryId: c.id }}
                  className="flex w-full flex-col items-center gap-1.5"
                >
                  <span className="sk-edge sk-brand-tile sk-shimmer flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg text-brand">
                    {c.image && /^https?:\/\//.test(c.image) ? (
                      <SmartImage
                        src={c.image}
                        alt={c.name}
                        size="thumb"
                        sizes="(max-width: 639px) 50vw, (max-width: 1023px) 33vw, 240px"
                        // 2 hàng đầu nằm trong viewport ngay khi mở trang → tải sớm cho rõ nét
                        eager={tileIndex < 4}
                        fallbackContent={<Car className="size-12 text-brand" />}
                        className="size-full object-contain p-6"
                      />
                    ) : (
                      <Car className="size-12" />
                    )}
                  </span>
                  <span className="line-clamp-2 h-10 pt-1 text-center text-sm leading-5 font-semibold text-foreground">
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
