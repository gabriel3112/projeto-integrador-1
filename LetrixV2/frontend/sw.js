/**
 * LETRIX – Service Worker para funcionamento offline (PWA)
 * 
 * Este script realiza o pré-cacheamento dos recursos essenciais da interface (HTML, CSS, JS e mídias),
 * garantindo que o aplicativo continue acessível e funcional mesmo sem conexão de internet.
 */

const CACHE_NAME = 'letrix-v2-frontend-v1';

// Lista de arquivos estáticos a serem cacheados na instalação
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './jogar.html',
  './drag.html',
  './memoria.html',
  './creditos.html',
  './dashboard.html',
  './portfolio.html',
  './manifest.json',
  './css/style.css',
  './css/jogar.css',
  './css/drag.css',
  './css/memoria.css',
  './css/portfolio.css',
  './js/config.js',
  './js/audio.js',
  './js/dashboard.js',
  './js/db.js',
  './js/palavras.js',
  './js/game-palavras.js',
  './js/game-drag.js',
  './js/game-memoria.js',
  './assets/lion_mascot.png',
  './assets/psychologist.png',
  './assets/office_1.jpg',
  './assets/office_2.jpg',
  './assets/The_Toybox_Sprint.mp3',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Evento de Instalação: armazena recursos estáticos no cache do navegador
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cacheando recursos do frontend');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Evento de Ativação: limpa versões desatualizadas do cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Evento Fetch: intercepta requisições de rede (Cache First)
self.addEventListener('fetch', (event) => {
  // Ignora chamadas para a API REST backend (que devem ser trafegadas na rede)
  if (event.request.url.includes('/api/')) return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        console.warn('[Service Worker] Recurso indisponível offline:', event.request.url);
      });
    })
  );
});
