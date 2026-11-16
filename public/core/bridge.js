// ES Module 桥接入口：向全局 window.AppCore 暴露纯函数模块、IndexedDB 存储、Web Worker 客户端与 PWA 生命周期管理
import {
    CONFIG,
    ANALYSIS_MODE_LABELS,
    STRATEGY_NAME_MAP,
    escapeHtml,
    getZodiac,
    getColor,
    getJiaYe,
    getHalfWaveKey,
    getHalfHeadKey,
    getSegmentKey,
    getRegionKey,
    getRegionShortKey
} from './config.js';
import {
    computeRollingSuccessSeries,
    buildTrendSparklineHtml,
    calcBacktestStats,
    calculateKlineQuantMetrics
} from './rolling.js';
import {
    idbGetYear,
    idbSetYear,
    idbClearYears,
    safeLocalStorageWriteYear
} from './storage.js';
import * as StrategyEngine from './strategyEngine.js';

function createBacktestWorkerClient() {
    let worker = null;
    let seq = 0;
    const pending = new Map();

    function getWorker() {
        if (typeof Worker === 'undefined') return null;
        if (worker) return worker;
        try {
            worker = new Worker('/workers/backtest-worker.js?v=20261116a', { type: 'module' });
            worker.onmessage = (event) => {
                const { id, ok, result, error } = event.data || {};
                const task = pending.get(id);
                if (!task) return;
                pending.delete(id);
                if (ok) task.resolve(result);
                else task.reject(new Error(error || 'Worker failed'));
            };
            worker.onerror = (err) => {
                pending.forEach((task) => task.reject(err));
                pending.clear();
                worker = null;
            };
            return worker;
        } catch (e) {
            return null;
        }
    }

    function runTask(type, payload) {
        const w = getWorker();
        if (!w) {
            return Promise.reject(new Error('Web Worker unavailable'));
        }
        return new Promise((resolve, reject) => {
            const id = ++seq;
            pending.set(id, { resolve, reject });
            w.postMessage({ id, type, payload });
        });
    }

    return {
        runLookback(historyData, reviewCount, activeStrat, activeTrack, options) {
            return runTask('lookback', { historyData, reviewCount, activeStrat, activeTrack, options });
        },
        runPresetSparklines(payload) {
            return runTask('presetSparklines', payload);
        }
    };
}

function registerServiceWorkerAndNetworkStatus() {
    if (typeof window === 'undefined') return;

    window.addEventListener('offline', () => {
        if (typeof window.showToast === 'function') {
            window.showToast('⚠️ 当前处于离线状态，正在使用本地缓存数据', 3200);
        }
    });
    window.addEventListener('online', () => {
        if (typeof window.showToast === 'function') {
            window.showToast('✅ 网络已恢复连接', 2200);
        }
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then((reg) => {
                reg.addEventListener('updatefound', () => {
                    const installing = reg.installing;
                    if (!installing) return;
                    installing.addEventListener('statechange', () => {
                        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                            installing.postMessage({ type: 'SKIP_WAITING' });
                            if (typeof window.showToast === 'function') {
                                window.showToast('🔄 检测到新版本已就绪，刷新页面即可启用', 3500);
                            }
                        }
                    });
                });
            }).catch(() => {});
        });
    }
}

window.AppCore = {
    CONFIG,
    ANALYSIS_MODE_LABELS,
    STRATEGY_NAME_MAP,
    escapeHtml,
    getZodiac,
    getColor,
    getJiaYe,
    getHalfWaveKey,
    getHalfHeadKey,
    getSegmentKey,
    getRegionKey,
    getRegionShortKey,
    computeRollingSuccessSeries,
    buildTrendSparklineHtml,
    calcBacktestStats,
    calculateKlineQuantMetrics,
    storage: {
        idbGetYear,
        idbSetYear,
        idbClearYears,
        safeLocalStorageWriteYear
    },
    strategy: StrategyEngine,
    workerClient: createBacktestWorkerClient()
};

registerServiceWorkerAndNetworkStatus();
