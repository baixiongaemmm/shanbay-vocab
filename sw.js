// 英语词汇 PWA service worker
const VERSION = "v1";
const CORE = "shanbay-vocab-core-" + VERSION;
const RUNTIME = "shanbay-vocab-runtime-" + VERSION;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CORE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CORE && k !== RUNTIME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;

  // Same-origin: cache-first, refresh in background.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then((hit) => {
        const network = fetch(event.request).then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CORE).then((cache) => cache.put(event.request, copy));
          }
          return res;
        }).catch(() => hit);
        return hit || network;
      })
    );
    return;
  }

  // Pronunciation audio + web fonts: cache-first runtime cache.
  if (url.hostname === "dict.youdao.com" ||
      url.hostname === "fonts.googleapis.com" ||
      url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.match(event.request).then((hit) => {
        if (hit) return hit;
        return fetch(event.request).then((res) => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(RUNTIME).then((cache) => cache.put(event.request, copy));
          }
          return res;
        });
      })
    );
  }
});
