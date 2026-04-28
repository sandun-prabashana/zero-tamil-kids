// ═══════════════════════════════════════════════════════════
//  sw.js — ZERO TAMIL Kids Service Worker (PWA)
// ═══════════════════════════════════════════════════════════
const CACHE = 'zero-tamil-v1';
const ASSETS = [
  '/zero-tamil/',
  '/zero-tamil/index.html',
  '/zero-tamil/dashboard.html',
  '/zero-tamil/students.html',
  '/zero-tamil/fees.html',
  '/zero-tamil/parent.html',
  '/zero-tamil/css/style.css',
  '/zero-tamil/js/firebase-config.js',
  '/zero-tamil/js/auth.js',
  '/zero-tamil/js/dashboard.js',
  '/zero-tamil/js/students.js',
  '/zero-tamil/js/fees.js',
  '/zero-tamil/js/parent.js'
];

// Install: cache static assets
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

// Activate: clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network-first, fallback to cache
self.addEventListener('fetch', e => {
  // Don't intercept Firebase/Google API requests
  if (e.request.url.includes('firestore') ||
      e.request.url.includes('googleapis') ||
      e.request.url.includes('gstatic') ||
      e.request.url.includes('firebase')) {
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Update cache with fresh response
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
