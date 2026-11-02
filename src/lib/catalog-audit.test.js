import { describe, expect, mock, test } from "bun:test";

const product = {
  id: "node-product", name: "LED S2", brand: "SK", form_code: "S2",
  image_key: null, image_url: null, node_id: "node-1", categories: null,
  models: null, nodes: { categories: { slug: "honda" } },
};
let productSelect = "";
mock.module("@/integrations/supabase/client", () => ({
  supabase: {
    from(table) {
      const chain = {
        select(value) { if (table === "products") productSelect = value; return chain; },
        ilike() { return chain; }, or() { return chain; }, order() { return chain; },
        limit() { return chain; },
        returns() { return Promise.resolve({ data: table === "products" ? [product] : [], error: null }); },
      };
      return chain;
    },
  },
}));

const { themeDraftPayload, generatePalette, contrast } = await import("./themeEngine");
const { searchCatalogServer } = await import("../data/search.queries");

describe("theme regressions", () => {
  test("effect-only edits never write unrelated palette values", () => {
    expect(themeDraftPayload({ theme_fx_speed: "slow" })).toEqual({ theme_fx_speed: "slow" });
  });
  test("theme writes exclude unrelated site settings", () => {
    expect(themeDraftPayload({ home_banner_url: "unexpected", theme_mode: "dark" })).toEqual({ theme_mode: "dark" });
  });
  test("explicit empty theme values remain clearable", () => {
    expect(themeDraftPayload({ theme_title_gradient: "" })).toEqual({ theme_title_gradient: "" });
  });
  test("generated palettes keep ordinary text above WCAG AA", () => {
    for (const mode of ["dark", "light"]) {
      const palette = generatePalette("#3f6fd8", mode, 20);
      expect(contrast(palette["theme_foreground"] ?? "", palette["theme_card"] ?? "")).toBeGreaterThanOrEqual(4.5);
      expect(contrast(palette["theme_muted_foreground"] ?? "", palette["theme_card"] ?? "")).toBeGreaterThanOrEqual(4.5);
    }
  });
});

test("node-only products are searchable with their containing category and node", async () => {
  const results = await searchCatalogServer("LED");
  expect(productSelect).toContain("nodes(categories(slug))");
  expect(results).toHaveLength(1);
  expect(results[0]?.params).toEqual({ categoryId: "honda", nodeId: "node-1", productId: "node-product" });
});