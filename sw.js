const V = "rota-cacd-v1";
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'css/app.css', 'js/main.js', 'js/data.js', 'js/db.js', 'js/exercise.js', 'js/util.js',
  'fonts/atkinson-hyperlegible-latin-400-normal.woff2', 'fonts/atkinson-hyperlegible-latin-700-normal.woff2', 'fonts/literata-latin-wght-normal.woff2', 'fonts/literata-latin-wght-italic.woff2',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await c.addAll(SHELL);
    const m = await fetch('data/manifest.json', { cache: 'no-store' }); await c.put('data/manifest.json', m.clone());
    const man = await m.json(); await c.addAll(man.pacotes.map(p => 'data/' + p.arquivo));
    self.skipWaiting();
  })());
});
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.url.includes('data/manifest.json')) {   // rede primeiro; cache se estiver offline
    e.respondWith(fetch(r).then(x => { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); return x; }).catch(() => caches.match(r, { ignoreSearch: true })));
    return;
  }
  const pacote = r.url.includes('/data/packs/');   // arquivos de pacote têm versão no nome: cache primeiro
  e.respondWith(caches.match(r, { ignoreSearch: true }).then(h => {
    const rede = fetch(r).then(x => { if (x.ok) { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); } return x; });
    if (h) { if (!pacote) rede.catch(() => {}); return h; }          // resto do app: devolve o cache e atualiza em segundo plano
    return rede.catch(() => r.mode === 'navigate' ? caches.match('index.html') : Response.error());
  }));
});
