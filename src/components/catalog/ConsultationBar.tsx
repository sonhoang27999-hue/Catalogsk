import { MessageCircle, Phone } from "lucide-react";
import { CONTACT } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";

export function ConsultationBar() {
  const { ref, hidden: compact } = useHideOnScroll<HTMLElement>();
  useEffect(() => {
    const element = ref.current;
    const catalog = element?.closest<HTMLElement>('.sk-catalog');
    if (!element || !catalog) return;
    const measure = () => catalog.style.setProperty('--sk-consult-h', `${element.getBoundingClientRect().height}px`);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener('resize', measure);
    measure();
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [compact, ref]);
  return (
    <nav ref={ref} data-compact={compact} aria-label="Tư vấn sản phẩm" className="sk-consultation sk-glass">
      <div className={`grid grid-cols-2 gap-3 px-3 pt-3 ${compact ? 'pb-3' : ''}`}>
        <Button asChild className={`sk-contact sk-shimmer ${compact ? 'h-10' : 'h-12'} text-sm font-bold`}>
          <a href={`tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}`}>
            <Phone />
            Gọi tư vấn
          </a>
        </Button>
        <Button
          asChild
          variant="secondary"
          className={`sk-contact-zalo sk-shimmer ${compact ? 'h-10' : 'h-12'} text-sm font-bold`}
        >
          <a
            href={`https://zalo.me/${CONTACT.zalo.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle />
            Zalo tư vấn
          </a>
        </Button>
      </div>
      <p aria-hidden={compact} className={`sk-consult-caption px-2 py-2 text-center text-[10px] text-muted-foreground ${compact ? 'hidden' : ''}`}>
        ~ Sản phẩm do SK Ambient Light Luxury phát triển ~
      </p>
    </nav>
  );
}
