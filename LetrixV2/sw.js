/**
 * LETRIX – Service Worker para funcionamento offline (PWA)
 * 
 * Este script faz o cacheamento automático de todas as páginas, estilos, scripts e mídias.
 * Isso garante que o aplicativo continue funcionando perfeitamente mesmo que o celular
 * do usuário esteja totalmente desconectado da internet.
 */

const CACHE_NAME = 'letrix-v2-cache-v4';

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

// Evento de Instalação: armazena todos os arquivos estáticos necessários no cache do navegador
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cacheando todos os recursos essenciais');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting()) // Força o Service Worker ativo a substituir versões antigas
  );
});

// Evento de Ativação: limpa caches antigos caso a versão mude
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Limpando cache antigo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim()) // Permite que o Service Worker controle a aba atual imediatamente
  );
});

// Evento Fetch: intercepta requisições de rede e retorna a versão cacheada se disponível (estratégia Cache First)
self.addEventListener('fetch', (event) => {
  // Ignora requisições de extensões de navegador ou esquemas não-HTTP (ex: chrome-extension://)
  if (!event.request.url.startsWith(self.location.origin)) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // Retorna do cache se encontrado
      }
      
      // Caso contrário, busca na rede
      return fetch(event.request).then((networkResponse) => {
        // Se a requisição for válida, salva uma cópia no cache dinamicamente
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Tratamento sob falha de conexão (offline) e recurso não cacheado
        console.warn('[Service Worker] Recurso não disponível offline:', event.request.url);
      });
    })
  );
});
