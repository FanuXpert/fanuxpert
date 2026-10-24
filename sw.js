// FanuXpert service worker — network-first for the app doc so updates show,
// cache-first for static libraries; offline falls back to cache.
const CACHE = "fanuxpert-v5";
const ASSETS = [
  "/", "/index.html", "/manifest.json",
  "/icon-192.png", "/icon-512.png", "/apple-touch-icon.png",
  "https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.4/babel.min.js"
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isAppDoc = req.mode === "navigate" ||
    (url.origin === self.location.origin &&
      (url.pathname === "/" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/manifest.json")));
  if (isAppDoc) {
    // network-first: always try fresh, fall back to cache when offline
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (x) {} });
        return res;
      }).catch(() => caches.match(req).then((h) => h || caches.match("/index.html")))
    );
    return;
  }
  // cache-first for static libs / icons
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => { try { c.put(req, copy); } catch (x) {} });
      return res;
    }).catch(() => undefined))
  );
});
