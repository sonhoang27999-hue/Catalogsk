// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #336 (MIT, © 2026 Seokwoooo)
import type { CatalogNode } from '@/data/catalog';

export function pickerNodes(roots: CatalogNode[], path: CatalogNode[]) {
  return path.length ? path[path.length - 1]?.children ?? [] : roots;
}
export function pickerBreadcrumb(brand: string | undefined, path: CatalogNode[]) {
  return ['Hãng', ...(brand ? [brand] : ['Dòng xe']), ...path.map(node => node.name)];
}
export function pickerNodeStep(path: CatalogNode[], node: CatalogNode) {
  return node.children.length ? { path: [...path, node], destination: null } : { path, destination: node.id };
}