// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #242 (MIT, © 2026 Seokwoooo)
export const canShowProductJump = (count: number, canManage: boolean) => count >= 5 && !canManage;
export function selectActiveProduct(items: { id: string; top: number; bottom: number }[], anchor = 114) {
  const sorted = [...items].sort((a, b) => a.top - b.top);
  return sorted.find(item => item.top <= anchor && item.bottom > anchor)?.id
    ?? sorted.find(item => item.bottom > anchor)?.id ?? null;
}
export function chipScrollLeft(left: number, width: number, scroll: number, viewport: number) {
  if (left < scroll) return Math.max(0, left - 12);
  if (left + width > scroll + viewport) return Math.max(0, left + width - viewport + 12);
  return scroll;
}