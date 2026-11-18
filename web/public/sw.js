// The web app is no longer a PWA. Browsers that installed the old next-pwa
// service worker keep running it until this file replaces it, so this worker
// deletes the old caches, unregisters itself, and reloads open tabs onto the
// network. Keep it here until old installs have had time to update.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
