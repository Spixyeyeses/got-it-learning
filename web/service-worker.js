const CACHE_NAME = 'got-it-learning-v26-global-sensory-20260814';
const APP_SHELL = [
  './index.html',
  './games.html',
  './manifest.webmanifest',
  './favicon.svg',
  './styles/index.css',
  './styles/learning-v2.css',
  './styles/shell-v11.css',
  './styles/tactile-v8.css',
  './styles/icon-controls-v9.css',
  './styles/games.css',
  './styles/touch-controls.css',
  './assets/nameless-academy-logo.png',
  './assets/fonts/noto-serif-sc-700.woff2',
  './assets/titles/first-step.jpg',
  './assets/titles/bronze-apprentice.jpg',
  './assets/titles/silver-explorer.jpg',
  './assets/titles/golden-scholar.jpg',
  './assets/titles/peerless.jpg',
  './assets/titles/steady.jpg',
  './assets/titles/precision.jpg',
  './assets/titles/perfect.jpg',
  './assets/titles/math-master.jpg',
  './assets/titles/english-master.jpg',
  './assets/titles/science-master.jpg',
  './assets/titles/all-rounder.jpg',
  './assets/titles/streak-3.jpg',
  './assets/titles/streak-7.jpg',
  './assets/titles/streak-30.jpg',
  './src/config/content.js',
  './src/config/learning-ai.js',
  './src/config/remote.js',
  './src/shared/remote-client.js',
  './src/shared/curriculum-contract-v3.js',
  './src/shared/practice-selector-v3.js',
  './src/shared/knowledge-lessons-math-v1.js',
  './src/shared/knowledge-lesson-library-v1.js',
  './src/shared/knowledge-visuals-v1.js',
  './src/shared/lesson-demo-v3.js',
  './src/generated/question-banks.js',
  './src/generated/curriculum-content.js',
  './src/app/state.js',
  './src/app/curriculum-v3.js',
  './src/app/usage.js',
  './src/app/bank-loader.js',
  './src/app/account.js',
  './src/app/admin.js',
  './src/app/exchange.js',
  './src/app/quiz-navigation.js',
  './src/app/learning-platform.js',
  './src/app/guardian.js',
  './src/app/product-suite.js',
  './src/app/tactile-v8.js',
  './src/app/bootstrap.js',
  './src/games/access-gate.js',
  './src/games/online.js',
  './src/games/core.js',
  './src/games/gomoku.js',
  './src/games/rhythm.js',
  './src/games/reaction.js',
  './src/games/pacman.js',
  './src/games/snake.js',
  './src/games/breakout.js',
  './src/games/blocks.js',
  './src/games/invaders.js',
  './src/games/stick.js',
  './src/games/chess.js',
  './src/games/battleship.js',
  './src/games/lifecycle.js',
  './assets/stick-controls/attack.png',
  './assets/stick-controls/block.png',
  './assets/stick-controls/kick.png',
  './data/math.json',
  './data/english.json',
  './data/science.json',
  './data/curriculum/catalog.v3.json',
  './data/curriculum/packages/cn-2022-math-g1-pilot/package.json',
  './data/curriculum/packages/cn-2022-math-g1-pilot/g1-first-number-foundation.json'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.includes('/api/')) return;
  const contentRequest = /\/data\/(math|english|science)\.json$/.test(url.pathname) || /\/data\/curriculum\/.*\.json$/.test(url.pathname);
  if (contentRequest) {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
      return response;
    }).catch(() => caches.match(request, { ignoreSearch: true })));
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true }).then(cached => cached || fetch(request).then(response => {
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
    return response;
  })));
});
