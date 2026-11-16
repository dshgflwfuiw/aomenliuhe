// 纯函数策略计算与历史回测引擎（无 DOM 依赖，支持主线程、Web Worker 与 Node 单测）
import { CONFIG, getZodiac, getColor } from './config.js';

export function getMorphologyTags(numStr, historyData) {
    if (!historyData || historyData.length < 2) return [];
    const tags = [];
    const num = parseInt(numStr, 10);
    const last = historyData[historyData.length - 1];
    const prev = historyData[historyData.length - 2];

    const lastSpecial = parseInt(last.special, 10);
    const lastNums = (last.numbers || []).map(n => parseInt(n, 10));

    if (Math.abs(num - lastSpecial) === 1 || (num === 1 && lastSpecial === 49) || (num === 49 && lastSpecial === 1)) {
        tags.push('特邻号');
    } else if (lastNums.some(n => Math.abs(num - n) === 1)) {
        tags.push('正邻号');
    }

    if (num === lastSpecial) {
        tags.push('特重号');
    } else if (lastNums.includes(num)) {
        tags.push('平移特');
        tags.push('正重号');
    }

    if (prev) {
        const prevSpecial = parseInt(prev.special, 10);
        if (num === prevSpecial && num !== lastSpecial) {
            tags.push('隔期跳');
        }
    }

    const tail = num % 10;
    let maxTail = last._cachedHotTail;
    let maxTailCount = last._cachedHotTailCount;
    if (maxTail === undefined || maxTailCount === undefined) {
        const recentTails = {};
        const startIdx = Math.max(0, historyData.length - 10);
        for (let k = startIdx; k < historyData.length; k++) {
            const d = historyData[k];
            if (d && d.special) {
                const t = parseInt(d.special, 10) % 10;
                recentTails[t] = (recentTails[t] || 0) + 1;
            }
        }
        maxTail = 0;
        maxTailCount = 0;
        Object.entries(recentTails).forEach(([t, c]) => {
            if (c > maxTailCount) { maxTailCount = c; maxTail = parseInt(t, 10); }
        });
        last._cachedHotTail = maxTail;
        last._cachedHotTailCount = maxTailCount;
    }
    if (tail === maxTail && maxTailCount >= 2) {
        tags.push('同尾共振');
    }

    return tags;
}

export function applyShrinkMatrix(scoredNumbers, targetCount = 10) {
    if (!scoredNumbers || scoredNumbers.length <= targetCount) {
        return { result: scoredNumbers ? scoredNumbers.slice(0, targetCount) : [], shrinkCount: 0, details: [] };
    }
    const target = targetCount;
    const selected = [];
    const details = [];
    let shrinkCount = 0;

    const tailCounts = {};
    const zodiacCounts = {};
    const colorCounts = { red: 0, blue: 0, green: 0 };
    let oddCount = 0;
    let evenCount = 0;
    let extremeColdCount = 0;

    const maxPerTail = target <= 8 ? 1 : target <= 14 ? 2 : 3;
    const maxPerZodiac = target <= 10 ? 1 : target <= 16 ? 2 : 3;
    const maxColor = Math.ceil(target * 0.55);
    const maxExtremeCold = Math.max(1, Math.floor(target * 0.25));

    for (let i = 0; i < scoredNumbers.length; i++) {
        const item = scoredNumbers[i];
        const num = parseInt(item.number, 10);
        const tail = num % 10;
        const z = item.zodiac;
        const color = item.color;
        const isOdd = num % 2 !== 0;
        const isExtremeCold = item.currentOm >= 18;

        let rejectReason = null;

        if ((tailCounts[tail] || 0) >= maxPerTail) {
            rejectReason = `同尾(${tail}尾超标)`;
        } else if ((zodiacCounts[z] || 0) >= maxPerZodiac) {
            rejectReason = `同肖(${z}超标)`;
        } else if (isExtremeCold && extremeColdCount >= maxExtremeCold) {
            rejectReason = '极冷超跌过多';
        } else if ((colorCounts[color] || 0) >= maxColor && (selected.length < target - 2)) {
            rejectReason = `波色失衡(${color === 'red' ? '红' : color === 'blue' ? '蓝' : '绿'}波过载)`;
        } else if (selected.length >= target - 3) {
            if (isOdd && oddCount >= Math.ceil(target * 0.75)) {
                rejectReason = '奇数过载';
            } else if (!isOdd && evenCount >= Math.ceil(target * 0.75)) {
                rejectReason = '偶数过载';
            }
        }

        if (rejectReason && selected.length < target) {
            if (i < target) {
                shrinkCount++;
                details.push(`${item.number}(${rejectReason})`);
            }
            continue;
        }

        selected.push(item);
        tailCounts[tail] = (tailCounts[tail] || 0) + 1;
        zodiacCounts[z] = (zodiacCounts[z] || 0) + 1;
        if (colorCounts[color] !== undefined) colorCounts[color]++;
        if (isOdd) oddCount++; else evenCount++;
        if (isExtremeCold) extremeColdCount++;

        if (selected.length >= target) break;
    }

    if (selected.length < target) {
        for (const item of scoredNumbers) {
            if (!selected.some(s => s.number === item.number)) {
                selected.push(item);
                if (selected.length >= target) break;
            }
        }
    }

    return { result: selected, shrinkCount, details };
}

