/**
 * Một tầng bất kỳ trong "Cấu trúc cây linh hoạt": hiển thị mục con + sản phẩm của tầng đó.
 */
import { createFileRoute, notFound } from "@tanstack/react-router";
import { catalogQueryOptions } from "@/data/catalog.api";
import { PageHeader } from "@/components/PageHeader";
import { NodeLevel } from "@/components/NodeLevel";
import { getCategory } from "@/data/catalog.repository";
import type { CatalogNode } from "@/data/catalog";

const findNode = (nodes: CatalogNode[], id: string, depth = 1): { node: CatalogNode; depth: number } | undefined => {
  for (const n of nodes) {
    if (n.id === id) return { node: n, depth };
    const hit = findNode(n.children, id, depth + 1);
    if (hit) return hit;
  }
  return undefined;
};

export const Route = createFileRoute("/c/$categoryId/n/$nodeId")({
  loader: async ({ params, context }) => {
    const catalog = await context.queryClient.ensureQueryData(catalogQueryOptions);
    const category = getCategory(catalog, params.categoryId);
    if (!category) throw notFound();
    const hit = findNode(category.nodes, params.nodeId);
    if (!hit) throw notFound();
    return { category, node: hit.node, depth: hit.depth };
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
    <div className="p-6 text-center text-sm text-muted-foreground">Không tìm thấy danh mục này.</div>
  ),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-6 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  component: NodePage,
});

function NodePage() {
  const { category, node, depth } = Route.useLoaderData();

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
