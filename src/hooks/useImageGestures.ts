// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #061 (MIT, © 2026 Seokwoooo)
import { useEffect, useRef } from 'react';
import { clampImagePan, IMAGE_ZOOM_SCALE, shouldDismissImage } from '@/lib/imageGestures';

export function useImageGestures(onDismiss: () => void) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    const media = mediaRef.current;
    if (!viewport || !media) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let zoomed = false, x = 0, y = 0, pull = 0, frame = 0, timer = 0, savedScroll = 0, lastTouchTime = 0;
    let start: { x: number; y: number; time: number; panX: number; panY: number; atTop: boolean } | null = null;
    let lastTap: { x: number; y: number; time: number } | null = null;
    const paint = () => {
      frame = 0;
      media.style.transform = zoomed ? `translate3d(${x}px,${y}px,0) scale(${IMAGE_ZOOM_SCALE})` : `translate3d(0,${reduced.matches ? 0 : pull}px,0)`;
      media.style.opacity = String(zoomed || reduced.matches ? 1 : Math.max(0.25, 1 - pull / 300));
      media.dataset['zoomed'] = String(zoomed);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const toggle = (clientX: number, clientY: number) => {
      window.clearTimeout(timer);
      media.dataset['settling'] = 'true';
      if (zoomed) { zoomed = false; x = 0; y = 0; pull = 0; viewport.scrollTop = savedScroll; }
      else {
        const rect = media.getBoundingClientRect();
        const pointX = clientX - rect.left, pointY = clientY - rect.top;
        const pan = clampImagePan(pointX * (1 - IMAGE_ZOOM_SCALE), pointY * (1 - IMAGE_ZOOM_SCALE) - viewport.scrollTop, media.offsetWidth, media.offsetHeight, viewport.clientWidth, viewport.clientHeight);
        savedScroll = viewport.scrollTop;
        viewport.scrollTop = 0;
        zoomed = true; x = pan.x; y = pan.y;
      }
      schedule();
      timer = window.setTimeout(() => { media.dataset['settling'] = 'false'; }, reduced.matches ? 0 : 180);
    };
    const begin = (clientX: number, clientY: number) => {
      media.dataset['settling'] = 'false';
      start = {x:clientX,y:clientY,time:performance.now(),panX:x,panY:y,atTop:viewport.scrollTop <= 0};
    };
    const move = (clientX: number, clientY: number) => {
      if (!start) return false;
      const dx = clientX - start.x, dy = clientY - start.y;
      if (zoomed) {
        const pan = clampImagePan(start.panX + dx, start.panY + dy, media.offsetWidth, media.offsetHeight, viewport.clientWidth, viewport.clientHeight);
        x = pan.x; y = pan.y; schedule(); return true;
      }
      if (start.atTop && viewport.scrollTop <= 0 && dy > 6 && dy > Math.abs(dx)) { pull = dy; schedule(); return true; }
      if (pull) { pull = 0; schedule(); }
      return false;
    };
    const end = (clientX: number, clientY: number, touch: boolean) => {
      if (!start) return;
      const duration = performance.now() - start.time;
      const distance = Math.hypot(clientX - start.x, clientY - start.y);
      if (shouldDismissImage(pull, duration, start.atTop, zoomed)) {
        if (reduced.matches) onDismiss();
        else { pull = Math.max(pull, 220); media.dataset['settling'] = 'true'; schedule(); timer = window.setTimeout(onDismiss, 180); }
      } else if (touch && distance < 12 && duration < 350) {
        const now = performance.now();
        if (lastTap && now - lastTap.time < 320 && Math.hypot(clientX-lastTap.x, clientY-lastTap.y) < 28) { toggle(clientX, clientY); lastTap = null; }
        else lastTap = {x:clientX,y:clientY,time:now};
      } else { pull = 0; media.dataset['settling'] = 'true'; schedule(); }
      start = null;
    };
    const cancel = () => { start = null; lastTap = null; pull = 0; schedule(); };
    const touchStart = (e: TouchEvent) => { lastTouchTime = performance.now(); const t = e.touches[0]; if (e.touches.length !== 1 || !t) { cancel(); return; } begin(t.clientX,t.clientY); };
    const touchMove = (e: TouchEvent) => { const t = e.touches[0]; if (e.touches.length !== 1 || !t) { cancel(); return; } if (move(t.clientX,t.clientY) && e.cancelable) e.preventDefault(); };
    const touchEnd = (e: TouchEvent) => { const t = e.changedTouches[0]; if (!t || e.touches.length) { cancel(); return; } end(t.clientX,t.clientY,true); };
    const mouseDown = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || !zoomed || e.button !== 0) return; begin(e.clientX,e.clientY); media.setPointerCapture(e.pointerId); e.preventDefault(); };
    const mouseMove = (e: PointerEvent) => { if (e.pointerType === 'mouse') move(e.clientX,e.clientY); };
    const mouseEnd = (e: PointerEvent) => { if (e.pointerType === 'mouse') end(e.clientX,e.clientY,false); };
    const doubleClick = (e: MouseEvent) => { e.preventDefault(); if (performance.now() - lastTouchTime > 500) toggle(e.clientX,e.clientY); };
    const preventDrag = (e: DragEvent) => e.preventDefault();
    media.addEventListener('touchstart',touchStart,{passive:true});
    media.addEventListener('touchmove',touchMove,{passive:false});
    media.addEventListener('touchend',touchEnd,{passive:true});
    media.addEventListener('touchcancel',cancel,{passive:true});
    media.addEventListener('pointerdown',mouseDown);
    media.addEventListener('pointermove',mouseMove);
    media.addEventListener('pointerup',mouseEnd);
    media.addEventListener('dblclick',doubleClick);
    media.addEventListener('dragstart',preventDrag);
    paint();
    return () => {
      cancelAnimationFrame(frame); window.clearTimeout(timer);
      media.removeEventListener('touchstart',touchStart); media.removeEventListener('touchmove',touchMove); media.removeEventListener('touchend',touchEnd); media.removeEventListener('touchcancel',cancel);
      media.removeEventListener('pointerdown',mouseDown); media.removeEventListener('pointermove',mouseMove); media.removeEventListener('pointerup',mouseEnd); media.removeEventListener('dblclick',doubleClick); media.removeEventListener('dragstart',preventDrag);
    };
  }, [onDismiss]);
  return { viewportRef, mediaRef };
}