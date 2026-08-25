// ── Service worker: chơi được hoàn toàn ngoại tuyến sau lần mở đầu ──────────
// Đổi CACHE khi phát hành bản mới → bản cũ tự bị dọn.
const CACHE = 'cricko-v1.20.2';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/audio/chiptune.js',
  './js/audio/songs.js',
  './js/core/i18n.js',
  './js/core/layout.js',
  './js/core/lore.js',
  './js/core/perf.js',
  './js/core/state.js',
  './js/core/util.js',
  './js/core/version.js',
  './js/data/beats.js',
  './js/data/cast.js',
  './js/data/characters.js',
  './js/data/duel.js',
  './js/data/gear.js',
  './js/data/levels.js',
  './js/data/story.js',
  './js/game/board.js',
  './js/game/bubble.js',
  './js/game/cricket.js',
  './js/game/enemy.js',
  './js/game/fx.js',
  './js/game/gems.js',
  './js/main.js',
  './js/render/background.js',
  './js/scenes/chapter.js',
  './js/scenes/duel.js',
  './js/scenes/egg.js',
  './js/scenes/help.js',
  './js/scenes/map.js',
  './js/scenes/nest.js',
  './js/scenes/pair.js',
  './js/scenes/play.js',
  './js/scenes/region.js',
  './js/scenes/shoot.js',
  './js/scenes/shop.js',
  './js/scenes/story.js',
  './js/scenes/title.js',
  './js/scenes/world.js',
  './js/ui/widgets.js',
  './fonts/baloo2.ttf',
  './fonts/bungee.ttf',
  './fonts/bvp600.ttf',
  './fonts/bvp800.ttf',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-64.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    // addAll thất bại toàn bộ nếu 1 file lỗi → thêm từng file để bản cài vẫn dùng được
    await Promise.all(SHELL.map(u => c.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin !== location.origin) return;   // game không tải gì từ bên ngoài

  // Tài nguyên của game: cache trước cho nhanh, đồng thời cập nhật ngầm
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { net; return hit; }
    const r = await net;
    return r || (await c.match('./index.html')) || Response.error();
  })());
});
