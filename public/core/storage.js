// 年度数据 IndexedDB 持久化存储（超出 localStorage 配额时自动降级与 LRU 清理）

const DB_NAME = 'aomen_liuhe_db';
const DB_VERSION = 1;
const STORE_NAME = 'yearCache';

let dbPromise = null;

function openDb() {
    if (typeof indexedDB === 'undefined') return Promise.resolve(null);
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
        try {
            const req = indexedDB.open(DB_NAME, DB_VERSION);
            req.onupgradeneeded = () => {
                const db = req.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'year' });
                }
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
    return dbPromise;
}

export async function idbGetYear(year) {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.get(String(year));
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => resolve(null);
        } catch (e) {
            resolve(null);
        }
    });
}

export async function idbSetYear(year, rawPayload) {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const req = store.put({
                year: String(year),
                payload: rawPayload,
                updatedAt: Date.now()
            });
            req.onsuccess = () => resolve(true);
            req.onerror = () => resolve(false);
        } catch (e) {
            resolve(false);
        }
    });
}

export async function idbClearYears(years = null) {
    const db = await openDb();
    if (!db) return false;
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            if (!Array.isArray(years)) {
                store.clear();
            } else {
                years.forEach((y) => store.delete(String(y)));
            }
            tx.oncomplete = () => resolve(true);
            tx.onerror = () => resolve(false);
        } catch (e) {
            resolve(false);
        }
    });
}

export function safeLocalStorageWriteYear(year, rawPayload, now = Date.now()) {
    if (typeof localStorage === 'undefined') return false;
    const cacheKey = `lottery_data_${year}`;
    const serialized = JSON.stringify(rawPayload);
    try {
        localStorage.setItem(cacheKey, serialized);
        localStorage.setItem(`${cacheKey}_time`, now.toString());
        localStorage.setItem(`lottery_req_debounce_${year}`, now.toString());
        return true;
    } catch (err) {
        // 配额超出时按时间淘汰最旧的历史年份数据后重试一次
        try {
            const entries = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && /^lottery_data_\d{4}$/.test(k) && k !== cacheKey) {
                    const y = k.replace('lottery_data_', '');
                    const ts = parseInt(localStorage.getItem(`${k}_time`) || '0', 10);
                    entries.push({ y, ts });
                }
            }
            entries.sort((a, b) => a.ts - b.ts);
            for (const entry of entries) {
                localStorage.removeItem(`lottery_data_${entry.y}`);
                localStorage.removeItem(`lottery_data_${entry.y}_time`);
                localStorage.removeItem(`lottery_req_debounce_${entry.y}`);
                try {
                    localStorage.setItem(cacheKey, serialized);
                    localStorage.setItem(`${cacheKey}_time`, now.toString());
                    localStorage.setItem(`lottery_req_debounce_${year}`, now.toString());
                    return true;
                } catch (retryErr) {
                    // continue evicting older entries
                }
            }
        } catch (e) {}
        return false;
    }
}
