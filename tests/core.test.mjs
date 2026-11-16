import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
    CONFIG,
    escapeHtml,
    getZodiac,
    getColor,
    getJiaYe,
    getHalfWaveKey,
    getHalfHeadKey,
    getSegmentKey,
    getRegionKey,
    getRegionShortKey
} from '../public/core/config.js';
import {
    computeRollingSuccessSeries,
    buildTrendSparklineHtml,
    calcBacktestStats,
    calculateKlineQuantMetrics
} from '../public/core/rolling.js';
import { safeLocalStorageWriteYear } from '../public/core/storage.js';
import {
    applyShrinkMatrix,
    computeWindowWeightDeviation,
    getMultiFactorRecommendations,
    getDanBaseKillRecommendations,
    getSumSpanRecommendations,
    getNormalTrackRecommendations,
    getAutoOptimizedStrategy,
    computeStrategyLookbackRecords
} from '../public/core/strategyEngine.js';

function createSyntheticHistory(count = 45, year = 2026) {
    const history = [];
    const zOm = {};
    const nOm = {};
    const zCnt = {};
    const cOm = { red: 0, blue: 0, green: 0 };
    const sOm = { big: 0, small: 0 };
    (CONFIG.zodiacMap[year] || CONFIG.zodiacMap[2026]).forEach(z => {
        zOm[z] = 0;
        zCnt[z] = 0;
    });
    for (let i = 1; i <= 49; i++) {
        nOm[i.toString().padStart(2, '0')] = 0;
    }

    for (let idx = 0; idx < count; idx++) {
        const spNum = ((idx * 7 + 3) % 49) + 1;
        const spStr = spNum.toString().padStart(2, '0');
        const normals = [];
        for (let b = 1; b <= 6; b++) {
            const n = ((idx * 5 + b * 8) % 49) + 1;
            const candidate = n === spNum ? ((n % 49) + 1) : n;
            normals.push(candidate.toString().padStart(2, '0'));
        }
        const spZodiac = getZodiac(spNum, year);
        const spColor = getColor(spStr);
        const spSize = spNum >= 25 ? 'big' : 'small';

        Object.keys(zOm).forEach(z => { zOm[z] = z === spZodiac ? 0 : zOm[z] + 1; });
        zCnt[spZodiac] = (zCnt[spZodiac] || 0) + 1;
        Object.keys(nOm).forEach(ns => { nOm[ns] = ns === spStr ? 0 : nOm[ns] + 1; });
        ['red', 'blue', 'green'].forEach(c => { cOm[c] = c === spColor ? 0 : cOm[c] + 1; });
        sOm.big = spSize === 'big' ? 0 : sOm.big + 1;
        sOm.small = spSize === 'small' ? 0 : sOm.small + 1;

        const allBalls = [...normals, spStr];
        const totalSum = allBalls.reduce((sum, s) => sum + parseInt(s, 10), 0);
        const sorted = allBalls.map(s => parseInt(s, 10)).sort((a, b) => a - b);

        history.push({
            period: `${year}${(idx + 1).toString().padStart(3, '0')}`,
            expect: `${year}${(idx + 1).toString().padStart(3, '0')}`,
            special: spStr,
            winNum: spNum,
            win: spZodiac,
            numbers: normals,
            codes: allBalls.map(num => ({ num })),
            zodiac: allBalls.map(num => getZodiac(parseInt(num, 10), year)).join(','),
            currentColor: spColor,
            currentSize: spSize,
            snapshot: { ...zOm },
            numberSnapshot: { ...nOm },
            counts: { ...zCnt },
            colorOmissions: { ...cOm },
            colorMaxOmissions: { red: 8, blue: 8, green: 8 },
            sizeOmissions: { ...sOm },
            totalSum,
            normalSpan: sorted[sorted.length - 1] - sorted[0]
        });
    }
    return history;
}

