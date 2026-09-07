/**
 * LETRIX – Service Worker para funcionamento offline completo (PWA)
 * 
 * Este script faz o cacheamento automático de todas as páginas, estilos, scripts e mídias.
 * Isso garante que o aplicativo continue funcionando perfeitamente mesmo que o dispositivo
 * esteja totalmente desconectado da internet.
 */

const CACHE_NAME = 'letrix-v2-pwa-v5';

// Lista completa de arquivos estáticos a serem cacheados na instalação
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
  './js/audio.js',
  './js/dashboard.js',
  './js/db.js',
  './js/palavras.js',
  './js/game-palavras.js',
  './js/game-drag.js',
  './js/game-memoria.js',
  './js/pwa.js',
  './assets/lion_mascot.png',
  './assets/psychologist.png',
  './assets/office_1.jpg',
  './assets/office_2.jpg',
  './assets/The_Toybox_Sprint.mp3',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Evento de Instalação: armazena todos os arquivos estáticos necessários no cache
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Cacheando todos os recursos do Letrix PWA...');
      try {
        await cache.addAll(ASSETS_TO_CACHE);
      } catch (err) {
        console.warn('[Service Worker] Erro ao cachear lote inicial, salvando recurso por recurso:', err);
        for (const asset of ASSETS_TO_CACHE) {
          try {
            await cache.add(asset);
          } catch (e) {
            console.error('[Service Worker] Não foi possível cachear:', asset, e);
          }
        }
      }
    }).then(() => self.skipWaiting())
  );
});

// Evento de Ativação: remove caches desatualizados
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

// Evento Fetch: intercepta requisições de rede (Cache First com fallback de rede e navegação)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
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
      }).catch(async (err) => {
        console.warn('[Service Worker] Falha ao buscar recurso offline:', event.request.url);
        // Se for requisição de navegação HTML e falhar, abre index.html do cache
        if (event.request.mode === 'navigate') {
          const mainPage = await caches.match('./index.html');
          if (mainPage) return mainPage;
        }
        throw err;
      });
    })
  );
});

