import { useEffect, useRef, type ReactNode } from "react";
import { ConsultationBar } from "./ConsultationBar";

export function PublicCatalogShell({
  children,
  pathname,
}: {
  children: ReactNode;
  pathname: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const root = ref.current;
    if (
      !root ||
      !window.IntersectionObserver ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const items = new Set<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("sk-reveal-pending");
          entry.target.classList.add("sk-revealed");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px 60px 0px", threshold: 0.04 },
    );
    const register = () =>
      root.querySelectorAll<HTMLElement>(".sk-reveal").forEach((item) => {
        if (items.has(item)) return;
        items.add(item);
        item.dataset["stagger"] = String(items.size % 4);
        if (item.getBoundingClientRect().top < window.innerHeight) return;
        item.classList.add("sk-reveal-pending");
        observer.observe(item);
      });
    register();
    // Suspense and search can mount cards after the shell effect has run.
    const mutations = new MutationObserver(register);
    mutations.observe(root, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
      items.forEach((item) => item.classList.remove("sk-reveal-pending"));
    };
  }, [pathname, children]);

  // 3D tilt: one delegated pointer handler for brand tiles and product cards.
  useEffect(() => {
    const root = ref.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let active: HTMLElement | null = null;
    let frame = 0;
    const reset = () => {
      if (!active) return;
      const el = active;
      el.classList.remove("sk-tilting");
      el.style.setProperty("--sk-rx", "0deg");
      el.style.setProperty("--sk-ry", "0deg");
      active = null;
    };
    const move = (e: PointerEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        ".sk-brand-tile, .sk-product-card",
      );
      if (target !== active) reset();
      if (!target) return;
      active = target;
      if (!target.querySelector(":scope > .sk-tilt-glare")) {
        const glare = document.createElement("span");
        glare.className = "sk-tilt-glare";
        glare.setAttribute("aria-hidden", "true");
        target.appendChild(glare);
      }
      const r = target.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      const max = target.classList.contains("sk-product-card") ? 4 : 10;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        target.classList.add("sk-tilting");
        target.style.setProperty("--sk-ry", `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
        target.style.setProperty("--sk-rx", `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
        target.style.setProperty("--sk-gx", `${(x * 100).toFixed(1)}%`);
        target.style.setProperty("--sk-gy", `${(y * 100).toFixed(1)}%`);
      });
    };
    const end = () => {
      cancelAnimationFrame(frame);
      reset();
    };
    root.addEventListener("pointermove", move, { passive: true });
    root.addEventListener("pointerdown", move, { passive: true });
    root.addEventListener("pointerleave", end);
    root.addEventListener("pointerup", end);
    root.addEventListener("pointercancel", end);
    window.addEventListener("scroll", end, { passive: true });
    return () => {
      end();
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerdown", move);
      root.removeEventListener("pointerleave", end);
      root.removeEventListener("pointerup", end);
      root.removeEventListener("pointercancel", end);
      window.removeEventListener("scroll", end);
    };
  }, []);

  return (
    <div ref={ref} className="sk-catalog sk-public-stage">
      <div className="sk-catalog-content mx-auto min-h-screen w-full max-w-[960px]">
        <div key={pathname} className="sk-page-enter">
          {children}
        </div>
      </div>
      <ConsultationBar />
    </div>
  );
}
