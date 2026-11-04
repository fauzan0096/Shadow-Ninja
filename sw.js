// The service worker: it keeps a copy of the game for offline play, and makes
// sure a new build is never hidden behind an old one.
//
// Fetches go to the network first, so the moment the game is published the new
// files are what loads; the cache is only the fallback for a dropped connection
// or no signal at all. Every cache carries the version below, and activating a
// new worker deletes every older cache, so nothing stale can survive an update.

const VERSION = '0.10.0';
const CACHE = `shadow-ninja-${VERSION}`;

// Everything the game needs to open and play with no network.
const PRECACHE = [
  'index.html',
  'main.css',
  'main.js',
  'phaser.min.js',
  'icon.png',
  'GameScene.js',
  'HudScene.js',
  'LevelSelectScene.js',
  'RecordsScene.js',
  'SettingsScene.js',
  'ShopScene.js',
  'TitleScene.js',
  'TouchControls.js',
  'format.js',
  'haptics.js',
  'icons.js',
  'layout.js',
  'levels.js',
  'orientation.js',
  'palette.js',
  'press.js',
  'progress.js',
  'scenery.js',
  'settings.js',
  'smooth.js',
  'sound.js',
  'sprites.js',
  'style.js',
  'symbols.js',
  'textures.js',
  'theme.js',
  'trial.js',
  'weather.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);

      // One missing file must not sink the whole install, so every entry is
      // fetched on its own and failures are simply skipped.
      await Promise.allSettled(
        PRECACHE.map((path) => cache.add(new Request(path, { cache: 'reload' })))
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name)));

      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);

      try {
        const fresh = await fetch(request);

        // Only a real answer is worth keeping; an error page never replaces a
        // good copy.
        if (fresh && fresh.ok) {
          cache.put(request, fresh.clone()).catch(() => {});
        }

        return fresh;
      } catch (error) {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;

        if (request.mode === 'navigate') {
          const shell = await cache.match('index.html', { ignoreSearch: true });
          if (shell) return shell;
        }

        return new Response('Offline', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      }
    })()
  );
});