export function computeWindowWeightDeviation(historyData, customWin = null, currentYear = 2026) {
    if (!historyData || !historyData.length) {
        return { winSize: 30, transitionIntensity: 1.0, isTransitionRegime: false, overheatedCount: 0, numMap: {}, zodiacMap: {} };
    }
    const last = historyData[historyData.length - 1] || {};
    const rawWin = customWin !== null ? customWin : 50;
    const winSize = Math.max(10, Math.min(historyData.length, rawWin === Infinity ? Math.min(120, historyData.length) : (parseInt(rawWin, 10) || 50)));
    const shortSize = Math.max(5, Math.min(10, Math.floor(winSize * 0.35)));

    if (last._cachedWinDev && last._cachedWinDev.winSize === winSize && last._cachedWinDev.totalLen === historyData.length) {
        return last._cachedWinDev;
    }

    const winSlice = historyData.slice(-winSize);
    const shortSlice = historyData.slice(-shortSize);
    const numSnapshot = last.numberSnapshot || {};
    const zSnapshot = last.snapshot || {};

    const spFreqWin = {};
    const allFreqWin = {};
    const spFreqShort = {};
    const allFreqShort = {};
    const zSpFreqWin = {};
    const zSpFreqShort = {};

    winSlice.forEach(d => {
        if (d && d.special) {
            const spNum = parseInt(d.special, 10);
            if (!isNaN(spNum)) {
                const spStr = spNum.toString().padStart(2, '0');
                spFreqWin[spStr] = (spFreqWin[spStr] || 0) + 1;
                const z = d.win || getZodiac(spNum, currentYear);
                zSpFreqWin[z] = (zSpFreqWin[z] || 0) + 1;
            }
        }
        const balls = [...(d?.numbers || []), d?.special].filter(Boolean);
        balls.forEach(b => {
            const n = parseInt(b, 10);
            if (!isNaN(n)) {
                const nStr = n.toString().padStart(2, '0');
                allFreqWin[nStr] = (allFreqWin[nStr] || 0) + 1;
            }
        });
    });

    shortSlice.forEach(d => {
        if (d && d.special) {
            const spNum = parseInt(d.special, 10);
            if (!isNaN(spNum)) {
                const spStr = spNum.toString().padStart(2, '0');
                spFreqShort[spStr] = (spFreqShort[spStr] || 0) + 1;
                const z = d.win || getZodiac(spNum, currentYear);
                zSpFreqShort[z] = (zSpFreqShort[z] || 0) + 1;
            }
        }
        const balls = [...(d?.numbers || []), d?.special].filter(Boolean);
        balls.forEach(b => {
            const n = parseInt(b, 10);
            if (!isNaN(n)) {
                const nStr = n.toString().padStart(2, '0');
                allFreqShort[nStr] = (allFreqShort[nStr] || 0) + 1;
            }
        });
    });

    const expSp = winSize / 49;
    const stdSp = Math.max(0.55, Math.sqrt(winSize * (1 / 49) * (48 / 49)));
    const expAll = (winSize * 7) / 49;
    const stdAll = Math.max(1.05, Math.sqrt(winSize * (7 / 49) * (42 / 49)));
    const expZ = winSize / 12;
    const stdZ = Math.max(0.85, Math.sqrt(winSize * (1 / 12) * (11 / 12)));

    let overheatedCount = 0;
    let coolingInflectionCount = 0;
    for (let i = 1; i <= 49; i++) {
        const nStr = i.toString().padStart(2, '0');
        const fSp = spFreqWin[nStr] || 0;
        const fSpS = spFreqShort[nStr] || 0;
        const om = numSnapshot[nStr] !== undefined ? numSnapshot[nStr] : 0;
        const zSp = (fSp - expSp) / stdSp;
        if (zSp >= 1.25 || fSpS >= 2) {
            overheatedCount++;
            if (om >= 1 && om <= 6) coolingInflectionCount++;
        }
    }

    const transitionIntensity = Math.min(1.55, Math.max(0.85, 0.95 + (coolingInflectionCount / 10) * 0.35 + (overheatedCount / 14) * 0.25));
    const isTransitionRegime = coolingInflectionCount >= 3 || overheatedCount >= 6;

    const zodiacMap = {};
    const zodiacs = CONFIG.zodiacMap[currentYear] || CONFIG.zodiacMap[2026];
    zodiacs.forEach(z => {
        const zF = zSpFreqWin[z] || 0;
        const zFS = zSpFreqShort[z] || 0;
        const zOm = zSnapshot[z] || 0;
        const zDev = Number((((zF - expZ) / stdZ) + (zFS >= 3 ? (zFS - 2) * 0.45 : 0)).toFixed(2));
        let zKillPenalty = 0;
        let zTransitionBonus = 0;
        if (zDev > 1.15 && zOm >= 1 && zOm <= 4) {
            zKillPenalty = Math.min(28, Math.round((zDev - 0.9) * 12 * transitionIntensity));
        } else if (zDev > 1.65) {
            zKillPenalty = Math.min(24, Math.round((zDev - 1.1) * 10 * transitionIntensity));
        } else if (zDev >= -0.6 && zDev <= 0.7 && zOm >= 3 && zOm <= 8) {
            zTransitionBonus = Math.round(10 * transitionIntensity);
        }
        zodiacMap[z] = { zFreq: zF, zShortFreq: zFS, zDev, zKillPenalty, zTransitionBonus };
    });

    const numMap = {};
    for (let i = 1; i <= 49; i++) {
        const nStr = i.toString().padStart(2, '0');
        const z = getZodiac(i, currentYear);
        const om = numSnapshot[nStr] !== undefined ? numSnapshot[nStr] : 0;
        const fSp = spFreqWin[nStr] || 0;
        const fAll = allFreqWin[nStr] || 0;
        const fSpS = spFreqShort[nStr] || 0;
        const fAllS = allFreqShort[nStr] || 0;

        const zSp = (fSp - expSp) / stdSp;
        const zAll = (fAll - expAll) / stdAll;
        const zZod = zodiacMap[z] ? zodiacMap[z].zDev : 0;
        const shortOverburst = (fSpS >= 2 ? (fSpS - 1) * 1.1 : 0) + (fAllS >= 4 ? (fAllS - 3) * 0.42 : 0);
        const devIndex = Number((zSp * 0.58 + zAll * 0.27 + zZod * 0.15 + shortOverburst).toFixed(2));

        let killWeight = 0;
        let killReason = '';
        if (devIndex > 1.35 && om >= 1 && om <= 4) {
            killReason = `短期高频透支(偏离+${devIndex})`;
            killWeight = Math.min(10, Math.round((devIndex - 1.2) * 5 * transitionIntensity));
        }

        let transitionBonus = 0;
        if (om >= 2 && om <= 14 && fAll >= 1) {
            const sweetSpot = (om >= 3 && om <= 9) ? 1.5 : 1.0;
            transitionBonus = Math.min(20, Math.round((8 * sweetSpot + (fAllS || 0) * 3) * transitionIntensity));
        }

        numMap[nStr] = {
            winSp: fSp,
            winAll: fAll,
            shortSp: fSpS,
            shortAll: fAllS,
            devIndex,
            killWeight,
            killReason,
            transitionBonus,
            isOverheated: killWeight >= 8,
            isOverheatedKill: false
        };
    }

    const result = {
        winSize,
        shortSize,
        totalLen: historyData.length,
        transitionIntensity: Number(transitionIntensity.toFixed(2)),
        isTransitionRegime,
        overheatedCount,
        coolingInflectionCount,
        numMap,
        zodiacMap
    };
    last._cachedWinDev = result;
    return result;
}

