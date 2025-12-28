// Import biblioteki OneSignal do obsługi powiadomień
importScripts('/OneSignalSDK.sw.js');

const CACHE_NAME = 'ps-burnley-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

// Instalacja Service Workera i buforowanie podstawowych plików
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

// Obsługa żądań sieciowych (Tryb Offline)
self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Zwróć z cache jeśli jest, w przeciwnym razie pobierz z sieci
        return response || fetch(event.request);
      })
  );
});