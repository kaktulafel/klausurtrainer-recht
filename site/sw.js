// Service Worker: offline nach dem ersten Besuch. Cache-Name enthält die App-Version.
const VERSION = '__APP_VERSION__';
const CACHE = 'nk-recht-' + VERSION;
const SHELL = [
  './', 'index.html', '404.html', 'manifest.webmanifest', 'version.json',
  'css/app.css', 'css/print.css',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'js/app.js', 'js/router.js', 'js/store.js', 'js/data.js', 'js/storage-core.js', 'js/srs.js', 'js/grading.js',
  'js/normparser.js', 'js/ai.js', 'js/plan.js', 'js/textcheck.js', 'js/inhalte.js', 'js/klausur-core.js', 'js/ui/dom.js', 'js/ui/widgets.js',
  'js/views/dashboard.js', 'js/views/faelle.js', 'js/views/mc.js', 'js/views/normen.js', 'js/views/schemata.js',
  'js/views/wissen.js', 'js/views/klausur.js', 'js/views/schwachstellen.js', 'js/views/wiederholen.js',
  'js/views/statistik.js', 'js/views/einstellungen.js', 'js/views/mehr.js', 'js/views/info.js', 'js/views/nichtgefunden.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    try {
      const idx = await (await fetch('data/index.json', { cache: 'reload' })).json();
      const dateien = ['data/index.json', ...Object.values(idx.dateien).flat().map(d => 'data/' + d)];
      await c.addAll(dateien.map(u => new Request(u, { cache: 'reload' })));
    } catch { /* Daten werden später network-first nachgeladen */ }
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('nk-recht-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => { if (e.data && e.data.typ === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // z. B. api.anthropic.com nie anfassen
  const istHtml = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  const istDaten = url.pathname.includes('/data/') || url.pathname.endsWith('version.json');
  if (istHtml || istDaten) e.respondWith(networkFirst(req, istHtml));
  else e.respondWith(cacheFirst(req));
});

// Netz zuerst; bei Funkloch oder sehr langsamem Netz (> 4 s) die Kopie aus dem Cache.
async function networkFirst(req, istHtml) {
  const c = await caches.open(CACHE);
  const schluessel = istHtml ? 'index.html' : req;
  const netz = fetch(req).then(res => { if (res.ok) c.put(schluessel, res.clone()); return res; });
  netz.catch(() => { /* wird unten behandelt */ });
  try {
    const erster = await Promise.race([netz, new Promise(r => setTimeout(r, 4000, 'zeit'))]);
    if (erster !== 'zeit') return erster;
    return (await c.match(schluessel, { ignoreSearch: true })) || await netz;
  } catch {
    const hit = await c.match(schluessel, { ignoreSearch: true });
    if (hit) return hit;
    return new Response('Offline – Inhalt nicht im Cache.', { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } });
  }
}

async function cacheFirst(req) {
  const c = await caches.open(CACHE);
  const hit = await c.match(req, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) c.put(req, res.clone());
  return res;
}
