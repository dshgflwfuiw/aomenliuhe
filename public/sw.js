const CACHE_NAME = 'aomen-liuhe-v2';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/favicon.svg',
    '/manifest.json',
    '/pwa-192x192.png',
    '/pwa-512x512.png',
    '/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 仅处理同源 GET 请求
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;

    // API 请求：网络优先，强制刷新 (?refresh=1) 不读缓存，离线时回退缓存
    if (url.pathname.startsWith('/api/')) {
        const isForceRefresh = url.searchParams.get('refresh') === '1';
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => {
                    if (isForceRefresh) return new Response(JSON.stringify({ error: 'Offline' }), { status: 503 });
                    return caches.match(request);
                })
        );
        return;
    }

    // HTML 文档与页面导航：网络优先，确保每次部署后首刷即见最新版本
    const isHtmlDoc = request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
    if (isHtmlDoc) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response && response.status === 200) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                    }
                    return response;
                })
                .catch(() => caches.match(request).then((res) => res || caches.match('/index.html')))
        );
        return;
    }

    // 带版本号的静态资源：缓存优先 + 后台更新 (stale-while-revalidate)
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
