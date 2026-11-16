// Cloudflare Pages Function
// 路由: /api/proxy?year=2026
// 作用: 服务端拉取开奖数据并返回, 解决浏览器跨域问题; 自带边缘缓存。

const UPSTREAM = 'https://history.macaumarksix.com/history/macaujc2/y/';
const UPSTREAM_TIMEOUT_MS = 10000;

function getProxyTtlSeconds(year) {
    const currentYear = new Date().getFullYear();
    const targetYear = parseInt(year, 10);
    return (!isNaN(targetYear) && targetYear < currentYear) ? 86400 : 120;
}

export async function onRequestGet(context) {
    const { request, waitUntil } = context;
    const url = new URL(request.url);
    const year = url.searchParams.get('year') || '';
    const forceRefresh = url.searchParams.get('refresh') === '1' || url.searchParams.get('refresh') === 'true';

    if (!/^\d{4}$/.test(year)) {
        return json({ error: 'year 参数必须为4位年份, 例如 ?year=2026' }, 400);
    }

    const ttlSeconds = getProxyTtlSeconds(year);

    // 边缘缓存: 同一年份在缓存有效期内直接返回, 不重复请求上游; refresh=1 时跳过缓存读
    const cache = caches.default;
    const cacheKey = new Request(`https://data-proxy.local/${year}`, { method: 'GET' });

    if (!forceRefresh) {
        try {
            const cached = await cache.match(cacheKey);
            if (cached) return cached;
        } catch (e) {
            // Cache API 不可用时忽略, 直接走上游
        }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        const upstream = await fetch(UPSTREAM + year, {
            headers: { Accept: 'application/json' },
            signal: controller.signal
        });

        if (!upstream.ok) {
            const status = upstream.status >= 500 ? 502 : upstream.status;
            return json({ error: `上游返回 HTTP ${upstream.status}` }, status);
        }

        const data = await upstream.json();
        const response = json(data, 200, {
            'Cache-Control': `public, max-age=${ttlSeconds}`
        });

        try {
            waitUntil(cache.put(cacheKey, response.clone()));
        } catch (e) {
            // 缓存写入失败不影响正常返回
        }

        return response;
    } catch (err) {
        try {
            const stale = await cache.match(cacheKey);
            if (stale) return stale;
        } catch (e) {}
        const isTimeout = err && err.name === 'AbortError';
        return json({
            error: isTimeout ? '上游请求超时' : '上游请求失败',
            detail: String(err)
        }, isTimeout ? 504 : 502);
    } finally {
        clearTimeout(timeoutId);
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