export function getMultiFactorRecommendations(last, historyData, devContext = null, options = {}) {
    const currentYear = options.currentYear || 2026;
    const recConfig = options.recConfig || { weightCold: 50, weightMorph: 60, spanCount: 24, shrink: false };
    const globalMaxOm = options.globalMaxOm || {};
    const customWin = options.coldWindow !== undefined ? options.coldWindow : null;

    const zodiacs = CONFIG.zodiacMap[currentYear] || CONFIG.zodiacMap[2026];
    const snapshot = last.snapshot || {};
    const numSnapshot = last.numberSnapshot || {};
    const total = historyData.length || 1;
    const winDev = devContext || computeWindowWeightDeviation(historyData, customWin, currentYear);

    const recent30 = historyData.slice(-30);
    const recent15 = historyData.slice(-15);
    const recent10 = historyData.slice(-10);

    const allBallOm = {};
    for (let i = 1; i <= 49; i++) allBallOm[i] = 30;
    const maxBack = Math.min(60, historyData.length);
    for (let k = historyData.length - 1; k >= historyData.length - maxBack; k--) {
        const d = historyData[k];
        if (!d) continue;
        const balls = [...(d.numbers || []), d.special].filter(Boolean).map(n => parseInt(n, 10));
        const dist = historyData.length - 1 - k;
        balls.forEach(b => {
            if (allBallOm[b] === 30 || dist < allBallOm[b]) {
                allBallOm[b] = dist;
            }
        });
    }

    const freqAll15 = {};
    const freqSp15 = {};
    const freqSp30 = {};
    const zFreq15 = {};
    const tailFreq15 = {};
    const recentColorCounts = { red: 0, blue: 0, green: 0 };

    recent30.forEach(d => {
        if (d.special) {
            const numStr = parseInt(d.special, 10).toString().padStart(2, '0');
            freqSp30[numStr] = (freqSp30[numStr] || 0) + 1;
        }
    });

    recent15.forEach(d => {
        if (d.special) {
            const numStr = parseInt(d.special, 10).toString().padStart(2, '0');
            const n = parseInt(d.special, 10);
            freqSp15[numStr] = (freqSp15[numStr] || 0) + 1;
            tailFreq15[n % 10] = (tailFreq15[n % 10] || 0) + 1;
        }
        const balls = [...(d.numbers || []), d.special].filter(Boolean);
        balls.forEach(b => {
            const n = parseInt(b, 10);
            if (!isNaN(n)) freqAll15[n] = (freqAll15[n] || 0) + 1;
        });
        const zList = d.zodiac ? d.zodiac.split(',') : (d.win ? [d.win] : []);
        zList.forEach(z => { if (z) zFreq15[z] = (zFreq15[z] || 0) + 1; });
    });

    recent10.forEach(d => {
        if (d.special) {
            const numStr = parseInt(d.special, 10).toString().padStart(2, '0');
            const c = getColor(numStr);
            if (recentColorCounts[c] !== undefined) recentColorCounts[c]++;
        }
    });

    let dominantColor = 'red';
    let maxColorF = -1;
    Object.entries(recentColorCounts).forEach(([c, cnt]) => {
        if (cnt > maxColorF) { maxColorF = cnt; dominantColor = c; }
    });

    const topActiveTails = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].sort((a, b) => (tailFreq15[b] || 0) - (tailFreq15[a] || 0)).slice(0, 4);

    const wCold = Math.max(0, Math.min(100, recConfig.weightCold !== undefined ? recConfig.weightCold : 50));
    const wMorph = Math.max(0, Math.min(100, recConfig.weightMorph !== undefined ? recConfig.weightMorph : 60));
    const coldBias = (100 - wCold) / 50;
    const hotBias = wCold / 50;
    const morphWeight = wMorph / 100;

    const prevSpecial = last.special ? parseInt(last.special, 10) : 0;
    const prevNormals = (last.numbers || []).map(n => parseInt(n, 10));

    const scoredNumbers = [];
    for (let i = 1; i <= 49; i++) {
        const numStr = i.toString().padStart(2, '0');
        const z = getZodiac(i, currentYear);
        const color = getColor(numStr);
        const currentOm = numSnapshot[numStr] !== undefined ? numSnapshot[numStr] : 0;
        const omAll = allBallOm[i] !== undefined ? allBallOm[i] : 10;
        const fA15 = freqAll15[i] || 0;
        const fS15 = freqSp15[numStr] || 0;
        const fS30 = freqSp30[numStr] || 0;
        const zOm = snapshot[z] || 0;
        const tail = i % 10;

        const morphTags = getMorphologyTags(numStr, historyData).slice();

        let omScore = 50;
        if (omAll === 0) omScore = 88;
        else if (omAll <= 2) omScore = 95;
        else if (omAll <= 5) omScore = 86;
        else if (omAll <= 9) omScore = 75;
        else if (omAll <= 14) omScore = 55;
        else omScore = Math.max(15, 45 - (omAll - 14) * 2.5);

        if (coldBias > 1.0 && currentOm >= 10 && currentOm <= 28) {
            omScore += Math.round((currentOm - 10) * 1.5 * (coldBias - 1.0));
        }

        const freqScore = Math.min(100, (fA15 * 14 * hotBias) + (fS15 * 24) + (fS30 * 8));

        let morphScore = 0;
        if (prevNormals.includes(i)) {
            morphScore += 26;
            if (!morphTags.includes('平移特')) morphTags.push('平移特');
        }
        if (i === prevSpecial) morphScore += 20;
        if (Math.abs(i - prevSpecial) === 1 || (i === 1 && prevSpecial === 49) || (i === 49 && prevSpecial === 1)) {
            morphScore += 24;
        }
        if (prevNormals.some(pn => Math.abs(i - pn) === 1)) morphScore += 14;
        if (morphTags.includes('隔期跳')) morphScore += 18;
        if (topActiveTails.includes(tail)) {
            morphScore += 18;
            if (!morphTags.includes('旺尾共振')) morphTags.push('旺尾共振');
        }
        if (color === dominantColor) {
            morphScore += 15;
            if (!morphTags.includes('热波共振')) morphTags.push('热波共振');
        }
        if (zOm <= 2) {
            morphScore += 16;
            if (!morphTags.includes('旺肖共振')) morphTags.push('旺肖共振');
        }
        morphScore = Math.min(100, morphScore);

        const statBase = (omScore * 0.45) + (freqScore * 0.35);
        const finalScore = Math.max(10, Math.round(statBase + (morphScore * morphWeight * 0.85)));

        let primaryTag = '均线平衡';
        if (morphTags.includes('平移特')) primaryTag = '平移特';
        else if (morphTags.includes('特邻号')) primaryTag = '特邻号';
        else if (morphTags.includes('特重号')) primaryTag = '特重连开';
        else if (omAll <= 2 && fA15 >= 2) primaryTag = '极热高频';
        else if (omAll >= 3 && omAll <= 8) primaryTag = '黄金温码';
        else if (morphTags.includes('旺尾共振')) primaryTag = '旺尾共振';
        else if (morphTags.includes('旺肖共振')) primaryTag = '旺肖共振';
        else if (currentOm >= 18) primaryTag = '遗漏回补';
        else if (morphTags.length > 0) primaryTag = morphTags[0];

        scoredNumbers.push({
            number: numStr,
            zodiac: z,
            color,
            score: finalScore,
            currentOm,
            omAll,
            fA15,
            fS15,
            f30: fS30,
            f10: fS15,
            devIndex: 0,
            killWeight: 0,
            killReason: '',
            transitionBonus: 0,
            isOverheated: false,
            isOverheatedKill: false,
            tag: primaryTag,
            morphTags
        });
    }

    scoredNumbers.sort((a, b) => b.score - a.score);

    const displayCount = recConfig.spanCount || 20;
    let topNumbers = [];
    let shrinkCount = 0;
    let shrinkInfo = '';

    if (recConfig.shrink) {
        const shrinkRes = applyShrinkMatrix(scoredNumbers, displayCount);
        topNumbers = shrinkRes.result;
        shrinkCount = shrinkRes.shrinkCount;
        shrinkInfo = shrinkRes.details.length > 0 ? shrinkRes.details.join('、') : '优化同尾与生肖分布';
    } else {
        topNumbers = scoredNumbers.slice(0, displayCount);
    }

    const scoredZodiacs = zodiacs.map(z => {
        const currentOm = snapshot[z] || 0;
        const maxRecord = (globalMaxOm || {})[z] || 25;
        const count = (last.counts || {})[z] || 0;
        const zRecentHits = (zFreq15 && zFreq15[z]) || 0;
        const omScore = (currentOm <= 2) ? 24 : (currentOm <= 5) ? 30 : (currentOm <= 9) ? 20 : 8;
        const zScore = (zRecentHits * 12 * hotBias) + (omScore * (1 + coldBias * 0.3)) + ((count / total) * 35);
        const zTag = currentOm <= 1 ? '顺势旺肖' : (currentOm <= 5 ? '黄金温肖' : '中枢回补');
        return { zodiac: z, score: Math.round(zScore), currentOm, maxRecord, tag: zTag };
    }).sort((a, b) => b.score - a.score);

    return {
        type: 'multifactor',
        topNumbers,
        goldDan: scoredNumbers.slice(0, 2),
        silverDan: scoredNumbers.slice(2, 5),
        topZodiacs: scoredZodiacs.slice(0, 6),
        topTails: topActiveTails.slice(0, 4),
        topWaves: [dominantColor],
        allScored: scoredNumbers,
        windowDevMeta: winDev,
        shrinkApplied: recConfig.shrink,
        shrinkCount,
        shrinkInfo
    };
}

