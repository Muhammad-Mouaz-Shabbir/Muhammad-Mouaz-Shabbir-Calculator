self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open("calculator-cache").then((cache) => {
      return cache.addAll([
        "./index.html",
        "./style.css",
        "./script.js",
        "./manifest.json",
        "./icon_192.png",
        "./icon_512.png"
      ]);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
