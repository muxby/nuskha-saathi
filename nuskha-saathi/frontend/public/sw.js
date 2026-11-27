/*
 * Nuskha Saathi service worker.
 *
 * Keeps the app shell available with no network so saved prescriptions and
 * the offline demo cases open in airplane mode. API responses are never
 * cached here: clinical results must come from the safety engine or from the
 * records the patient chose to save on the device.
 */
const VERSION = "v1";
const SHELL_CACHE = `nuskha-shell-${VERSION}`;
const ASSET_CACHE = `nuskha-assets-${VERSION}`;
const SHELL_URLS = ["/", "/manifest.json", "/icon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("nuskha-") && key !== SHELL_CACHE && key !== ASSET_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok && new URL(request.url).pathname === "/") {
      cache.put("/", response.clone());
    }
    return response;
  } catch {
    const cached = (await cache.match(request, { ignoreSearch: true })) || (await cache.match("/"));
    if (cached) return cached;
    return new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } });
  }
}

