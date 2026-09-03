/**
 * Service Worker nhẹ cho PWA AutoDeco.
 *
 * QUAN TRỌNG: KHÔNG cache HTML hay dữ liệu API.
 * Bản cũ dùng chiến lược "cache-first cho mọi GET" khiến khách chưa đăng nhập
 * luôn thấy HTML/dữ liệu cũ (và cả bundle cũ) dù Cloud đã cập nhật.
 * Nay chỉ cache:
 * - Tài nguyên tĩnh cùng origin (JS/CSS có hash, ảnh, icon): cache-first.
 * - Google Fonts: CSS dùng stale-while-revalidate, file font (bất biến) cache-first
 *   → lần mở sau không tốn round-trip font, chữ hiện ngay.
 */
const CACHE_NAME = "autodeco-static-v3";
const FONT_CACHE = "autodeco-fonts-v1";
const KEEP_CACHES = [CACHE_NAME, FONT_CACHE];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !KEEP_CACHES.includes(k)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  /\.(?:js|css|woff2?|ttf|png|jpe?g|webp|avif|svg|ico)$/i.test(url.pathname);

const isFontRequest = (url) =>
  url.hostname === "fonts.gstatic.com" ||
  (url.hostname === "fonts.googleapis.com" && url.pathname.startsWith("/css"));

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Google Fonts: file font bất biến → cache-first; CSS → trả cache ngay,
  // làm mới ở nền (stale-while-revalidate).
  if (isFontRequest(url)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const refresh = fetch(request)
          .then((response) => {
            if (response.ok || response.type === "opaque") {
              void cache.put(request, response.clone());
            }
            return response;
          });
        if (cached) {
          if (url.hostname === "fonts.googleapis.com") {
            void refresh.catch(() => undefined);
          }
          return cached;
        }
        return refresh.catch(() => cached);
      }),
    );
    return;
  }

  // HTML/điều hướng, API Supabase, mọi request cross-origin khác: luôn đi thẳng ra mạng.
  if (request.mode === "navigate" || !isStaticAsset(url)) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === "basic") {
            const clone = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});
