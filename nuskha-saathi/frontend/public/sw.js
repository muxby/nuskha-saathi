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

