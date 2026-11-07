// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #336 (MIT, © 2026 Seokwoooo)
import { expect, test } from 'bun:test';
import { pickerBreadcrumb, pickerNodes, pickerNodeStep } from './vehiclePicker';
import { canShowProductJump, chipScrollLeft, selectActiveProduct } from './productJump';
import { clampImagePan, IMAGE_ZOOM_SCALE, shouldDismissImage } from './imageGestures';
const leaf = { id: 'leaf', name: 'Đời 2026', image: '', children: [], products: [] };
const parent = { ...leaf, id: 'parent', name: 'Dòng SUV', children: [leaf] };
test('picker uses existing children for branch and navigates leaves', () => {
  expect(pickerNodeStep([], parent)).toEqual({ path: [parent], destination: null });
  expect(pickerNodes([parent], [parent])).toEqual([leaf]);
  expect(pickerNodeStep([parent], leaf).destination).toBe('leaf');
  expect(pickerBreadcrumb('Hãng xe', [parent])).toEqual(['Hãng', 'Hãng xe', 'Dòng SUV']);
});
test('chips require at least five products', () => {
  expect(canShowProductJump(4, false)).toBe(false);
  expect(canShowProductJump(5, false)).toBe(true);
});
test('chips never appear for staff', () => { expect(canShowProductJump(8, true)).toBe(false); });
test('active product covers anchor before choosing next visible product', () => {
  expect(selectActiveProduct([{id:'a',top:-100,bottom:300},{id:'b',top:300,bottom:800}])).toBe('a');
  expect(selectActiveProduct([{id:'a',top:-600,bottom:0},{id:'b',top:120,bottom:800}])).toBe('b');
});
test('chip scroll changes only when chip falls outside its viewport', () => {
  expect(chipScrollLeft(100,80,60,250)).toBe(60);
  expect(chipScrollLeft(400,80,60,250)).toBe(242);
});
test('zoom is 2.5 and pan cannot expose empty image edges', () => {
  expect(IMAGE_ZOOM_SCALE).toBe(2.5);
  expect(clampImagePan(90,-900,200,300,200,300)).toEqual({x:0,y:-450});
});
test('dismiss needs 90px or quick swipe, never while zoomed or scrolled', () => {
  expect(shouldDismissImage(89,500,true,false)).toBe(false);
  expect(shouldDismissImage(90,500,true,false)).toBe(true);
  expect(shouldDismissImage(40,50,true,false)).toBe(true);
  expect(shouldDismissImage(100,50,false,false)).toBe(false);
  expect(shouldDismissImage(100,50,true,true)).toBe(false);
});