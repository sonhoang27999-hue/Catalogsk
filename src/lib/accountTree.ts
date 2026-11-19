/**
 * Dựng cây tài khoản theo người tạo (account_owners.created_by).
 * Tài khoản không có người tạo trong danh sách (hoặc tự tạo chính mình) là gốc.
 */
export type TreeItem = { id: string; createdBy: string | null };

export type TreeNode<T extends TreeItem> = { item: T; children: TreeNode<T>[] };

export function buildForest<T extends TreeItem>(items: T[]): TreeNode<T>[] {
  const nodes = new Map<string, TreeNode<T>>(items.map((i) => [i.id, { item: i, children: [] }]));
  const roots: TreeNode<T>[] = [];
  for (const n of nodes.values()) {
    const parent = n.item.createdBy;
    const p = parent && parent !== n.item.id ? nodes.get(parent) : undefined;
    if (p) p.children.push(n);
    else roots.push(n);
  }
  // Phòng vòng lặp (A tạo B, B tạo A): nút không tới được từ gốc nào thì coi là gốc.
  const seen = new Set<string>();
  const walk = (n: TreeNode<T>) => {
    if (seen.has(n.item.id)) return;
    seen.add(n.item.id);
    n.children.forEach(walk);
  };
  roots.forEach(walk);
  for (const n of nodes.values()) {
    if (!seen.has(n.item.id)) {
      // Cắt cạnh khỏi cha để cây không còn vòng.
      const parent = n.item.createdBy ? nodes.get(n.item.createdBy) : undefined;
      if (parent) parent.children = parent.children.filter((c) => c !== n);
      roots.push(n);
      walk(n);
    }
  }
  return roots;
}

/** Giữ lại nút khớp điều kiện cùng toàn bộ tổ tiên của nó. */
export function filterForest<T extends TreeItem>(
  forest: TreeNode<T>[],
  match: (item: T) => boolean,
): TreeNode<T>[] {
  const out: TreeNode<T>[] = [];
  for (const n of forest) {
    const kids = filterForest(n.children, match);
    if (match(n.item) || kids.length > 0) out.push({ item: n.item, children: kids });
  }
  return out;
}

export function countDescendants<T extends TreeItem>(n: TreeNode<T>): number {
  return n.children.reduce((s, c) => s + 1 + countDescendants(c), 0);
}

/** Đường đi từ gốc tới tài khoản, vd [admin, asiacar, test1]. */
export function pathTo<T extends TreeItem>(items: T[], id: string): T[] {
  const by = new Map(items.map((i) => [i.id, i]));
  const path: T[] = [];
  const guard = new Set<string>();
  let cur = by.get(id);
  while (cur && !guard.has(cur.id)) {
    guard.add(cur.id);
    path.unshift(cur);
    cur = cur.createdBy ? by.get(cur.createdBy) : undefined;
  }
  return path;
}
