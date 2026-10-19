// Keeps the app working offline. The page is fetched fresh when online so updates
// arrive right away; the speech engine and icons are served from the cache.
const CACHE = 'elite-prompter-v6';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'vendor/vosk.js', 'icons/icon-192.png', 'icons/icon-512.png', 'audience.html', 'vendor/pdfjs/pdf.min.js', 'vendor/pdfjs/pdf.worker.min.js', 'slides.js'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.endsWith('.tar.gz')) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put('index.html', copy)); return r;
    }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
