import { MessageCircle, Phone } from "lucide-react";
import { CONTACT } from "@/data/catalog";
import { Button } from "@/components/ui/button";

export function ConsultationBar() {
  return (
    <nav aria-label="Tư vấn sản phẩm" className="sk-consultation sk-glass">
      <div className="grid grid-cols-2 gap-3 px-3 pt-3">
        <Button asChild className="sk-contact sk-shimmer h-12 text-sm font-bold">
          <a href={`tel:${CONTACT.hotline.replace(/[^+\d]/g, "")}`}>
            <Phone />
            Gọi tư vấn
          </a>
        </Button>
        <Button
          asChild
          variant="secondary"
          className="sk-contact-zalo sk-shimmer h-12 text-sm font-bold"
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
      <p className="px-2 py-2 text-center text-[10px] text-muted-foreground">
        ~ Sản phẩm do SK Ambient Light Luxury phát triển ~
      </p>
    </nav>
  );
}
