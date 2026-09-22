/**
 * LETRIX – Service Worker para funcionamento offline (PWA)
 * 
 * Realiza o pré-cacheamento dos recursos essenciais da interface (HTML, CSS, JS e mídias),
 * permitindo o funcionamento 100% offline e instalação nativa da aplicação.
 */

const CACHE_NAME = 'letrix-pwa-v2';

// Lista de arquivos estáticos a serem pré-cacheados na instalação
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
  './js/pwa.js',
  './assets/lion_mascot.png',
  './assets/psychologist.png',
  './assets/office_1.jpg',
  './assets/office_2.jpg',
  './assets/The_Toybox_Sprint.mp3',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

// Evento de Instalação: armazena recursos no cache do navegador de forma resiliente
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Cacheando recursos do Letrix PWA...');
      // Faz o cacheamento individual para evitar que a falha de um único arquivo interrompa a instalação
      await Promise.all(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            await cache.add(url);
          } catch (err) {
            console.warn('[Service Worker] Aviso: Falha ao cachear item prévio:', url, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Evento de Ativação: remove caches de versões antigas e assume o controle dos clientes
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

// Evento Fetch: intercepta requisições de rede com suporte offline inteligente
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Ignora requisições para a API REST backend (devem ir para o servidor)
  if (request.url.includes('/api/')) {
    return;
  }

  // Apenas intercepta requisições HTTP/HTTPS da mesma origem
  if (!request.url.startsWith(self.location.origin)) {
    return;
  }

  // Requisições de navegação (HTML): tenta Cache First, depois Network, com fallback para index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => {
          return caches.match('./index.html') || caches.match('index.html');
        });
      })
    );
    return;
  }

  // Demais recursos (CSS, JS, Imagens, Fontes, Áudio): Cache First com fallback para Network
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('[Service Worker] Recurso indisponível offline:', request.url);
      });
    })
  );
});
