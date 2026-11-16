// 滚动胜率曲线、Sparkline SVG 与量化回测统计纯函数模块
import { escapeHtml } from './config.js';

export function computeRollingSuccessSeries(boolSeries, windowSize = 5) {
    if (!Array.isArray(boolSeries) || boolSeries.length === 0) {
        return { points: [], hits: 0, total: 0, overallRate: 0, recentRate: 0, trend: 'flat' };
    }
    const total = boolSeries.length;
    let hits = 0;
    const points = [];
    for (let i = 0; i < total; i++) {
        if (boolSeries[i]) hits++;
        const start = Math.max(0, i - windowSize + 1);
        let winHits = 0;
        for (let j = start; j <= i; j++) {
            if (boolSeries[j]) winHits++;
        }
        const winLen = i - start + 1;
        points.push(Math.round((winHits / winLen) * 100));
    }
    const overallRate = Math.round((hits / total) * 100);
    const recentRate = points[points.length - 1] || 0;
    const trend = recentRate > overallRate + 5 ? 'up' : recentRate < overallRate - 5 ? 'down' : 'flat';
    return { points, hits, total, overallRate, recentRate, trend };
}

export function buildTrendSparklineHtml(boolSeries, options = {}) {
    if (!Array.isArray(boolSeries) || boolSeries.length < 2) return '';
    const {
        width = 48,
        height = 14,
        windowSize = 5,
        highThreshold = 50,
        midThreshold = 30,
        label = '历史命中趋势',
        compact = false,
        showPercent = true,
        clickable = true
    } = options;

    const stats = computeRollingSuccessSeries(boolSeries, windowSize);
    const { points, hits, total, overallRate, recentRate, trend } = stats;
    const toneColor = overallRate >= highThreshold ? 'var(--up)' : overallRate >= midThreshold ? 'var(--warn)' : 'var(--down)';
    const trendArrow = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '';

    const padX = 1.5;
    const padY = 2;
    const innerW = Math.max(4, width - padX * 2);
    const innerH = Math.max(4, height - padY * 2);
    const denom = Math.max(1, points.length - 1);

    const coords = points.map((val, idx) => {
        const x = (padX + (idx / denom) * innerW).toFixed(1);
        const y = (padY + (1 - Math.max(0, Math.min(100, val)) / 100) * innerH).toFixed(1);
        return [x, y];
    });

    const polylinePoints = coords.map(c => `${c[0]},${c[1]}`).join(' ');
    const areaPoints = `${coords[0][0]},${height - padY} ${polylinePoints} ${coords[coords.length - 1][0]},${height - padY}`;
    const lastCoord = coords[coords.length - 1];
    const avgY = (padY + (1 - Math.max(0, Math.min(100, overallRate)) / 100) * innerH).toFixed(1);
    const tooltip = escapeHtml(`${label} · 近${total}期命中 ${hits}/${total} (${overallRate}%) · 近${Math.min(windowSize, total)}期滚动 ${recentRate}%`);

    const svgHtml = `<svg class="rec-sparkline-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true"><line x1="${padX}" y1="${avgY}" x2="${width - padX}" y2="${avgY}" stroke="currentColor" stroke-opacity="0.24" stroke-width="0.8" stroke-dasharray="2,2"/><polygon points="${areaPoints}" fill="currentColor" fill-opacity="0.16"/><polyline points="${polylinePoints}" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${lastCoord[0]}" cy="${lastCoord[1]}" r="1.7" fill="currentColor"/></svg>`;

    const pctHtml = showPercent ? `<span class="rec-sparkline-pct">${overallRate}%${trendArrow}</span>` : '';

    if (compact) {
        return `<div class="rec-sparkline-mini" style="color:${toneColor};" title="${tooltip}">${svgHtml}${pctHtml}</div>`;
    }
    const clickAttr = clickable ? ` onclick="event.stopPropagation();openRecHistoryModal(${total})"` : '';
    return `<span class="rec-sparkline-pill" style="color:${toneColor};" title="${tooltip} (点击查看详细复盘)"${clickAttr}>${svgHtml}${pctHtml}</span>`;
}

export function calcBacktestStats(slice) {
    let wins = 0, loss = 0, flat = 0, sum = 0, curUp = 0, maxUp = 0, curDown = 0, maxDown = 0;
    (slice || []).forEach(d => {
        const s = d.step || 0;
        sum += s;
        if (s > 0) { wins++; curUp++; curDown = 0; maxUp = Math.max(maxUp, curUp); }
        else if (s < 0) { loss++; curDown++; curUp = 0; maxDown = Math.max(maxDown, curDown); }
        else { flat++; curUp = 0; curDown = 0; }
    });
    const valid = (slice || []).length - flat;
    return {
        wins, loss, flat, sum, maxUp, maxDown,
        winRate: valid > 0 ? wins / valid * 100 : 0
    };
}

export function calculateKlineQuantMetrics(data) {
    if (!data || !data.length) {
        return {
            total: 0,
            hits: 0,
            misses: 0,
            winRate: 0,
            maxWinStreak: 0,
            maxLossStreak: 0,
            currentStreak: { type: 'none', count: 0 },
            avgCycle: 0,
            roi: '0.0'
        };
    }

    const total = data.length;
    let hits = 0;
    let maxWinStreak = 0;
    let maxLossStreak = 0;
    let curWin = 0;
    let curLoss = 0;
    const intervals = [];
    let lastHitIdx = -1;

    data.forEach((d, idx) => {
        const isWin = (d.step || 0) > 0;
        if (isWin) {
            hits++;
            curWin++;
            curLoss = 0;
            if (curWin > maxWinStreak) maxWinStreak = curWin;
            if (lastHitIdx >= 0) {
                intervals.push(idx - lastHitIdx);
            }
            lastHitIdx = idx;
        } else {
            curLoss++;
            curWin = 0;
            if (curLoss > maxLossStreak) maxLossStreak = curLoss;
        }
    });

    const misses = total - hits;
    const winRate = total > 0 ? (hits / total) * 100 : 0;
    const avgCycle = intervals.length ? (intervals.reduce((a, b) => a + b, 0) / intervals.length).toFixed(1) : (hits > 0 ? (total / hits).toFixed(1) : '-');
    const scoreSum = data.reduce((acc, d) => acc + (d.step || 0), 0);
    const roi = total > 0 ? ((scoreSum / total) * 100).toFixed(1) : '0.0';

    let currentStreakType = 'none';
    let currentStreakCount = 0;
    if (data.length > 0) {
        const lastWin = (data[data.length - 1].step || 0) > 0;
        currentStreakType = lastWin ? 'win' : 'loss';
        for (let i = data.length - 1; i >= 0; i--) {
            const w = (data[i].step || 0) > 0;
            if (w === lastWin) {
                currentStreakCount++;
            } else {
                break;
            }
        }
    }

    return {
        total,
        hits,
        misses,
        winRate,
        maxWinStreak,
        maxLossStreak,
        currentStreak: { type: currentStreakType, count: currentStreakCount },
        avgCycle,
        scoreSum,
        roi
    };
}
