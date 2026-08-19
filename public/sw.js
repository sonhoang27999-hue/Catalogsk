/**
 * Service Worker nhẹ cho PWA AutoDeco.
 * Chỉ cache shell cơ bản; dữ liệu động vẫn fetch từ network.
 */
const CACHE_NAME = "autodeco-shell-v1";
const SHELL_ASSETS = ["/", "/favicon.ico", "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => cached);
    })
  );
});
