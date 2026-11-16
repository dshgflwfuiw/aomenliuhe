// Web Worker：在后台线程执行长周期策略回测与多预设并行评估，避免阻塞主线程交互
import { computeStrategyLookbackRecords } from '../core/strategyEngine.js';

self.onmessage = (event) => {
    const { id, type, payload } = event.data || {};
    try {
        if (type === 'lookback') {
            const { historyData, reviewCount, activeStrat, activeTrack, options } = payload;
            const result = computeStrategyLookbackRecords(historyData, reviewCount, activeStrat, activeTrack, options);
            self.postMessage({ id, ok: true, result });
        } else if (type === 'presetSparklines') {
            const { historyData, presets, currentYear, globalMaxOm, coldWindow } = payload;
            const results = {};
            presets.forEach((p) => {
                const lb = computeStrategyLookbackRecords(historyData, 16, p.strat, 'special', {
                    currentYear,
                    globalMaxOm,
                    coldWindow,
                    recConfig: {
                        weightCold: p.weightCold,
                        weightMorph: p.weightMorph,
                        spanCount: p.spanCount,
                        shrink: p.shrink,
                        track: 'special'
                    }
                });
                results[p.key] = (lb.records || []).slice().reverse().map((r) => !!r.isHit);
            });
            self.postMessage({ id, ok: true, result: results });
        } else {
            self.postMessage({ id, ok: false, error: 'Unknown worker task type' });
        }
    } catch (err) {
        self.postMessage({ id, ok: false, error: String(err && err.message ? err.message : err) });
    }
};
