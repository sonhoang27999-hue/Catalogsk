import { describe, expect, test } from 'bun:test';
import { priceWarnings, normalizedProductName, safeWebLink } from './productChecks';
import { asProduct, parseRecent, PUBLIC_PRODUCT_COLUMNS } from '../data/workflow.api';
describe('dealer workflow rules', () => {
 test('promotion above list price warns without modifying prices', () => { expect(priceWarnings(100000,120000)).toEqual(['Giá khuyến mãi cao hơn giá niêm yết.']); expect(priceWarnings(100000,90000)).toEqual([]); });
 test('duplicate matching ignores accents case and surrounding spaces', () => { expect(normalizedProductName('  Đèn LED  ')).toBe(normalizedProductName('den led')); expect(normalizedProductName('Đèn LED S2')).not.toBe(normalizedProductName('Đèn LED S3')); });
 test('unsafe media links are warned', () => { expect(safeWebLink('javascript:alert(1)')).toBe(false);expect(safeWebLink('https://example.com/photo.jpg')).toBe(true); });
 test('public share projection never includes purchase prices', () => { expect(PUBLIC_PRODUCT_COLUMNS.split(',')).not.toContain('dealer_price');expect(PUBLIC_PRODUCT_COLUMNS.split(',')).not.toContain('dealer_price_vat'); const p = asProduct({id:'1',name:'LED',image_url:null,image_key:null,description:null,price:100000,sale_price:90000,video_url:null,detail_url:null});expect(p.price).toBe(100000);expect(p.salePrice).toBe(90000);expect(p.dealerPrice).toBeUndefined(); });
 test('remembered shortcuts reject external or injected destinations', () => {expect(parseRecent([{path:'https://evil.com',name:'x'},{path:'//evil.com',name:'x'},{path:'/c/honda/civic',name:'Civic'}])).toEqual([{path:'/c/honda/civic',name:'Civic'}]);});
});
