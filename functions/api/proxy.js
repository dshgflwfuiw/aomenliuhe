// Cloudflare Pages Function
// 路由: /api/proxy?year=2026
// 作用: 服务端拉取开奖数据并返回, 解决浏览器跨域问题; 自带边缘缓存。

const UPSTREAM = 'https://history.macaumarksix.com/history/macaujc2/y/';

export async function onRequestGet(context) {
    const { request, waitUntil } = context;
    const url = new URL(request.url);
    const year = url.searchParams.get('year') || '';

    if (!/^\d{4}$/.test(year)) {
        return json({ error: 'year 参数必须为4位年份, 例如 ?year=2026' }, 400);
    }

    // 边缘缓存: 同一年份在缓存有效期内直接返回, 不重复请求上游
    const cache = caches.default;
    const cacheKey = new Request(`https://data-proxy.local/${year}`, { method: 'GET' });

    try {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
    } catch (e) {
        // Cache API 不可用时忽略, 直接走上游
    }

    try {
        const upstream = await fetch(UPSTREAM + year, {
            headers: { Accept: 'application/json' }
        });

        if (!upstream.ok) {
            const status = upstream.status >= 500 ? 502 : upstream.status;
            return json({ error: `上游返回 HTTP ${upstream.status}` }, status);
        }

        const data = await upstream.json();
        const response = json(data, 200, {
            'Cache-Control': 'public, max-age=3600'
        });

        try {
            waitUntil(cache.put(cacheKey, response.clone()));
        } catch (e) {
            // 缓存写入失败不影响正常返回
        }

        return response;
    } catch (err) {
        return json({ error: '上游请求失败', detail: String(err) }, 502);
    }
}

function json(payload, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(payload), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            ...extraHeaders
        }
    });
}