export function getDanBaseKillRecommendations(last, historyData, devContext = null, options = {}) {
    const mf = getMultiFactorRecommendations(last, historyData, devContext, options);
    const all = mf.allScored;

    const goldDan = all.slice(0, 2);
    const silverDan = all.slice(2, 5);
    const baseNumbers = mf.topNumbers;
    const baseSet = new Set(baseNumbers.map(n => n.number));

    const nonBasePool = all.filter(item => !baseSet.has(item.number));
    const topZSet = new Set((mf.topZodiacs || []).slice(0, 4).map(z => z.zodiac));
    const topTSet = new Set((mf.topTails || []).map(t => parseInt(t, 10)));
    const safeKillCandidates = nonBasePool.filter(item => {
        const omAll = item.omAll !== undefined ? item.omAll : 10;
        const fA = item.fA15 || 0;
        const isNeighbor = (item.morphTags || []).includes('特邻号') || (item.morphTags || []).includes('正邻号');
        const isZ = topZSet.has(item.zodiac);
        const isT = topTSet.has(parseInt(item.number, 10) % 10);
        const isRecent = fA > 0 || omAll < 8;
        return !isNeighbor && !isRecent && !isZ && !isT;
    });

    safeKillCandidates.sort((a, b) => a.score - b.score);
    const killedNumbers = safeKillCandidates.slice(0, 8).map(item => ({
        ...item,
        killType: '极冷惰性排除'
    }));

    if (killedNumbers.length < 8) {
        const existingKillSet = new Set(killedNumbers.map(k => k.number));
        const fallback = nonBasePool.filter(item => !existingKillSet.has(item.number) && !topZSet.has(item.zodiac)).sort((a, b) => a.score - b.score);
        for (const item of fallback) {
            killedNumbers.push({ ...item, killType: '极弱态排除' });
            if (killedNumbers.length >= 8) break;
        }
    }

    return {
        type: 'dan_base_kill',
        goldDan,
        silverDan,
        baseNumbers,
        killedNumbers,
        killNumbers: killedNumbers,
        topZodiacs: mf.topZodiacs,
        topTails: mf.topTails,
        topWaves: mf.topWaves,
        windowDevMeta: mf.windowDevMeta,
        shrinkCount: mf.shrinkCount,
        shrinkInfo: mf.shrinkInfo
    };
}

export function getSumSpanRecommendations(last, historyData, devContext = null, options = {}) {
    const recConfig = options.recConfig || { weightCold: 50, weightMorph: 60, spanCount: 24, shrink: false };
    const mf = getMultiFactorRecommendations(last, historyData, devContext, options);
    const all = mf.allScored;

    const lastCodes = (last.codes || []).map(c => parseInt(c.num, 10)).filter(n => !isNaN(n));
    const lastSum = last.totalSum || (lastCodes.length ? lastCodes.reduce((a, b) => a + b, 0) : 175);
    const sortedBalls = lastCodes.slice().sort((a, b) => a - b);
    const lastSpan = sortedBalls.length > 0 ? (sortedBalls[sortedBalls.length - 1] - sortedBalls[0]) : (last.normalSpan || 40);

    const recent10 = historyData.slice(-10);
    const sumHistory = recent10.map(d => {
        if (d.totalSum) return d.totalSum;
        if (d.codes && d.codes.length) return d.codes.reduce((a, b) => a + parseInt(b.num, 10), 0);
        return 175;
    });
    const avgSum10 = Math.round(sumHistory.reduce((a, b) => a + b, 0) / (sumHistory.length || 1));

    const spanHistory = recent10.map(d => {
        const b = (d.codes || []).map(c => parseInt(c.num, 10)).sort((a, b) => a - b);
        return b.length > 0 ? b[b.length - 1] - b[0] : (d.normalSpan || 40);
    });
    const avgSpan10 = Math.round(spanHistory.reduce((a, b) => a + b, 0) / (spanHistory.length || 1));

    let sumStatus = 'mid';
    let sumDesc = '中轴黄金平衡区';
    let suggestDirection = '大小均衡配置';
    let suggestRatio = '4小3大 或 3小4大';
    let sumAdvice = '和值在理论中轴 (175) 附近窄幅波动，大小号码分布均匀';

    if (lastSum >= 195) {
        sumStatus = 'high';
        sumDesc = '高位超买回调区';
        suggestDirection = '偏向小号 (01-24)';
        suggestRatio = '5小2大 或 4小3大';
        sumAdvice = `上期和值 ${lastSum} 偏高 (+${lastSum - 175})，大号透支，均值回归强烈倾向小号区间 (01-24)`;
    } else if (lastSum <= 155) {
        sumStatus = 'low';
        sumDesc = '低位超跌反弹区';
        suggestDirection = '偏向大号 (25-49)';
        suggestRatio = '5大2小 或 4大3小';
        sumAdvice = `上期和值仅 ${lastSum} 偏低 (-${175 - lastSum})，小号扎堆，均值回归看多大号区间 (25-49) 强力反弹`;
    }

    let spanStatus = 'normal';
    let spanDesc = '黄金常态跨度';
    let spanAdvice = '标准首尾两极拉伸，头号在 01-10，尾号在 40-49';

    if (lastSpan >= 46) {
        spanStatus = 'wide';
        spanDesc = '极值拉满·防收缩';
        spanAdvice = `上期跨度达 ${lastSpan} 极限扩散，首尾号码极度发散，防本期两端跨度小幅向内收缩`;
    } else if (lastSpan <= 35) {
        spanStatus = 'narrow';
        spanDesc = '紧凑扎堆·防扩散';
        spanAdvice = `上期跨度仅 ${lastSpan} 号码过度聚拢，防本期两端极速外扩，重点抓首号(01-08)与尾号(43-49)`;
    }

    const ssScored = all.map(item => {
        const num = parseInt(item.number, 10);
        let score = item.score;
        let tag = item.tag;
        let role = 'mid';

        if (sumStatus === 'high') {
            if (num <= 24) {
                score += 26;
                if (num <= 12) score += 6;
                tag = '和值回调·小';
            } else if (num >= 40) {
                score -= 16;
            }
        } else if (sumStatus === 'low') {
            if (num >= 25) {
                score += 26;
                if (num >= 38) score += 6;
                tag = '和值反弹·大';
            } else if (num <= 10) {
                score -= 16;
            }
        } else {
            if (num >= 18 && num <= 32) {
                score += 18;
                tag = '中枢平衡';
            }
        }

        if (num >= 1 && num <= 10) {
            role = 'head';
            score += 12;
            if (spanStatus === 'narrow' && num <= 7) score += 8;
            if (item.currentOm <= 8 || item.f30 >= 2) tag = '跨度首号';
        } else if (num >= 40 && num <= 49) {
            role = 'tail';
            score += 12;
            if (spanStatus === 'narrow' && num >= 43) score += 8;
            if (item.currentOm <= 8 || item.f30 >= 2) tag = '跨度尾号';
        } else if (num >= 18 && num <= 32) {
            role = 'mid';
            if (tag === '均线平衡' || tag === '中枢平衡') tag = '中轴共振';
        }

        return { ...item, score, tag, role, isSmall: num <= 24 };
    });

    ssScored.sort((a, b) => b.score - a.score);

    const headDan = ssScored.filter(n => n.role === 'head').slice(0, 2);
    const tailDan = ssScored.filter(n => n.role === 'tail').slice(0, 2);
    const midDan = ssScored.filter(n => n.role === 'mid').slice(0, 3);

    const displayCount = recConfig.spanCount || 24;
    let topNumbers = [];
    let shrinkCount = 0;
    let shrinkInfo = '';

    if (recConfig.shrink) {
        const shrinkRes = applyShrinkMatrix(ssScored, displayCount);
        topNumbers = shrinkRes.result;
        shrinkCount = shrinkRes.shrinkCount;
        shrinkInfo = shrinkRes.details.length > 0 ? shrinkRes.details.join('、') : '优化同尾与生肖过度集中';
    } else {
        topNumbers = ssScored.slice(0, displayCount);
    }

    return {
        type: 'sum_span',
        topNumbers,
        headDan,
        tailDan,
        midDan,
        topZodiacs: mf.topZodiacs,
        topTails: mf.topTails,
        metrics: {
            lastSum, avgSum10, sumStatus, sumDesc, suggestDirection, suggestRatio, sumAdvice,
            lastSpan, avgSpan10, spanStatus, spanDesc, spanAdvice
        },
        shrinkApplied: recConfig.shrink,
        shrinkCount,
        shrinkInfo
    };
}

