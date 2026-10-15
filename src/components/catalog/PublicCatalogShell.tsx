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
