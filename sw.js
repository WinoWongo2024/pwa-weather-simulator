const CACHE_NAME = 'simulated-weather-v1';
const urlsToCache = [
  '/', // Catches the root path, essential for GitHub Pages
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png'
];

// INSTALL: Caches all static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Opened cache and adding files.');
        return cache.addAll(urlsToCache);
      })
  );
});

// FETCH: Intercepts network requests and serves from cache first
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return the cached response
        if (response) {
          return response;
        }
        // No cache hit - fetch from the network
        return fetch(event.request);
      })
  );
});

// ACTIVATE: Cleans up old caches (crucial for updating the PWA)
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
