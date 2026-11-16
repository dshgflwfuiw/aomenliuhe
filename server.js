import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const UPSTREAM = 'https://history.macaumarksix.com/history/macaujc2/y/';
const CACHE_MAX_ENTRIES = 24;
const UPSTREAM_TIMEOUT_MS = 10000;
const cache = new Map();

function getProxyTtlSeconds(year) {
    const currentYear = new Date().getFullYear();
    const targetYear = parseInt(year, 10);
    // 当年与未来年份采用短缓存(120秒)，往年已封存数据采用长缓存(24小时)
    return (!isNaN(targetYear) && targetYear < currentYear) ? 86400 : 120;
}

// API proxy endpoint matching Cloudflare Pages function behavior
app.get('/api/proxy', async (req, res) => {
    const year = String(req.query.year || '');
    const forceRefresh = req.query.refresh === '1' || req.query.refresh === 'true';

    if (!/^\d{4}$/.test(year)) {
        return res.status(400).json({ error: 'year 参数必须为4位年份, 例如 ?year=2026' });
    }

    const ttlSeconds = getProxyTtlSeconds(year);
    const ttlMs = ttlSeconds * 1000;
    const now = Date.now();

    if (!forceRefresh && cache.has(year)) {
        const cachedItem = cache.get(year);
        if (cachedItem && now - cachedItem.timestamp < ttlMs) {
            res.setHeader('Cache-Control', `public, max-age=${ttlSeconds}`);
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedItem.data);
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
            return res.status(status).json({ error: `上游返回 HTTP ${upstream.status}` });
        }

        const data = await upstream.json();
        if (cache.size >= CACHE_MAX_ENTRIES && !cache.has(year)) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey !== undefined) cache.delete(oldestKey);
        }
        cache.set(year, { timestamp: now, data });
        res.setHeader('Cache-Control', forceRefresh ? 'no-cache' : `public, max-age=${ttlSeconds}`);
        res.setHeader('X-Cache', forceRefresh ? 'BYPASS' : 'MISS');
        return res.json(data);
    } catch (err) {
        if (cache.has(year)) {
            const stale = cache.get(year);
            if (stale && stale.data) {
                res.setHeader('X-Cache', 'STALE');
                return res.json(stale.data);
            }
        }
        const isTimeout = err && err.name === 'AbortError';
        return res.status(isTimeout ? 504 : 502).json({
            error: isTimeout ? '上游请求超时' : '上游请求失败',
            detail: String(err)
        });
    } finally {
        clearTimeout(timeoutId);
    }
});

// Serve static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
});
