import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { HeaderMenu } from "./HeaderMenu";

export function PageHeader({ title }: { title: string }) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card/95 px-2 backdrop-blur">
      <button
        type="button"
        aria-label="Quay lại"
        onClick={goBack}
        className="flex size-10 items-center justify-center rounded-full text-foreground transition-colors active:bg-secondary"
      >
        <ChevronLeft className="size-6" />
      </button>
      <h1 className="truncate px-2 text-base font-bold tracking-tight">{title}</h1>
      <HeaderMenu />
    </header>
  );
}
