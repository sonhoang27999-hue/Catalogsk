import { expect, test } from 'bun:test';
import { nextScrollHidden, pageScrollProgress } from './publicScroll';
test('header stays visible within 80px of top', () => {
  expect(nextScrollHidden({y:79,previousY:0,hidden:true})).toBe(false);
});
test('downward scroll hides only beyond 8px per frame', () => {
  expect(nextScrollHidden({y:108,previousY:100,hidden:false})).toBe(false);
  expect(nextScrollHidden({y:109,previousY:100,hidden:false})).toBe(true);
});
test('upward scroll of a few pixels reveals immediately', () => {
  expect(nextScrollHidden({y:197,previousY:200,hidden:true})).toBe(false);
  expect(nextScrollHidden({y:199,previousY:200,hidden:true})).toBe(true);
});
test('focus/menu/search and reduced motion always reveal', () => {
  expect(nextScrollHidden({y:200,previousY:100,hidden:true,blocked:true})).toBe(false);
  expect(nextScrollHidden({y:200,previousY:100,hidden:true,reducedMotion:true})).toBe(false);
});
test('progress remains bounded and handles short pages', () => {
  expect(pageScrollProgress(500,2000,1000)).toBe(0.5);
  expect(pageScrollProgress(20,600,800)).toBe(0);
  expect(pageScrollProgress(2000,2000,1000)).toBe(1);
});