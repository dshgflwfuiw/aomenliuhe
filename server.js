import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

const UPSTREAM = 'https://history.macaumarksix.com/history/macaujc2/y/';
const cache = new Map();

// API proxy endpoint matching Cloudflare Pages function behavior
app.get('/api/proxy', async (req, res) => {
    const year = req.query.year || '';

    if (!/^\d{4}$/.test(year)) {
        return res.status(400).json({ error: 'year 参数必须为4位年份, 例如 ?year=2026' });
    }

    const now = Date.now();
    if (cache.has(year)) {
        const cachedItem = cache.get(year);
        if (cachedItem && now - cachedItem.timestamp < 3600 * 1000) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.json(cachedItem.data);
        }
    }

    try {
        const upstream = await fetch(UPSTREAM + year, {
            headers: { Accept: 'application/json' }
        });

        if (!upstream.ok) {
            const status = upstream.status >= 500 ? 502 : upstream.status;
            return res.status(status).json({ error: `上游返回 HTTP ${upstream.status}` });
        }

        const data = await upstream.json();
        cache.set(year, { timestamp: now, data });
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.json(data);
    } catch (err) {
        return res.status(502).json({ error: '上游请求失败', detail: String(err) });
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
