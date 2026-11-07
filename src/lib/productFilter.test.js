// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #305 (MIT, © 2026 Seokwoooo)
import { expect, test } from 'bun:test';
import { effectiveProductPrice, isProductOnSale, buildProductFacets, canShowProductFilter, applyProductFilters, countFilteredProducts, emptyProductFilters, activeProductFilterCount, productPriceStep } from './productFilter';
const item = (price=100, brand='A', origin='Việt Nam', salePrice=null) => ({price,brand,origin,salePrice});
test('effective price uses sale only strictly positive and below list price', () => {
  expect(effectiveProductPrice(item(100,'A','VN',60))).toBe(60);
  for (const invalid of [null,0,-1,100,101,NaN,Infinity]) {
    expect(effectiveProductPrice(item(100,'A','VN',invalid))).toBe(100);
    expect(isProductOnSale(item(100,'A','VN',invalid))).toBe(false);
  }
});
test('filter is absent under six products', () => {
  expect(canShowProductFilter([item(100),...Array(4).fill(item(200))],false)).toBe(false);
  expect(canShowProductFilter([item(100),...Array(5).fill(item(200))],false)).toBe(true);
});
test('staff never gets filter even with varied six products', () => { expect(canShowProductFilter([item(100),...Array(5).fill(item(200))],true)).toBe(false); });
test('no variation means no filter; empty strings do not create facets', () => {
  const products=Array(6).fill(item(100,'  ',' '));
  expect(canShowProductFilter(products,false)).toBe(false);
  expect(buildProductFacets(products).brands).toEqual([]);
});
test('each meaningful public facet independently allows filter', () => {
  for (const alternate of [item(200),item(100,'B'),item(100,'A','Nhật Bản'),item(150,'A','Việt Nam',100)]) {
    expect(canShowProductFilter([...Array(5).fill(item()),alternate],false)).toBe(true);
  }
});
test('facets trim, deduplicate and use effective price and mixed sale status', () => {
  const facets=buildProductFacets([item(100,' A ','VN'),item(200,'A','JP',50),item(100,'B','')]);
  expect(facets.brands).toEqual(['A','B']);expect(facets.origins).toEqual(['JP','VN']);
  expect([facets.min,facets.max]).toEqual([50,100]);expect(facets.saleMeaningful).toBe(true);
  expect(buildProductFacets([item(100,'A','VN',50)]).saleMeaningful).toBe(false);
});
test('ranges include endpoints; OR inside facet and AND between facets', () => {
  const products=[item(100,'A','VN'),item(200,'B','JP',100),item(100,'C','VN'),item(100,'B','VN',50)];
  const filters={price:[50,100],brands:['A','B'],origins:['VN'],onSale:false};
  expect(applyProductFilters(products,filters)).toEqual([products[0],products[3]]);
  expect(countFilteredProducts(products,{...filters,onSale:true})).toBe(1);
  expect(countFilteredProducts(products,{...filters,origins:['FR']})).toBe(0);
});
test('empty filters preserve order and objects, never read dealer fields', () => {
  const product={...item(),get dealerPrice(){throw new Error('private field read');}};
  const products=[product,item(50)];
  expect(applyProductFilters(products,emptyProductFilters())).toEqual(products);
  expect(buildProductFacets(products).min).toBe(50);
});
test('active count and reset count include each removable criterion', () => {
  expect(activeProductFilterCount({price:[1,2],brands:['A','B'],origins:['VN'],onSale:true})).toBe(5);
  expect(activeProductFilterCount(emptyProductFilters())).toBe(0);
});
test('round price step stays reasonable for wide and narrow ranges', () => {
  expect(productPriceStep(0,10000000)).toBe(100000);
  expect(productPriceStep(0,250000)).toBe(5000);
  expect(productPriceStep(100,101)).toBe(1);
});
test('price edits can leave an applied filter empty without silently resetting it', () => {
  const filters={...emptyProductFilters(),price:[50,100]};
  expect(countFilteredProducts([item(80)],filters)).toBe(1);
  expect(countFilteredProducts([item(180)],filters)).toBe(0);
});