describe('public/core/config.js', () => {
    it('resolves zodiacs accurately across years 2020-2026', () => {
        assert.equal(getZodiac(1, 2026), '马');
        assert.equal(getZodiac(13, 2026), '马');
        assert.equal(getZodiac(49, 2026), '马');
        assert.equal(getZodiac(2, 2026), '蛇');
        assert.equal(getZodiac(1, 2025), '蛇');
        assert.equal(getZodiac(1, 2024), '龙');
        assert.equal(getZodiac(1, 2020), '鼠');
    });

    it('resolves wave colors, attribute keys, and escapes HTML', () => {
        assert.equal(getColor('01'), 'red');
        assert.equal(getColor('03'), 'blue');
        assert.equal(getColor('49'), 'green');
        assert.equal(getJiaYe('牛'), 'jia');
        assert.equal(getJiaYe('虎'), 'ye');
        assert.equal(getHalfWaveKey('01'), '红单');
        assert.equal(getHalfHeadKey(24), '2头双');
        assert.equal(getSegmentKey(14), '08-14段');
        assert.equal(getRegionKey(25), '三区(21-30)');
        assert.equal(getRegionShortKey(45), '5区');
        assert.equal(
            escapeHtml(`<img src="x" onerror='alert(1)'> & "test"`),
            '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt; &amp; &quot;test&quot;'
        );
    });
});

describe('public/core/rolling.js', () => {
    it('computes rolling success series and trend direction', () => {
        assert.deepEqual(computeRollingSuccessSeries([], 5), {
            points: [], hits: 0, total: 0, overallRate: 0, recentRate: 0, trend: 'flat'
        });

        const upSeries = [false, false, false, false, false, true, true, true, true, true];
        const upRes = computeRollingSuccessSeries(upSeries, 5);
        assert.equal(upRes.hits, 5);
        assert.equal(upRes.total, 10);
        assert.equal(upRes.overallRate, 50);
        assert.equal(upRes.recentRate, 100);
        assert.equal(upRes.trend, 'up');

        const downSeries = [true, true, true, true, true, false, false, false, false, false];
        const downRes = computeRollingSuccessSeries(downSeries, 5);
        assert.equal(downRes.trend, 'down');
    });

    it('renders safe SVG sparkline HTML and ignores <2 points', () => {
        assert.equal(buildTrendSparklineHtml([true]), '');
        const html = buildTrendSparklineHtml([true, false, true, true], {
            label: '"><script>alert(1)</script>',
            compact: false
        });
        assert.ok(html.includes('<svg'));
        assert.ok(html.includes('75%'));
        assert.ok(!html.includes('<script>'));
        assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
    });

    it('calculates backtest & K-line quantitative metrics', () => {
        const bt = calcBacktestStats([{ step: 1 }, { step: 1 }, { step: -1 }, { step: 0 }, { step: 1 }]);
        assert.equal(bt.wins, 3);
        assert.equal(bt.loss, 1);
        assert.equal(bt.flat, 1);
        assert.equal(bt.maxUp, 2);
        assert.equal(bt.maxDown, 1);
        assert.equal(bt.winRate, 75);

        const qm = calculateKlineQuantMetrics([
            { step: 1 }, { step: -1 }, { step: -1 }, { step: 1 }, { step: 1 }, { step: 1 }
        ]);
        assert.equal(qm.total, 6);
        assert.equal(qm.hits, 4);
        assert.equal(qm.misses, 2);
        assert.equal(qm.maxWinStreak, 3);
        assert.equal(qm.maxLossStreak, 2);
        assert.deepEqual(qm.currentStreak, { type: 'win', count: 3 });
    });
});

describe('public/core/storage.js', () => {
    it('evicts oldest year entries on QuotaExceededError', () => {
        const store = new Map([
            ['lottery_data_2022', 'x'.repeat(20)],
            ['lottery_data_2022_time', '100'],
            ['lottery_data_2023', 'y'.repeat(20)],
            ['lottery_data_2023_time', '200']
        ]);
        let failedOnce = false;
        const origLS = globalThis.localStorage;
        globalThis.localStorage = {
            get length() { return store.size; },
            key(i) { return Array.from(store.keys())[i] ?? null; },
            getItem(k) { return store.has(k) ? store.get(k) : null; },
            setItem(k, v) {
                if (k === 'lottery_data_2026' && !failedOnce && store.has('lottery_data_2022')) {
                    failedOnce = true;
                    const err = new Error('QuotaExceededError');
                    err.name = 'QuotaExceededError';
                    throw err;
                }
                store.set(k, String(v));
            },
            removeItem(k) { store.delete(k); }
        };

        try {
            const ok = safeLocalStorageWriteYear(2026, [{ expect: '2026001' }], 999);
            assert.equal(ok, true);
            assert.equal(store.has('lottery_data_2022'), false);
            assert.equal(store.has('lottery_data_2026'), true);
            assert.equal(store.get('lottery_data_2026_time'), '999');
        } finally {
            globalThis.localStorage = origLS;
        }
    });
});

