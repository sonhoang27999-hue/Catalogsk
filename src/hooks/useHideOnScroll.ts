// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #212 (MIT, © 2026 Seokwoooo); Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #332 (MIT, © 2026 Seokwoooo)
import { useEffect, useRef, useState } from 'react';
import { useLocation } from '@tanstack/react-router';
import { nextScrollHidden } from '@/lib/publicScroll';

export function useHideOnScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [hidden, setHidden] = useState(false);
  const pathname = useLocation({select: location => location.pathname});
  useEffect(() => {
    const element = ref.current;
    const catalog = element?.closest('.sk-catalog');
    if (!element || !catalog) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let previousY = Math.max(0, window.scrollY);
    let current = false;
    let frame = 0;
    setHidden(false);
    const ownsHeader = element.classList.contains('sk-scroll-header');
    if (ownsHeader) catalog.setAttribute('data-header-hidden', 'false');
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const blocked = element.contains(document.activeElement) || Boolean(catalog.querySelector('[data-search-open="true"], [aria-label="Menu tài khoản"][aria-expanded="true"]')) || Boolean(document.querySelector('[role="dialog"][data-state="open"]'));
      const next = nextScrollHidden({ y, previousY, hidden: current, blocked, reducedMotion: media.matches });
      previousY = y;
      if (next !== current) { current = next; setHidden(next); if (ownsHeader) catalog.setAttribute('data-header-hidden', String(next)); }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const mutations = new MutationObserver(schedule);
    mutations.observe(catalog, {subtree:true,attributes:true,attributeFilter:['data-search-open','aria-expanded']});
    window.addEventListener('scroll', schedule, {passive:true});
    document.addEventListener('focusin', schedule);
    media.addEventListener?.('change', schedule);
    return () => {
      cancelAnimationFrame(frame); mutations.disconnect();
      window.removeEventListener('scroll', schedule);
      document.removeEventListener('focusin', schedule);
      media.removeEventListener?.('change', schedule);
      if (ownsHeader) catalog.setAttribute('data-header-hidden', 'false');
    };
  }, [pathname]);
  return { ref, hidden };
}