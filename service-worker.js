const CACHE_NAME = 'gasto-pwa-v2';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700&display=swap'
];

// Instalación del Service Worker: guarda los recursos esenciales en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Archivos cacheados correctamente');
        return cache.addAll(urlsToCache);
      })
      .catch(err => console.error('Error al cachear archivos:', err))
  );
  self.skipWaiting(); // Activa el nuevo SW inmediatamente
});

// Eliminación de cachés antiguas cuando se activa un nuevo SW
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Cache antiguo eliminado:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim(); // Toma control de las páginas abiertas
});

// Estrategia: Cache First (con fallback a red y luego a offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, lo devolvemos
        if (response) {
          return response;
        }
        // Clonamos la solicitud porque es de un solo uso
        const fetchRequest = event.request.clone();
        return fetch(fetchRequest).then(response => {
          // Verificamos si la respuesta es válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          // Clonamos la respuesta para guardarla en caché y devolverla
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return response;
        }).catch(() => {
          // Fallback offline: podríamos devolver una página simple, pero la app ya funciona offline
          // Si la solicitud es de tipo navegación, podrías devolver la página principal
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Contenido no disponible sin conexión', {
            status: 503,
            statusText: 'Offline',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});