export function getNormalTrackRecommendations(last, historyData, devContext = null, options = {}) {
    const currentYear = options.currentYear || 2026;
    const recConfig = options.recConfig || { weightCold: 50, spanCount: 20 };
    const customWin = options.coldWindow !== undefined ? options.coldWindow : null;

    const zodiacs = CONFIG.zodiacMap[currentYear] || CONFIG.zodiacMap[2026];
    const winDev = devContext || computeWindowWeightDeviation(historyData, customWin, currentYear);
    const recent30 = historyData.slice(-30);
    const zFlatFreq = {};
    const tailFlatFreq = {};
    const numFlatFreq = {};

    recent30.forEach(d => {
        const allBalls = [...(d.numbers || []), d.special].filter(Boolean);
        allBalls.forEach(b => {
            const n = parseInt(b, 10);
            if (isNaN(n)) return;
            const numStr = n.toString().padStart(2, '0');
            const z = getZodiac(n, currentYear);
            const tail = n % 10;
            zFlatFreq[z] = (zFlatFreq[z] || 0) + 1;
            tailFlatFreq[tail] = (tailFlatFreq[tail] || 0) + 1;
            numFlatFreq[numStr] = (numFlatFreq[numStr] || 0) + 1;
        });
    });

    const wCold = Math.max(0, Math.min(100, recConfig.weightCold !== undefined ? recConfig.weightCold : 50));
    const cBias = (100 - wCold) / 50;
    const hBias = wCold / 50;

    const topFlatZodiacs = zodiacs.map(z => ({
        zodiac: z,
        hits: zFlatFreq[z] || 0,
        rate: Math.round(((zFlatFreq[z] || 0) / ((recent30.length || 1) * 7)) * 100)
    })).sort((a, b) => b.hits - a.hits).slice(0, 4);

    const topFlatTails = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(t => ({
        tail: `${t}尾`,
        hits: tailFlatFreq[t] || 0,
        rate: Math.round(((tailFlatFreq[t] || 0) / ((recent30.length || 1) * 7)) * 100)
    })).sort((a, b) => b.hits - a.hits).slice(0, 3);

    const topFlatNums = [];
    for (let i = 1; i <= 49; i++) {
        const nStr = i.toString().padStart(2, '0');
        const om = (last.numberSnapshot || {})[nStr] || 0;
        const hits = numFlatFreq[nStr] || 0;
        const devInfo = (winDev && winDev.numMap && winDev.numMap[nStr]) || { killWeight: 0, transitionBonus: 0 };
        const flatScore = (hits * 6 * hBias) + (Math.min(30, om * 2) * cBias) + (devInfo.transitionBonus * 0.45) - (devInfo.killWeight * 0.55);
        topFlatNums.push({
            number: nStr,
            zodiac: getZodiac(i, currentYear),
            color: getColor(nStr),
            hits,
            flatScore
        });
    }
    topFlatNums.sort((a, b) => b.flatScore - a.flatScore);

    const displayCount = recConfig.spanCount || 20;
    return {
        type: 'normal_track',
        topFlatZodiacs,
        topFlatTails,
        topFlatNums: topFlatNums.slice(0, displayCount)
    };
}