describe('public/core/strategyEngine.js', () => {
    it('runs shrink matrix and all core strategies without DOM dependencies', () => {
        const history = createSyntheticHistory(45, 2026);
        const last = history[history.length - 1];
        const dev = computeWindowWeightDeviation(history, 30, 2026);
        assert.equal(dev.winSize, 30);

        const mf = getMultiFactorRecommendations(last, history, dev, {
            currentYear: 2026,
            recConfig: { weightCold: 50, weightMorph: 60, spanCount: 16, shrink: true }
        });
        assert.equal(mf.topNumbers.length, 16);
        assert.equal(mf.goldDan.length, 2);
        assert.equal(mf.silverDan.length, 3);

        const shrinkTest = applyShrinkMatrix(mf.allScored, 10);
        assert.equal(shrinkTest.result.length, 10);

        const dbk = getDanBaseKillRecommendations(last, history, dev, { currentYear: 2026 });
        assert.equal(dbk.killedNumbers.length, 8);
        const baseSet = new Set(dbk.baseNumbers.map(x => x.number));
        dbk.killedNumbers.forEach(k => assert.equal(baseSet.has(k.number), false));

        const ss = getSumSpanRecommendations(last, history, dev, { currentYear: 2026 });
        assert.ok(ss.topNumbers.length > 0);
        assert.ok(ss.metrics && ss.metrics.sumAdvice.length > 0);

        const normal = getNormalTrackRecommendations(last, history, dev, { currentYear: 2026 });
        assert.equal(normal.topFlatZodiacs.length, 4);
        assert.equal(normal.topFlatTails.length, 3);

        const autoOpt = getAutoOptimizedStrategy(last, history, dev, { currentYear: 2026 });
        assert.ok(autoOpt.best && autoOpt.presets.length >= 3);
    });

    it('produces lookback records across all strategies with zero future data leakage', () => {
        const strategies = [
            ['multifactor', 'special'],
            ['sum_span', 'special'],
            ['dan_base_kill', 'special'],
            ['auto_opt', 'special'],
            ['omission', 'special'],
            ['balance', 'special'],
            ['hot', 'special'],
            ['color', 'special'],
            ['size', 'special'],
            ['normal_track', 'normal']
        ];

        const baseHistory = createSyntheticHistory(45, 2026);
        for (const [strat, track] of strategies) {
            const lb = computeStrategyLookbackRecords(baseHistory, 12, strat, track, { currentYear: 2026 });
            assert.equal(lb.count, 12);
            assert.equal(lb.records.length, 12);
            assert.ok(lb.winRate >= 0 && lb.winRate <= 100);
        }

        // Future draw leakage guard: altering the last draw [44] must NEVER change predictions generated for earlier draws [43]
        const mutatedHistory = createSyntheticHistory(45, 2026);
        mutatedHistory[44].special = mutatedHistory[44].special === '49' ? '01' : '49';
        mutatedHistory[44].win = getZodiac(parseInt(mutatedHistory[44].special, 10), 2026);
        mutatedHistory[44].currentColor = getColor(mutatedHistory[44].special);

        const lbA = computeStrategyLookbackRecords(baseHistory, 10, 'multifactor', 'special', { currentYear: 2026 });
        const lbB = computeStrategyLookbackRecords(mutatedHistory, 10, 'multifactor', 'special', { currentYear: 2026 });

        // index 1 in unshifted records corresponds to draw [43]; index 0 corresponds to draw [44]
        assert.deepEqual(lbA.records[1].topNumbers, lbB.records[1].topNumbers);
        assert.deepEqual(lbA.records[0].topNumbers, lbB.records[0].topNumbers);
    });
});
