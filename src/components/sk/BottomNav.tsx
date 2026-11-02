import { Link } from "@tanstack/react-router";
import { Languages, MessagesSquare, Settings } from "lucide-react";

const items = [
  { to: "/", label: "Dịch", icon: Languages },
  { to: "/conversation", label: "Hội thoại", icon: MessagesSquare },
  { to: "/settings", label: "Cài đặt", icon: Settings },
] as const;

export function TopNav() {
  return (
    <header className="sticky top-0 z-40 hidden border-b bg-card/90 backdrop-blur md:block">
      <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-6 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src="/icon-192.png" alt="" className="h-8 w-8 rounded-lg" />
          <span className="text-lg font-bold tracking-tight">SK Translate</span>
        </Link>
        <nav className="flex items-center gap-1">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-primary"
            >
              <Icon className="h-4 w-4" strokeWidth={1.9} />
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-3">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            onPointerDown={() => navigator.vibrate?.(8)}
            className="tap group relative flex flex-col items-center gap-1 min-h-[3.75rem] justify-center py-2 text-[11px] font-medium text-muted-foreground data-[status=active]:text-primary"
          >
            <span className="nav-dot absolute top-0 hidden h-0.5 w-8 rounded-full bg-primary group-data-[status=active]:block" />
            <span className="flex h-8 w-14 items-center justify-center rounded-full transition-colors group-data-[status=active]:bg-accent">
              <Icon className="h-6 w-6 transition-transform group-data-[status=active]:scale-110" strokeWidth={1.8} />
            </span>
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
