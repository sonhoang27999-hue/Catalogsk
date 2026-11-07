// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #061 (MIT, © 2026 Seokwoooo)
export const IMAGE_ZOOM_SCALE = 2.5;
export function clampImagePan(x: number, y: number, width: number, height: number, viewportWidth: number, viewportHeight: number) {
  return { x: Math.min(0, Math.max(viewportWidth - width * IMAGE_ZOOM_SCALE, x)), y: Math.min(0, Math.max(viewportHeight - height * IMAGE_ZOOM_SCALE, y)) };
}
export function shouldDismissImage(distance: number, duration: number, atTop: boolean, zoomed: boolean) {
  return atTop && !zoomed && (distance >= 90 || (distance >= 35 && distance / Math.max(1, duration) >= 0.65));
}