export function getOmissionBasedRecommendations(snapshot, colorMaxOm, globalMaxOm, currentColor, currentYear = 2026) {
    const zodiacs = CONFIG.zodiacMap[currentYear] || CONFIG.zodiacMap[2026];
    const zodiacColorMap = { '鼠': 'blue', '牛': 'green', '虎': 'green', '兔': 'green', '龙': 'red', '蛇': 'red', '马': 'red', '羊': 'red', '猴': 'blue', '鸡': 'blue', '狗': 'blue', '猪': 'blue' };
    const scored = zodiacs.map(z => {
        const currentOm = (snapshot || {})[z] || 0;
        const maxRecord = (globalMaxOm || {})[z] || 0;
        const ratio = maxRecord > 0 ? currentOm / maxRecord : 0;
        const color = currentColor || 'red';
        let score = currentOm * 10 + ratio * 50;
        if (zodiacColorMap[z] === color) score += 20;
        return { zodiac: z, score, currentOm, maxRecord, ratio };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 6);
}

export function getBalanceRecommendations(snapshot, colorOm, sizeOm, counts, total, currentYear = 2026) {
    const zodiacs = CONFIG.zodiacMap[currentYear] || CONFIG.zodiacMap[2026];
    const scored = zodiacs.map(z => {
        const currentOm = (snapshot || {})[z] || 0;
        const count = (counts || {})[z] || 0;
        const avgCycle = (total || 1) / (count || 1);
        const deviation = currentOm - avgCycle;
        const score = currentOm * 5 + deviation * 20 - Math.abs(deviation) * 5;
        return { zodiac: z, score, currentOm, count, avgCycle };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 6);
}

export function getHotRecommendations(snapshot, counts, total, currentYear = 2026) {
    const zodiacs = CONFIG.zodiacMap[currentYear] || CONFIG.zodiacMap[2026];
    const scored = zodiacs.map(z => {
        const currentOm = (snapshot || {})[z] || 0;
        const count = (counts || {})[z] || 0;
        const avgCycle = (total || 1) / (count || 1);
        const score = (avgCycle - currentOm) * 15 + count;
        return { zodiac: z, score, currentOm, count, avgCycle };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, 6);
}

export function getColorRecommendations(colorOm, colorMaxOm) {
    const colors = ['red', 'blue', 'green'];
    const colorNames = { red: '红波', blue: '蓝波', green: '绿波' };
    const scored = colors.map(c => {
        const current = (colorOm || {})[c] || 0;
        const max = (colorMaxOm || {})[c] || 0;
        const ratio = max > 0 ? current / max : 0;
        const score = current * 10 + ratio * 30;
        return { color: c, name: colorNames[c], score, current, max, ratio };
    });
    return scored.sort((a, b) => b.score - a.score).map(item => ({
        ...item,
        numbers: CONFIG.colors[item.color].slice(0, 5).join(' ')
    }));
}

export function getSizeRecommendations(sizeOm) {
    const big = { type: 'big', name: '大数(25-49)', current: (sizeOm || {}).big || 0 };
    const small = { type: 'small', name: '小数(1-24)', current: (sizeOm || {}).small || 0 };
    return [big, small].map(s => ({ ...s, score: s.current * 10 })).sort((a, b) => b.score - a.score);
}

export function parseSimplePresetTerms(text) {
    const terms = { numbers: [], zodiacs: [], waves: [] };
    if (!text) return terms;
    const zodiacNames = new Set(['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']);
    const waveMap = { '红': 'red', '蓝': 'blue', '绿': 'green', '红波': 'red', '蓝波': 'blue', '绿波': 'green' };
    const tokens = String(text).split(/[,，;；、\s]+/).map(s => s.trim()).filter(Boolean);
    tokens.forEach(t => {
        if (waveMap[t]) {
            if (!terms.waves.includes(waveMap[t])) terms.waves.push(waveMap[t]);
        } else if (zodiacNames.has(t)) {
            if (!terms.zodiacs.includes(t)) terms.zodiacs.push(t);
        } else if (/^\d{1,2}$/.test(t)) {
            const n = parseInt(t, 10);
            if (n >= 1 && n <= 49) {
                const pad = n.toString().padStart(2, '0');
                if (!terms.numbers.includes(pad)) terms.numbers.push(pad);
            }
        }
    });
    return terms;
}

export function getAutoOptimizedStrategy(last, historyData, devContext = null, options = {}) {
    const mf = getMultiFactorRecommendations(last, historyData, devContext, options);
    const top24Nums = (mf.topNumbers || []).map(x => x.number);
    const top16Nums = mf.allScored.slice(0, 16).map(x => x.number);
    const top6Z = (mf.topZodiacs || []).slice(0, 6).map(x => x.zodiac);
    const top4Z = (mf.topZodiacs || []).slice(0, 4).map(x => x.zodiac);
    const goldSilverNums = mf.allScored.slice(0, 5).map(x => x.number);
    const domWave = mf.allScored[0].color === 'red' ? '红波' : mf.allScored[0].color === 'blue' ? '蓝波' : '绿波';

    const presets = [
        { id: 'opt_combo', name: '🌟 全景多维防御组合 (大底24码+6肖)', text: `${top24Nums.join(',')},${top6Z.join(',')}`, count: 28 },
        { id: 'opt_base24', name: '🎯 黄金半壁精选大底 (Top 24码)', text: top24Nums.join(','), count: top24Nums.length },
        { id: 'opt_zodiac6', name: '🐾 核心强力共振6肖 (半壁江山)', text: top6Z.join(','), count: 24 },
        { id: 'opt_gold_wave', name: '🌈 金银胆 + 旺波联防 (5胆+热波)', text: `${goldSilverNums.join(',')},${domWave}`, count: 18 },
        { id: 'opt_zodiac4', name: '⚡ 精选共振4肖 (高频核心)', text: top4Z.join(','), count: 16 },
        { id: 'opt_multi16', name: '⭐ 多因子动量16精选', text: top16Nums.join(','), count: 16 }
    ];

    const testLen = Math.min(30, historyData.length || 1);
    presets.forEach(p => {
        let hitCount = 0;
        const hitSeries = [];
        const terms = parseSimplePresetTerms(p.text);
        for (let i = historyData.length - testLen; i < historyData.length; i++) {
            const pt = historyData[i];
            const winNum = parseInt(pt.special, 10);
            const winStr = winNum.toString().padStart(2, '0');
            const winZ = pt.win;
            const winColor = pt.currentColor;
            const isHit = (
                terms.numbers.includes(winStr) ||
                terms.zodiacs.includes(winZ) ||
                terms.waves.includes(winColor)
            );
            if (isHit) hitCount++;
            hitSeries.push(isHit);
        }
        p.hitSeries = hitSeries;
        p.hitRate = Math.round((hitCount / testLen) * 100);
        p.hits = hitCount;
        p.total = testLen;
        p.roi = Math.round(((hitCount * 48) / (testLen * Math.max(1, p.count)) - 1) * 100);
    });

    presets.sort((a, b) => b.hitRate - a.hitRate || b.roi - a.roi);
    return {
        type: 'auto_opt',
        best: presets[0],
        presets,
        topNumbers: mf.allScored.slice(0, 12)
    };
}

export function computeStrategyLookbackRecords(historyData, reviewCount = 20, activeStrat = 'multifactor', activeTrack = 'special', options = {}) {
    if (!historyData || historyData.length < 2) {
        return { records: [], hitTotal: 0, count: 0, winRate: 0, killSafeTotal: 0, killSafeRate: 0, activeStrat, activeTrack };
    }
    const currentYear = options.currentYear || 2026;
    const recConfig = options.recConfig || { weightCold: 50, weightMorph: 60, spanCount: 24, shrink: false, track: activeTrack };
    const globalMaxOm = options.globalMaxOm || {};
    const stratOpts = { currentYear, recConfig, globalMaxOm, coldWindow: options.coldWindow };

    let effTrack = activeTrack;
    let effStrat = activeStrat;
    if (effStrat === 'normal_track') {
        effTrack = 'normal';
    }
    const count = Math.min(reviewCount, historyData.length - 1);
    const records = [];
    let hitTotal = 0;
    let killSafeTotal = 0;

    for (let i = historyData.length - count; i < historyData.length; i++) {
        const cur = historyData[i];
        const prevSubset = historyData.slice(0, i);
        const prevLast = prevSubset[prevSubset.length - 1];

        const winNum = parseInt(cur.special, 10).toString().padStart(2, '0');
        const winZodiac = cur.win;
        const winColor = cur.currentColor;
        const normalBalls = (cur.numbers || []).filter(Boolean).map(b => parseInt(b, 10).toString().padStart(2, '0'));

        let resultType = '未中';
        let hitRole = '';
        let isHit = false;
        let topNumbers = [];
        let top10Text = '';
        let goldNumbers = [];
        let silverNumbers = [];
        let killNumbers = [];
        let recZodiacs = [];
        let recTails = [];
        let isKillSafe = true;

        if (effTrack === 'normal') {
            const rec = getNormalTrackRecommendations(prevLast, prevSubset, null, stratOpts);
            const allBalls = [...normalBalls, winNum].filter(Boolean);
            const openZodiacs = allBalls.map(b => getZodiac(parseInt(b, 10), currentYear));
            const openTails = allBalls.map(b => `${parseInt(b, 10) % 10}尾`);

            const flatNums = (rec.topFlatNums || []).map(n => parseInt(n.number, 10).toString().padStart(2, '0'));
            const flatZodiacs = (rec.topFlatZodiacs || []).map(z => z.zodiac);
            const flatTails = (rec.topFlatTails || []).map(t => t.tail);

            topNumbers = flatNums.slice(0, recConfig.spanCount || 20);
            recZodiacs = flatZodiacs.slice(0, 4);
            recTails = flatTails.slice(0, 3);

            const hitNums = allBalls.filter(b => topNumbers.includes(b));
            const hitZ = recZodiacs.filter(z => openZodiacs.includes(z));
            const hitT = recTails.filter(t => openTails.includes(t));

            if (hitNums.length > 0 || hitZ.length > 0 || hitT.length > 0) {
                isHit = true;
                hitTotal++;
            }
            if (hitNums.length > 0 && hitZ.length > 0) {
                resultType = `🎯 中平码[${hitNums.join(',')}] 肖[${hitZ.join(',')}]`;
                hitRole = 'gold';
            } else if (hitNums.length > 0) {
                resultType = `🎯 命中平码[${hitNums.join(',')}]`;
                hitRole = 'gold';
            } else if (hitZ.length > 0) {
                resultType = `🎯 命中平特肖[${hitZ.join(',')}]`;
                hitRole = 'silver';
            } else if (hitT.length > 0) {
                resultType = `🎯 命中平特尾[${hitT.join(',')}]`;
                hitRole = 'base';
            }
            top10Text = `肖:${recZodiacs.join('')} 尾:${recTails.join('')} 码:${topNumbers.slice(0, 5).join(',')}`;
        } else if (effStrat === 'sum_span') {
            const rec = getSumSpanRecommendations(prevLast, prevSubset, null, stratOpts);
            topNumbers = (rec.topNumbers || []).map(n => n.number);
            const gold = (rec.headDan || []).map(n => n.number);
            const silver = (rec.tailDan || []).map(n => n.number);
            const topZ = (rec.topZodiacs || []).map(z => z.zodiac);
            const topT = (rec.topTails || []).map(t => `${t}尾`);
            const winTail = `${parseInt(winNum, 10) % 10}尾`;
            goldNumbers = gold;
            silverNumbers = silver;
            recZodiacs = topZ;
            recTails = topT;
            const hitIdx = topNumbers.indexOf(winNum);
            const hitZIdx = topZ.indexOf(winZodiac);
            const hitTIdx = topT.indexOf(winTail);
            if (gold.includes(winNum)) { resultType = `🥇 命中首号守门[${winNum}]`; hitRole = 'gold'; isHit = true; }
            else if (silver.includes(winNum)) { resultType = `🥈 命中尾号守门[${winNum}]`; hitRole = 'silver'; isHit = true; }
            else if (hitIdx >= 0 && hitZIdx >= 0) { resultType = `🎯 命中均值精选[${winNum}]·特肖[${winZodiac}]`; hitRole = 'gold'; isHit = true; }
            else if (hitIdx >= 0) { resultType = `🎯 命中均值精选[${winNum}]`; hitRole = 'base'; isHit = true; }
            else if (hitZIdx >= 0) { resultType = `🐾 命中共振生肖[${winZodiac}]`; hitRole = 'silver'; isHit = true; }
            else if (hitTIdx >= 0) { resultType = `🎯 命中均值旺尾[${winTail}]`; hitRole = 'base'; isHit = true; }
            if (isHit) hitTotal++;
            top10Text = topNumbers.slice(0, 6).join(' ');
        } else if (effStrat === 'dan_base_kill') {
            const rec = getDanBaseKillRecommendations(prevLast, prevSubset, null, stratOpts);
            topNumbers = (rec.baseNumbers || rec.topNumbers || []).map(n => n.number);
            const gold = (rec.goldDan || []).map(n => n.number);
            const silver = (rec.silverDan || []).map(n => n.number);
            const kill = (rec.killedNumbers || rec.killNumbers || []).map(n => n.number);
            const topZ = (rec.topZodiacs || []).map(z => z.zodiac);
            const topT = (rec.topTails || []).map(t => `${t}尾`);
            const winTail = `${parseInt(winNum, 10) % 10}尾`;
            goldNumbers = gold;
            silverNumbers = silver;
            killNumbers = kill;
            recZodiacs = topZ;
            recTails = topT;
            isKillSafe = !kill.includes(winNum);
            if (isKillSafe) killSafeTotal++;
            const hitIdx = topNumbers.indexOf(winNum);
            const hitZIdx = topZ.indexOf(winZodiac);
            const hitTIdx = topT.indexOf(winTail);
            if (gold.includes(winNum)) { resultType = `🥇 命中金胆[${winNum}]`; hitRole = 'gold'; isHit = true; }
            else if (silver.includes(winNum)) { resultType = `🥈 命中银胆[${winNum}]`; hitRole = 'silver'; isHit = true; }
            else if (hitIdx >= 0 && hitZIdx >= 0) { resultType = `🎯 命中大底[${winNum}]·特肖[${winZodiac}]`; hitRole = 'gold'; isHit = true; }
            else if (hitIdx >= 0) { resultType = `🎯 命中精选大底[${winNum}]`; hitRole = 'base'; isHit = true; }
            else if (hitZIdx >= 0) { resultType = `🐾 命中共振特肖[${winZodiac}]`; hitRole = 'silver'; isHit = true; }
            else if (hitTIdx >= 0) { resultType = `🎯 命中活跃旺尾[${winTail}]`; hitRole = 'base'; isHit = true; }
            else if (kill.includes(winNum)) { resultType = '⚠️ 误杀特码'; hitRole = 'kill_fail'; }
            else { resultType = '稳健避杀成功'; hitRole = 'kill_ok'; }
            if (isHit) hitTotal++;
            top10Text = `胆:${gold.join(',')} 大底:${topNumbers.slice(0, 6).join(' ')} 杀码:${kill.join(' ')}`;
        } else if (effStrat === 'auto_opt') {
            const rec = getAutoOptimizedStrategy(prevLast, prevSubset, null, stratOpts);
            const best = rec.best;
            const terms = parseSimplePresetTerms(best.text);
            isHit = terms.numbers.includes(winNum) || terms.zodiacs.includes(winZodiac) || terms.waves.includes(winColor);
            if (isHit) hitTotal++;
            const expandedNums = new Set([
                ...(rec.topNumbers ? rec.topNumbers.map(n => n.number) : []),
                ...(terms.numbers || [])
            ]);
            for (let n = 1; n <= 49; n++) {
                const numStr = n.toString().padStart(2, '0');
                if ((terms.zodiacs && terms.zodiacs.includes(getZodiac(n, currentYear))) || (terms.waves && terms.waves.includes(getColor(numStr)))) {
                    expandedNums.add(numStr);
                }
            }
            topNumbers = Array.from(expandedNums);
            recZodiacs = terms.zodiacs || [];
            hitRole = isHit ? 'gold' : '';
            resultType = isHit ? `🎯 命中(${best.name.slice(0, 5)})` : '未中';
            top10Text = `${best.name}: ${best.text}`;
        } else if (effStrat === 'omission') {
            const rec = getOmissionBasedRecommendations(prevLast.snapshot || {}, prevLast.colorMaxOmissions || {}, globalMaxOm, prevLast.currentColor, currentYear);
            const topZ = rec.map(x => x.zodiac);
            recZodiacs = topZ;
            const hitIdx = topZ.indexOf(winZodiac);
            isHit = hitIdx >= 0;
            if (isHit) hitTotal++;
            if (hitIdx === 0) { resultType = '🥇 命中首选极值肖'; hitRole = 'gold'; }
            else if (hitIdx < 3) { resultType = `🥈 命中前3肖(${winZodiac})`; hitRole = 'silver'; }
            else if (isHit) { resultType = `🎯 命中6肖(${winZodiac})`; hitRole = 'base'; }
            topZ.forEach(z => {
                for (let n = 1; n <= 49; n++) {
                    if (getZodiac(n, currentYear) === z) topNumbers.push(n.toString().padStart(2, '0'));
                }
            });
            top10Text = `推荐6肖: ${topZ.join(' ')}`;
        } else if (effStrat === 'balance') {
            const rec = getBalanceRecommendations(prevLast.snapshot || {}, prevLast.colorOmissions || {}, prevLast.sizeOmissions || {}, prevLast.counts || {}, prevSubset.length, currentYear);
            const topZ = rec.map(x => x.zodiac);
            recZodiacs = topZ;
            const hitIdx = topZ.indexOf(winZodiac);
            isHit = hitIdx >= 0;
            if (isHit) hitTotal++;
            if (hitIdx === 0) { resultType = '🥇 命中首推均线肖'; hitRole = 'gold'; }
            else if (hitIdx < 3) { resultType = `🥈 命中前3肖(${winZodiac})`; hitRole = 'silver'; }
            else if (isHit) { resultType = `🎯 命中回归肖(${winZodiac})`; hitRole = 'base'; }
            topZ.forEach(z => {
                for (let n = 1; n <= 49; n++) {
                    if (getZodiac(n, currentYear) === z) topNumbers.push(n.toString().padStart(2, '0'));
                }
            });
            top10Text = `均线肖: ${topZ.join(' ')}`;
        } else if (effStrat === 'hot') {
            const rec = getHotRecommendations(prevLast.snapshot || {}, prevLast.counts || {}, prevSubset.length, currentYear);
            const topZ = rec.map(x => x.zodiac);
            recZodiacs = topZ;
            const hitIdx = topZ.indexOf(winZodiac);
            isHit = hitIdx >= 0;
            if (isHit) hitTotal++;
            if (hitIdx === 0) { resultType = '🥇 命中极热头肖'; hitRole = 'gold'; }
            else if (hitIdx < 3) { resultType = `🥈 命中高频前3肖(${winZodiac})`; hitRole = 'silver'; }
            else if (isHit) { resultType = `🎯 命中热肖群(${winZodiac})`; hitRole = 'base'; }
            topZ.forEach(z => {
                for (let n = 1; n <= 49; n++) {
                    if (getZodiac(n, currentYear) === z) topNumbers.push(n.toString().padStart(2, '0'));
                }
            });
            top10Text = `顺热肖: ${topZ.join(' ')}`;
        } else if (effStrat === 'color') {
            const rec = getColorRecommendations(prevLast.colorOmissions || {}, prevLast.colorMaxOmissions || {});
            const topColor = rec[0];
            const secondColor = rec[1];
            isHit = (topColor && topColor.color === winColor) || (secondColor && secondColor.color === winColor);
            if (isHit) hitTotal++;
            hitRole = (topColor && topColor.color === winColor) ? 'gold' : (isHit ? 'silver' : '');
            resultType = isHit ? `🎯 命中${topColor.color === winColor ? topColor.name : (secondColor ? secondColor.name : '')}` : `未中 (主推${topColor ? topColor.name : ''})`;
            topNumbers = [...(CONFIG.colors[topColor ? topColor.color : 'red'] || []), ...(CONFIG.colors[secondColor ? secondColor.color : 'blue'] || [])];
            top10Text = `推荐波色: ${topColor ? topColor.name : ''} / ${secondColor ? secondColor.name : ''}`;
        } else if (effStrat === 'size') {
            const rec = getSizeRecommendations(prevLast.sizeOmissions || {});
            const topSize = rec[0];
            const curSize = parseInt(cur.special, 10) >= 25 ? 'big' : 'small';
            isHit = !!(topSize && topSize.type === curSize);
            if (isHit) hitTotal++;
            hitRole = isHit ? 'gold' : '';
            resultType = isHit ? `🎯 命中${topSize.name.slice(0, 2)}` : `未中 (推${topSize ? topSize.name.slice(0, 2) : ''})`;
            const targetType = topSize ? topSize.type : 'big';
            for (let n = 1; n <= 49; n++) {
                if ((n >= 25 ? 'big' : 'small') === targetType) topNumbers.push(n.toString().padStart(2, '0'));
            }
            top10Text = `推荐分界: ${topSize ? topSize.name : ''}`;
        } else {
            const rec = getMultiFactorRecommendations(prevLast, prevSubset, null, stratOpts);
            topNumbers = (rec.topNumbers || []).map(n => n.number);
            const gold = (rec.goldDan || (rec.topNumbers ? rec.topNumbers.slice(0, 2) : [])).map(n => n.number);
            const silver = (rec.silverDan || (rec.topNumbers ? rec.topNumbers.slice(2, 5) : [])).map(n => n.number);
            const topZ = (rec.topZodiacs || []).map(z => z.zodiac);
            const topT = (rec.topTails || []).map(t => `${t}尾`);
            const winTail = `${parseInt(winNum, 10) % 10}尾`;
            goldNumbers = gold;
            silverNumbers = silver;
            recZodiacs = topZ;
            recTails = topT;
            const hitIdx = topNumbers.indexOf(winNum);
            const hitZIdx = topZ.indexOf(winZodiac);
            const hitTIdx = topT.indexOf(winTail);
            if (gold.includes(winNum)) { resultType = `🥇 命中金胆[${winNum}]`; hitRole = 'gold'; isHit = true; }
            else if (silver.includes(winNum)) { resultType = `🥈 命中银胆[${winNum}]`; hitRole = 'silver'; isHit = true; }
            else if (hitIdx >= 0 && hitZIdx >= 0) { resultType = `🎯 命中精选[${winNum}]·特肖[${winZodiac}]`; hitRole = 'gold'; isHit = true; }
            else if (hitIdx >= 0) { resultType = `🎯 命中精选大底[${winNum}]`; hitRole = 'base'; isHit = true; }
            else if (hitZIdx >= 0) { resultType = `🐾 命中共振特肖[${winZodiac}]`; hitRole = 'silver'; isHit = true; }
            else if (hitTIdx >= 0) { resultType = `🎯 命中活跃旺尾[${winTail}]`; hitRole = 'base'; isHit = true; }
            if (isHit) hitTotal++;
            top10Text = topNumbers.slice(0, 6).join(' ');
        }

        const allRecNumbers = Array.from(new Set([...goldNumbers, ...silverNumbers, ...topNumbers]));

        records.unshift({
            issue: cur.period || cur.expect || cur.id,
            special: winNum,
            zodiac: winZodiac,
            color: winColor,
            normalBalls,
            topNumbers,
            allRecNumbers,
            top6: topNumbers.slice(0, 6),
            goldNumbers,
            silverNumbers,
            killNumbers,
            recZodiacs,
            recTails,
            isKillSafe,
            top10Text,
            hitRole,
            resultType,
            isHit
        });
    }

    const winRate = count ? Math.round((hitTotal / count) * 100) : 0;
    const killSafeRate = count ? Math.round((killSafeTotal / count) * 100) : 0;
    const effectiveStrat = (effTrack === 'normal') ? 'normal_track' : effStrat;
    return { records, hitTotal, count, winRate, killSafeTotal, killSafeRate, activeStrat: effectiveStrat, activeTrack: effTrack };
}
