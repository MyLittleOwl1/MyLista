const CACHE = "mylista-v2";
const ASSETS = [
  "index.html",
  "styles.css",
  "app.js",
  "firebase-config.js",
  "manifest.json",
  "icon.svg"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  // Estrategia Network First: intenta red, si falla usa caché
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Si la respuesta es válida, actualiza la caché
        const clone = res.clone();
        caches.open(CACHE).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
