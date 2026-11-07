// Ý tưởng tương tác tham khảo Lucian UX/UI Prompt #288 (MIT, © 2026 Seokwoooo)
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExpandableText({ children, className }: { children: string; className?: string }) {
  const id = useId();
  const text = useRef<HTMLParagraphElement>(null);
  const animation = useRef<Animation | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflow, setOverflow] = useState(false);
  const [measuredText, setMeasuredText] = useState<string | null>(null);
  useEffect(() => { setExpanded(false); }, [children]);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => { if (media.matches) animation.current?.cancel(); };
    media.addEventListener?.("change", stop);
    return () => { media.removeEventListener?.("change", stop); animation.current?.cancel(); };
  }, []);
  useEffect(() => {
    const element = text.current;
    if (!element) return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const lineHeight = parseFloat(getComputedStyle(element).lineHeight) || parseFloat(getComputedStyle(element).fontSize) * 1.5;
      setOverflow(expanded ? element.scrollHeight > lineHeight * 3 + 1 : element.scrollHeight > element.clientHeight + 1);
      setMeasuredText(children);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(element);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => { cancelled = true; observer?.disconnect(); window.removeEventListener("resize", measure); };
  }, [children, expanded]);
  const toggle = () => {
    const element = text.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (expanded && element && element.getBoundingClientRect().top < 0) {
      window.scrollBy({ top: element.getBoundingClientRect().top - 80, behavior: reduce ? "instant" : "smooth" });
    }
    setExpanded(value => !value);
    // Không animate chiều cao: chỉ transform/opacity để tránh reflow từng khung hình.
    animation.current?.cancel();
    if (!reduce && element?.closest(".sk-catalog") && typeof element.animate === "function") animation.current = element.animate([{ opacity: 0.85, transform: "translateY(3px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180, easing: "ease-out" });
  };
  return <div className="sk-expandable">
    <div className="relative">
      <p ref={text} id={id} className={`${className ?? ""} ${expanded ? "" : "line-clamp-3"}`}>{children}</p>
      {overflow && !expanded ? <span aria-hidden="true" className="sk-description-fade" /> : null}
    </div>
    {((measuredText !== children && children.length > 120) || (measuredText === children && overflow)) ? <div className="h-8">
      {overflow ? <Button type="button" variant="ghost" size="sm" className="h-8 px-0 text-gold" aria-expanded={expanded} aria-controls={id} onClick={toggle}>
        {expanded ? "Thu gọn" : "Xem thêm"}{expanded ? <ChevronUp /> : <ChevronDown />}
      </Button> : null}
    </div> : null}
  </div>;
}