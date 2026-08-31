/*
 * Minimal service worker: enough to make Reelist installable and to keep the
 * app shell available on a flaky connection.
 *
 * Deliberately does NOT cache API responses or page HTML. A watched list served
 * from a stale cache would break the one guarantee the app makes — add it on
 * your phone, see it on your PC (docs/architecture.md).
 */

const CACHE_NAME = "reelist-shell-v1";
const SHELL_ASSETS = ["/manifest.webmanifest", "/icons/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Same-origin static assets only. Anything user-specific goes to the network.
  if (url.origin !== self.location.origin) return;
  if (!SHELL_ASSETS.includes(url.pathname) && !url.pathname.startsWith("/icons/")) return;

  event.respondWith(
    caches.match(request).then((cached) => cached ?? fetch(request)),
  );
});
