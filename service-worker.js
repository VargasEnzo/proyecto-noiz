const CACHE_NAME = 'noiz-shell-v2';

const SHELL_FILES = [
    '/html/login.html',
    '/html/dashboard.html',
    '/css/variables.css',
    '/css/estiloslogin.css',
    '/css/estilosdashboard.css',
    '/js/login.js',
    '/js/dashboard/main.js',
    '/js/pwa.js',
    '/manifest.json',
    '/IMAGENES/logo-noiz-icon.png',
    '/IMAGENES/logo-noiz-app-icon.png',
    '/IMAGENES/logo-noiz-app-icon-192.png',
    '/IMAGENES/14.jpg',
    '/IMAGENES/15.jpg',
];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((nombres) =>
                Promise.all(nombres.filter((nombre) => nombre !== CACHE_NAME).map((nombre) => caches.delete(nombre)))
            )
    );
    self.clients.claim();
});

// Network-first: siempre intenta traer la version mas nueva del servidor.
// Solo si no hay conexion, usa la copia guardada. Asi nunca queda "pegada"
// mostrando algo viejo mientras haya internet.
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    const esApi = url.pathname.startsWith('/api/');
    const esMismoOrigen = url.origin === self.location.origin;

    if (event.request.method !== 'GET' || esApi || !esMismoOrigen) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copia = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
