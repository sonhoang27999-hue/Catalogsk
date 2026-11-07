// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #212 (MIT, © 2026 Seokwoooo)
export function nextScrollHidden({ y, previousY, hidden, blocked = false, reducedMotion = false }: {
  y: number; previousY: number; hidden: boolean; blocked?: boolean; reducedMotion?: boolean;
}): boolean {
  if (blocked || reducedMotion || y < 80) return false;
  const delta = y - previousY;
  if (delta < -2) return false;
  if (delta > 8) return true;
  return hidden;
}
export function pageScrollProgress(y: number, height: number, viewport: number): number {
  return Math.max(0, Math.min(1, height > viewport ? y / (height - viewport) : 0));
}