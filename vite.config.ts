// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
    // Static HTML per route in dist/client: the packaged Android app boots straight from disk.
    prerender: { enabled: true, crawlLinks: true },
  },
  vite: {
    plugins: [
      // Offline support: generated service worker, registered only by src/lib/pwa.ts
      // (never in dev or Lovable preview). Manifest stays hand-written in public/.
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        manifest: false,
        workbox: {
          globPatterns: ["**/*.{js,css,png,svg,ico,webmanifest,dat}"],
          // On-demand OCR/ML bundles stay out of the precache; they download when used.
          globIgnores: ["**/tesseract-core*", "**/ort-wasm*", "**/cedict.dat"],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          navigateFallback: null,
          runtimeCaching: [
            {
              // HTML navigations: network first, cached page when offline.
              urlPattern: ({ request }: { request: Request }) => request.mode === "navigate",
              handler: "NetworkFirst",
              options: { cacheName: "pages", networkTimeoutSeconds: 5 },
            },
            {
              // Same-origin hashed build assets.
              urlPattern: ({ url }: { url: URL }) => url.origin === self.location.origin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: { cacheName: "build-assets" },
            },
          ],
        },
      }),
    ],
  },
});
