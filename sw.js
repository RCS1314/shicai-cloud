/* Service Worker: 让应用可离线使用（PWA）
   策略：网络优先（NETWORK FIRST）——只要联网就拉取服务器最新文件；
   网络不可用时回退缓存，保证离线可用。
   每次发布新版请同步递增 CACHE 版本号，旧缓存会自动清理。 */
const CACHE = 'foodcloud-v4';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  // 页面导航：优先网络，失败回退缓存
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 静态资源：优先网络，失败回退缓存（并缓存成功响应供离线）
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        if (res.ok && new URL(e.request.url).origin === location.origin) {
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
