// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #305 (MIT, © 2026 Seokwoooo)
import type { Product } from '@/data/catalog';

// Narrow public projection: no dealer prices or internal identifiers are read here.
export type FilterProduct = Pick<Product, 'price' | 'salePrice' | 'brand' | 'origin'>;
export type ProductFilters = { price: [number, number] | null; brands: string[]; origins: string[]; onSale: boolean };
export type ProductFacets = { min: number; max: number; brands: string[]; origins: string[]; priceMeaningful: boolean; saleMeaningful: boolean };
export const emptyProductFilters = (): ProductFilters => ({ price: null, brands: [], origins: [], onSale: false });
export function isProductOnSale(product: FilterProduct) {
  return typeof product.salePrice === 'number' && Number.isFinite(product.salePrice) && product.salePrice > 0 && product.salePrice < product.price;
}
export function effectiveProductPrice(product: FilterProduct) {
  const sale = product.salePrice;
  return typeof sale === 'number' && isProductOnSale(product) ? sale : product.price;
}
export function buildProductFacets(products: FilterProduct[]): ProductFacets {
  const prices = products.map(effectiveProductPrice);
  const min = prices.length ? Math.min(...prices) : 0;
  const max = prices.length ? Math.max(...prices) : 0;
  const values = (field: 'brand' | 'origin') => [...new Set(products.map(product => product[field]?.trim() ?? '').filter(Boolean))].sort((a,b) => a.localeCompare(b, 'vi'));
  const saleCount = products.filter(isProductOnSale).length;
  return { min, max, brands: values('brand'), origins: values('origin'), priceMeaningful: min !== max, saleMeaningful: saleCount > 0 && saleCount < products.length };
}
export function canShowProductFilter(products: FilterProduct[], canManage: boolean, facets = buildProductFacets(products)) {
  return !canManage && products.length >= 6 && (facets.priceMeaningful || facets.brands.length >= 2 || facets.origins.length >= 2 || facets.saleMeaningful);
}
export function applyProductFilters<T extends FilterProduct>(products: T[], filters: ProductFilters): T[] {
  return products.filter(product => {
    const price = effectiveProductPrice(product);
    return (!filters.price || (price >= filters.price[0] && price <= filters.price[1]))
      && (!filters.brands.length || filters.brands.includes(product.brand?.trim() ?? ''))
      && (!filters.origins.length || filters.origins.includes(product.origin?.trim() ?? ''))
      && (!filters.onSale || isProductOnSale(product));
  });
}
export const countFilteredProducts = (products: FilterProduct[], filters: ProductFilters) => applyProductFilters(products, filters).length;
export const activeProductFilterCount = (filters: ProductFilters) => Number(Boolean(filters.price)) + filters.brands.length + filters.origins.length + Number(filters.onSale);
export function productPriceStep(min: number, max: number) {
  const raw = Math.max(1, (max - min) / 100);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  return Math.max(1, [1,2,5,10].map(multiplier => multiplier * magnitude).find(step => step >= raw) ?? magnitude);
}