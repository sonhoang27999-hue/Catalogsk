/**
 * Một tầng bất kỳ trong "Cấu trúc cây linh hoạt": hiển thị mục con + sản phẩm của tầng đó.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PageSkeleton } from "@/components/CatalogSkeleton";
import { nodeQueryOptions } from "@/data/catalog.queries";
import { PageHeader } from "@/components/PageHeader";
import { NodeLevel } from "@/components/NodeLevel";

export const Route = createFileRoute("/c/$categoryId/n/$nodeId")({
  // Chỉ nạp cây danh mục của hãng + sản phẩm của đúng tầng đang xem.
  loader: async ({ params, context }) => {
    const found = await context.queryClient.ensureQueryData(
      nodeQueryOptions(params.categoryId, params.nodeId),
    );
    if (!found) throw notFound();
    return found;
  },
  head: ({ loaderData }) => {
    const name = loaderData?.node.name ?? "Danh mục";
    const title = `${name} | AutoDeco`;
    const description = `Danh mục con và sản phẩm phụ kiện ô tô thuộc ${name}.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="p-6 text-center text-sm text-muted-foreground">
      Không tìm thấy danh mục này.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  component: NodePage,
  pendingComponent: PageSkeleton,
});

function NodePage() {
  const params = Route.useParams();
  const { data } = useSuspenseQuery(nodeQueryOptions(params.categoryId, params.nodeId));
  const loaderData = Route.useLoaderData();
  const { category, node, depth } = data ?? loaderData;

  return (
    <div>
      <PageHeader title={node.name} />
      <NodeLevel
        categoryId={category.id}
        categoryDbId={category.dbId}
        parentNodeId={node.id}
        parentName={node.name}
        childLabel={`tầng ${depth + 2}`}
        nodes={node.children}
        products={node.products}
      />
    </div>
  );
}
