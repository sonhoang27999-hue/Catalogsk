// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #343 (MIT, © 2026 Seokwoooo)
import { useEffect, useRef } from 'react';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pageScrollProgress } from '@/lib/publicScroll';

export function BackToTop({ pathname }: { pathname: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const button = ref.current;
    if (!button) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const visible = y > window.innerHeight * 1.5;
      button.dataset['visible'] = String(visible);
      button.tabIndex = visible ? 0 : -1;
      button.setAttribute('aria-hidden', String(!visible));
      button.style.setProperty('--sk-scroll-progress', String(pageScrollProgress(y, document.documentElement.scrollHeight, window.innerHeight)));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    observer?.observe(document.body);
    window.addEventListener('scroll', schedule, {passive:true});
    window.addEventListener('resize', schedule);
    update();
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); window.removeEventListener('scroll',schedule); window.removeEventListener('resize',schedule); };
  }, [pathname]);
  return <Button ref={ref} type="button" variant="secondary" size="icon" className="sk-back-top" aria-label="Về đầu trang" aria-hidden="true" tabIndex={-1} data-visible="false" onClick={() => window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})}>
    <svg viewBox="0 0 44 44" aria-hidden="true" className="sk-back-progress"><circle cx="22" cy="22" r="20" pathLength="100" /></svg>
    <ArrowUp className="sk-back-arrow" />
  </Button>;
}