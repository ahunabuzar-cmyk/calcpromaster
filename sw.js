/* ============================================================
   CalcProMaster — Offline / PWA Service Worker
   ============================================================
   Strategy (privacy-first, always-fresh):
   - Navigations (page loads) : network-first, cache fallback.
     Returning visitors ALWAYS get the newest shell; the cache is
     only a safety net when offline. This is what prevents the old
     "stuck Loading" stale-shell bug.
   - Same-origin assets (js, css, data, images) : stale-while-revalidate.
     Serve from cache instantly, refresh in the background.
   - Cross-origin requests (analytics, ads, fonts, currency APIs) :
     network-only. Opaque responses are never cached (they can blow
     the storage quota and are useless offline anyway).

   The cache version string on the next line is REWRITTEN
   automatically by build-deploy.js on every deploy with a content
   hash, so caches always invalidate when the site changes. The
   index.html cache-bust script derives its stamp from the same line.
   IMPORTANT: keep exactly ONE such assignment in this file.
   ============================================================ */
const CACHE_NAME = 'calcpro-v2.6.0-base';
const VERSION = CACHE_NAME;

// ---- Precache list (the app shell + core engine + tool data) ----
// Everything needed to render tool pages fully offline.
// js/data/*.js are the 20 tool-suite files (single source of truth).
const SHELL = [
  './',
  './index.html',
  './404.html',
  './styles.css',
  './manifest.json',
  './icon.svg',
  './icon-192.png',
  './icon-512.png',
  './og-image.png',
  './js/site-config.js',
  './js/core.js',
  './js/data.js',
  './js/calc-modes.js',
  './js/advanced-features.js',
  './js/router.js',
  './js/app.js',
  './js/i18n.js',
  './js/data/auto-transport.js',
  './js/data/business.js',
  './js/data/career-freelance.js',
  './js/data/construction.js',
  './js/data/conversion.js',
  './js/data/education.js',
  './js/data/engineering.js',
  './js/data/everyday.js',
  './js/data/finance.js',
  './js/data/fitness-exercise.js',
  './js/data/food-nutrition.js',
  './js/data/health.js',
  './js/data/home-garden.js',
  './js/data/lifestyle.js',
  './js/data/math.js',
  './js/data/parenting-family.js',
  './js/data/regional.js',
  './js/data/science.js',
  './js/data/tech-digital.js',
  './js/data/utilities.js'
];

// ---- Install: populate the shell cache ----
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (cache) {
        // cache.addAll fails the WHOLE install if any single file 404s.
        // A failed install leaves the old worker in control — safe.
        return cache.addAll(SHELL);
      })
      .then(function () { return self.skipWaiting(); })
  );
});

// ---- Activate: drop every stale cache, take control ----
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(
          keys
            .filter(function (key) { return key.indexOf('calcpro-v2') === 0 && key !== CACHE_NAME; })
            .map(function (key) { return caches.delete(key); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

// ---- Fetch ----
self.addEventListener('fetch', function (event) {
  var req = event.request;
  // Only handle GET; never intercept the service worker itself.
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.pathname.indexOf('/sw.js') !== -1) return;

  // Navigations: network-first, cache fallback (fresh shell always wins).
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(function (res) {
          if (res && res.ok) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put('./index.html', copy); });
          }
          return res;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (hit) {
            return hit || caches.match('./404.html');
          });
        })
    );
    return;
  }

  // Cross-origin (GA4, GTM, AdSense, fonts CDN, currency APIs): network only.
  if (!isSameOrigin(url)) return;

  // Same-origin static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req)
        .then(function (res) {
          if (res && (res.ok || res.type === 'opaque')) {
            var copy = res.clone();
            caches.open(CACHE_NAME).then(function (cache) { cache.put(req, copy); });
          }
          return res;
        })
        .catch(function () { return cached; });
      return cached || network;
    })
  );
});

// ---- Lifecycle helper: let a new SW take over immediately ----
self.addEventListener('message', function (event) {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
