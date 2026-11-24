/* RALLYE NOTE — fonctionnement hors connexion.
   À chaque nouvelle version : changer CACHE ici ET APP_VERSION dans index.html. */
const CACHE = 'rallye-note-v15';
const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

/* Installation : on garde une copie de l'appli sur la tablette */
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

/* Activation : on supprime les anciennes copies */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('rallye-note-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  /* Page de l'appli : réseau d'abord (pour recevoir les mises à jour), copie si pas de réseau.
     Réseau faible en spéciale : après 3 s sans réponse, on ouvre la copie. */
  if (req.mode === 'navigate') {
    const fromCache = () => caches.match('./index.html').then(r => r || caches.match('./'));
    const net = fetch(req).then(r => {
      if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); }
      return r;
    });
    const slow = new Promise(res => setTimeout(res, 3000)).then(fromCache);
    e.respondWith(
      Promise.race([net.catch(fromCache), slow.then(r => r || net)])
        .then(r => r || net)
        .catch(fromCache)
    );
    return;
  }

  /* Icônes, manifeste… : copie d'abord, réseau sinon */
  e.respondWith(
    caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
