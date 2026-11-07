import { describe, expect, test } from "bun:test";
import { recentSearches, rememberSearch, searchTextParts } from "./catalogSearch";
describe("public recent search rules", () => {
  test("retains at most five valid unique searches", () => {
    expect(recentSearches(["a", " Toyota ", "toyota", "Camry", "Kia", "Mazda", "Ford", "Honda", null])).toEqual(["Toyota", "Camry", "Kia", "Mazda", "Ford"]);
  });
  test("Enter/selection cannot remember fewer than two characters", () => {
    expect(rememberSearch(["Camry"], " x ")).toEqual(["Camry"]);
    expect(rememberSearch(["Camry", "Toyota"], "toyota")).toEqual(["toyota", "Camry"]);
  });
  test("matches Vietnamese accents and case without altering original text", () => {
    expect(searchTextParts("Đèn CAMRY và đèn", "den").filter(p => p.match).map(p => p.text)).toEqual(["Đèn", "đèn"]);
    expect(searchTextParts("Corolla Cross", "cross")).toEqual([{text:"Corolla ",match:false},{text:"Cross",match:true}]);
  });
});