import { describe, expect, test } from "bun:test";
import { withCatalogSource } from "./catalogSource";

describe("withCatalogSource", () => {
  test("thêm nguon=catalog cho sklight.vn", () => {
    expect(withCatalogSource("https://sklight.vn")).toBe("https://sklight.vn/?nguon=catalog");
    expect(withCatalogSource("https://sklight.vn/san-pham/led-s2pro")).toBe(
      "https://sklight.vn/san-pham/led-s2pro?nguon=catalog",
    );
  });

  test("áp dụng cho www.sklight.vn", () => {
    expect(withCatalogSource("https://www.sklight.vn/a")).toBe("https://www.sklight.vn/a?nguon=catalog");
  });

  test("giữ query sẵn có và #hash", () => {
    expect(withCatalogSource("https://sklight.vn/p?utm=fb#top")).toBe(
      "https://sklight.vn/p?utm=fb&nguon=catalog#top",
    );
  });

  test("không thêm trùng khi đã có nguon", () => {
    expect(withCatalogSource("https://sklight.vn/p?nguon=catalog")).toBe("https://sklight.vn/p?nguon=catalog");
    expect(withCatalogSource("https://sklight.vn/p?nguon=khac")).toBe("https://sklight.vn/p?nguon=khac");
  });

  test("không áp dụng cho catalog.sklight.vn và tên miền khác", () => {
    expect(withCatalogSource("https://catalog.sklight.vn/x")).toBe("https://catalog.sklight.vn/x");
    expect(withCatalogSource("https://notsklight.vn/x")).toBe("https://notsklight.vn/x");
    expect(withCatalogSource("https://sklight.vn.evil.com/x")).toBe("https://sklight.vn.evil.com/x");
  });

  test("URL lỗi hoặc rỗng trả về nguyên vẹn", () => {
    expect(withCatalogSource("khong-phai-url")).toBe("khong-phai-url");
    expect(withCatalogSource("")).toBe("");
    expect(withCatalogSource(null)).toBe("");
    expect(withCatalogSource(undefined)).toBe("");
  });
});
