const CACHE_NAME = "bierwiegen-v2";
const CORE_ASSETS = ["/", "/manifest.webmanifest", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const putInCache = (request, response) => {
  // Nur vollständige, eigene Antworten cachen (keine Redirects, Fehler oder Opaque-Responses).
  if (!response || response.status !== 200 || response.type !== "basic") return;
  const copy = response.clone();
  caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => undefined);
};

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Fremde Origins (Supabase-API, Auth, Realtime) nie anfassen — sonst landen
  // persönliche API-Antworten im Cache und Logins können hängen bleiben.
  if (url.origin !== self.location.origin) return;
  // Auth-Callback und API-Routen immer direkt ans Netz.
  if (url.pathname.startsWith("/auth/") || url.pathname.startsWith("/api/")) return;

  // Gehashte Build-Assets ändern sich nie → Cache zuerst.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            putInCache(request, response);
            return response;
          })
      )
    );
    return;
  }

  // Alles andere: Netz zuerst, offline aus dem Cache. Navigationen fallen auf die Startseite zurück.
  event.respondWith(
    fetch(request)
      .then((response) => {
        putInCache(request, response);
        return response;
      })
      .catch(() =>
        caches
          .match(request)
          .then((cached) => cached || (request.mode === "navigate" ? caches.match("/") : undefined))
          .then((response) => response || Response.error())
      )
  );
});
