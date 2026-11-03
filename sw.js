/* 술장부 서비스 워커
 * 앱 파일(이 사이트의 파일)을 항상 인터넷에서 먼저 새로 받아 온다.
 * 인터넷이 안 되거나 3초 넘게 걸리면 마지막으로 받아 둔 파일을 보여 준다.
 * 기록과 사진(api.github.com), 글꼴(cdn) 요청은 건드리지 않는다.
 *
 * 끄는 법: 이 파일 내용을 아래 두 줄로 바꿔 올리면 모든 기기에서 스스로 꺼진다.
 *   self.addEventListener('install', () => self.skipWaiting());
 *   self.addEventListener('activate', e => e.waitUntil(self.registration.unregister()));
 */
var CACHE = 'sul-girok-v1';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith((async function () {
    var cache = await caches.open(CACHE);
    var key = req.mode === 'navigate' ? new URL('./', self.registration.scope).href : url.href.split('#')[0];

    var fresh = fetch(url.href, { cache: 'no-store', credentials: 'same-origin' }).then(function (res) {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    });

    fresh.catch(function () {});
    var saved = await cache.match(key);
    if (!saved) return fresh;

    var timeout = new Promise(function (resolve) { setTimeout(function () { resolve(null); }, 3000); });
    try {
      var res = await Promise.race([fresh, timeout]);
      return res && res.ok ? res : saved;
    } catch (err) {
      return saved;
    }
  })());
});
