// Retain this deployed path for returning browsers; home-screen installation
// now uses manifest metadata only. Remove only this catalog's legacy caches.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil((async () => {
    try {
      const names = await caches.keys();
      await Promise.allSettled(names.filter(name => /^autodeco-(?:static|fonts)-v\d+$/.test(name)).map(name => caches.delete(name)));
      await self.clients.claim();
      const windows = await self.clients.matchAll({ type: "window" });
      await Promise.allSettled(windows.map(client => client.navigate(client.url)));
    } finally {
      await self.registration.unregister();
    }
  })()),
);
