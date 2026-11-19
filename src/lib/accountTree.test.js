import { describe, expect, test } from "bun:test";
import { buildForest, filterForest, countDescendants, pathTo } from "./accountTree";

const a = [
  { id: "admin", createdBy: null },
  { id: "d1", createdBy: "admin" },
  { id: "x", createdBy: "d1" },
  { id: "orph", createdBy: "orph" },
  { id: "p", createdBy: "q" },
  { id: "q", createdBy: "p" },
];

describe("accountTree", () => {
  test("buildForest", () => {
    const f = buildForest(a);
    const ids = f.map((n) => n.item.id);
    expect(ids).toContain("admin");
    expect(ids).toContain("orph");
    expect(f.find((n) => n.item.id === "admin").children[0].children[0].item.id).toBe("x");
    // vòng lặp vẫn xuất hiện đúng một lần
    const all = [];
    const w = (n) => (all.push(n.item.id), n.children.forEach(w));
    f.forEach(w);
    expect(all.sort()).toEqual(a.map((i) => i.id).sort());
  });
  test("filter keeps ancestors", () => {
    const f = filterForest(buildForest(a), (i) => i.id === "x");
    expect(f.length).toBe(1);
    expect(f[0].item.id).toBe("admin");
    expect(countDescendants(f[0])).toBe(2);
  });
  test("pathTo", () => {
    expect(pathTo(a, "x").map((i) => i.id)).toEqual(["admin", "d1", "x"]);
    expect(pathTo(a, "p").length).toBe(2);
  });
});
