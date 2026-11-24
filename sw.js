/* RALLYE NOTE : fonctionnement hors connexion.
   L'application s'ouvre toujours depuis la mémoire de la tablette ;
   quand il y a du réseau, elle vérifie en arrière-plan s'il existe une nouvelle version
   (prise en compte à l'ouverture suivante). */
const CACHE = 'rallye-note-v9';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(e.request, { ignoreSearch: true })
      || (e.request.mode === 'navigate' ? await cache.match('./index.html') : null);
    const network = fetch(e.request).then(res => {
      if (res && res.ok && new URL(e.request.url).origin === location.origin) cache.put(e.request, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(network); return cached; }
    return (await network) || new Response('Hors connexion', { status: 503 });
  }));
});
