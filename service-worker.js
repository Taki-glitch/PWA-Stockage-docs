const CACHE_NAME = "docvault-v1";

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./db.js",
  "./manifest.json"
];

/* INSTALL */

self.addEventListener("install", event => {

  event.waitUntil(

    caches.open(CACHE_NAME)

      .then(cache =>
        cache.addAll(FILES_TO_CACHE)
      )

  );

  self.skipWaiting();

});

/* ACTIVATE */

self.addEventListener("activate", event => {

  event.waitUntil(

    caches.keys()

      .then(keys =>

        Promise.all(

          keys
            .filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))

        )

      )

  );

  self.clients.claim();

});

/* FETCH */

self.addEventListener("fetch", event => {

  event.respondWith(

    caches.match(event.request)

      .then(response => {

        return response || fetch(event.request);

      })

  );

});
