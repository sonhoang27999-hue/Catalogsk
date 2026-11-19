import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { useHideOnScroll } from "@/hooks/useHideOnScroll";
import { useDealerContact } from "@/hooks/useDealerContact";
import { telHref, zaloHref } from "@/lib/dealerLink";

/**
 * Thanh cố định dưới đáy catalog.
 * Trang gốc chỉ còn dòng thương hiệu; hai nút Gọi/Zalo tư vấn chỉ hiện khi khách vào
 * qua link của đại lý cấp 1 (hoặc đăng nhập bằng tài khoản thuộc đại lý đó) và trỏ về số của đại lý.
 */
export function ConsultationBar() {
  const { ref, hidden } = useHideOnScroll<HTMLElement>();
  const { contact } = useDealerContact();
  // Không có nút thì không có gì để thu gọn: luôn giữ dòng thương hiệu.
  const compact = hidden && Boolean(contact);
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
  }, [compact, contact, ref]);
  return (
    <nav
      ref={ref}
      data-compact={compact}
      data-dealer={contact?.code}
      aria-label={contact ? "Tư vấn sản phẩm" : "Thông tin thương hiệu"}
      className="sk-consultation sk-glass"
    >
      {contact ? (
        <div className={`grid grid-cols-2 gap-3 px-3 pt-3 ${compact ? 'pb-3' : ''}`}>
          <Button asChild className={`sk-contact sk-shimmer ${compact ? 'h-10' : 'h-12'} text-sm font-bold`}>
            <a href={telHref(contact.phone)}>
              <Phone />
              Gọi tư vấn
            </a>
          </Button>
          <Button
            asChild
            variant="secondary"
            className={`sk-contact-zalo sk-shimmer ${compact ? 'h-10' : 'h-12'} text-sm font-bold`}
          >
            <a href={zaloHref(contact.zalo)} target="_blank" rel="noopener noreferrer">
              <MessageCircle />
              Zalo tư vấn
            </a>
          </Button>
        </div>
      ) : null}
      <p aria-hidden={compact} className={`sk-consult-caption px-2 py-2 text-center text-[10px] text-muted-foreground ${compact ? 'hidden' : ''}`}>
        {contact?.shopName ? (
          <span className="block truncate pb-0.5 font-semibold text-foreground">
            Tư vấn bởi {contact.shopName}
          </span>
        ) : null}
        ~ Sản phẩm do SK Ambient Light Luxury phát triển ~
      </p>
    </nav>
  );
}
