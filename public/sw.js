/**
 * Service Worker nhẹ cho PWA AutoDeco.
 *
 * QUAN TRỌNG: KHÔNG cache HTML hay dữ liệu API.
 * Bản cũ dùng chiến lược "cache-first cho mọi GET" khiến khách chưa đăng nhập
 * luôn thấy HTML/dữ liệu cũ (và cả bundle cũ) dù Cloud đã cập nhật.
 * Nay chỉ cache tài nguyên tĩnh cùng origin (ảnh, font, JS/CSS có hash).
 */
const CACHE_NAME = "autodeco-static-v3";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const isStaticAsset = (url) =>
  url.origin === self.location.origin &&
  /\.(?:js|css|woff2?|ttf|png|jpe?g|webp|avif|svg|ico)$/i.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // HTML/điều hướng, API Supabase, mọi request cross-origin: luôn đi thẳng ra mạng.
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
