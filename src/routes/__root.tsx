import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { ThemeApplier } from "@/components/ThemeApplier";
import { supabase } from "@/integrations/supabase/client";


function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#09090b" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: "AutoDeco" },
      { title: "AutoDeco - Danh mục Phụ kiện Ô tô" },
      { name: "description", content: "Danh mục phụ kiện ô tô phân cấp theo hãng xe, đời xe và năm sản xuất." },
      { name: "author", content: "AutoDeco" },
      { property: "og:title", content: "AutoDeco - Danh mục Phụ kiện Ô tô" },
      { property: "og:description", content: "Danh mục phụ kiện ô tô phân cấp theo hãng xe, đời xe và năm sản xuất." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@autodeco" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "manifest", href: "/manifest.json" },
      { rel: "apple-touch-icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Trang quản trị dùng toàn bộ chiều rộng màn hình (desktop), không dùng khung mobile 480px.
  const isFullWidth = pathname.startsWith("/admin") || pathname.startsWith("/auth");

  // Đăng nhập/đăng xuất làm thay đổi quyền xem giá nhập → nạp lại dữ liệu catalog.
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      router.invalidate();
      if (event !== "SIGNED_OUT") queryClient.invalidateQueries();
      else queryClient.clear();
    });
    return () => sub.subscription.unsubscribe();
  }, [queryClient, router]);

  // Nếu người dùng KHÔNG chọn "ghi nhớ đăng nhập", phiên chỉ tồn tại trong lần mở trình duyệt này.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("autodeco.remember") !== "0") return;
    if (sessionStorage.getItem("autodeco.session") === "1") return;
    sessionStorage.setItem("autodeco.session", "1");
    void supabase.auth.signOut();
  }, []);

  // Đăng ký service worker để app chạy như PWA; khi ở standalone, nút/swipe back của điện thoại
  // sẽ điều hướng theo lịch sử router thay vì thoát trình duyệt.

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // Không cần báo lỗi nếu trình duyệt không hỗ trợ hoặc môi trường dev.
    });
  }, []);



  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      {isFullWidth ? (
        <div className="min-h-screen bg-background">
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <Outlet />
        </div>
      ) : (
        <>
          {/* Điện thoại/tablet: khung 480px như cũ. Desktop: khung app nổi trên nền gradient. */}
          <div className="min-h-screen bg-secondary/40 lg:flex lg:items-start lg:justify-center lg:bg-[radial-gradient(120%_120%_at_50%_0%,color-mix(in_oklab,var(--brand)_18%,var(--background))_0%,var(--background)_60%)] lg:py-8">
            <div className="mx-auto min-h-screen w-full max-w-[480px] bg-background pb-10 shadow-sm lg:min-h-[calc(100vh-4rem)] lg:overflow-hidden lg:rounded-[28px] lg:border lg:border-border lg:pb-16 lg:shadow-2xl">
              <Outlet />
            </div>
          </div>
          <footer className="fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 border-t border-border bg-background py-2.5 text-center text-[11px] font-medium tracking-wide text-muted-foreground lg:bottom-8 lg:rounded-b-[28px] lg:border-x">
            ~ Sản phẩm do SK Ambient Light Luxury phát triển ~
          </footer>
        </>

      )}
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

