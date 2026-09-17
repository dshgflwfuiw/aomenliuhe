        // ==================== 核心配置 ====================
        const CONFIG = {
            zodiacMap: {
                2020: ['鼠', '猪', '狗', '鸡', '猴', '羊', '马', '蛇', '龙', '兔', '虎', '牛'],
                2021: ['牛', '鼠', '猪', '狗', '鸡', '猴', '羊', '马', '蛇', '龙', '兔', '虎'],
                2022: ['虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊', '马', '蛇', '龙', '兔'],
                2023: ['兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊', '马', '蛇', '龙'],
                2024: ['龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊', '马', '蛇'],
                2025: ['蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊', '马'],
                2026: ['马', '蛇', '龙', '兔', '虎', '牛', '鼠', '猪', '狗', '鸡', '猴', '羊']
            },
            colors: {
                red: ['01', '02', '07', '08', '12', '13', '18', '19', '23', '24', '29', '30', '34', '35', '40', '45', '46'],
                blue: ['03', '04', '09', '10', '14', '15', '20', '25', '26', '31', '36', '37', '41', '42', '47', '48'],
                green: ['05', '06', '11', '16', '17', '21', '22', '27', '28', '32', '33', '38', '39', '43', '44', '49']
            },
            jiaYeMap: {
                jia: ['牛', '马', '羊', '鸡', '狗', '猪'],
                ye: ['鼠', '虎', '兔', '龙', '蛇', '猴']
            },
            wuxingMap: {
                '金': ['04', '05', '12', '13', '26', '27', '34', '35', '42', '43'],
                '木': ['08', '09', '16', '17', '24', '25', '38', '39', '46', '47'],
                '水': ['01', '14', '15', '22', '23', '30', '31', '44', '45'],
                '火': ['02', '03', '10', '11', '18', '19', '32', '33', '40', '41', '48', '49'],
                '土': ['06', '07', '20', '21', '28', '29', '36', '37']
            }
        };

        // ==================== 状态管理 ====================
        const state = {
            rawData:[],
            processedList:[],
            historyData: [],
            visibleData:[],
            currentYear: 2026,
            currentMode: 'zodiac',
            globalMaxOm: {},
            pageState: { pageSize: 100, currPage: 0, totalPage: 0 },
            viewState: { scale: 1, x: 0, y: 0, offsetX: 50 },
            coldSelection: null,
            omissionRangeSegments: [],
            rangeSegments: {
                omissionRange: [],
                omissionZodiacRange: [],
                pingOmissionRange: [],
                pingOmissionZodiacRange: [],
                hotNumberRange: [],
                allHotNumberRange: [],
                hotZodiacRange: [],
                allHotZodiacRange: []
            },
            followPosition: 2,
            followMode: 'zodiac',
            followZodiac: '马',
            followMultiZodiacs: ['马', '蛇'],
            followMissRanks: [1, 2, 3],
            tailPosition: 2,
            tailMode: 'single',
            tailValue: 3,
            tailMultiTails: [2, 4],
            tailMissRanks: [1, 2, 3],
            followNumAbsent: ['01', '02', '03', '04', '05'],
            maWindow: 5,
            tableSort: { key: null, dir: 1 },
            lastRenderedData: null,
            overlay: { type: 'zodiac', items: [], enabled: false, coldSets: [] },
            matrixMode: 'pingte',
            setMode: 'all',
            filterCalcMode: 'all',
            excludeKills: {
                zodiacs: [],
                tails: [],
                waves: [],
                coldTop5: false,
                manualNumbers: [],
                excludedSingles: [],
                morphs: [],
                heNumbers: [],
                heTails: []
            },
            showSignals: true,
            loadedYears: new Set(),
            canvas: null,
            ctx: null,
            isDragging: false,
            lastMouse: { x: 0, y: 0 },
            hoverIndex: -1,
            tableHighlightItem: null,
            latestDataRecord: null,
            lastTapTime: null,
            tooltipTimeout: null,
            lastTouchDist: 0,
            touchStartTime: 0,
            overallMaxRise: 0,
            overallMaxFall: 0
        };

        // ==================== 初始化 ====================
        document.addEventListener('DOMContentLoaded', () => {
            state.canvas = document.getElementById('kCanvas');
            state.ctx = state.canvas.getContext('2d');
            resizeCanvas();
            window.addEventListener('resize', () => {
                resizeCanvas();
                draw();
            });

            // 恢复持久化偏好 (年份与模式)
            try {
                const savedYear = localStorage.getItem('aomen_selected_year');
                if (savedYear && document.getElementById('yearSel')) {
                    document.getElementById('yearSel').value = savedYear;
                }
                const savedMode = localStorage.getItem('aomen_selected_mode');
                if (savedMode && savedMode !== 'sum_trend' && savedMode !== 'span_trend' && document.getElementById('trendModeSel')) {
                    state.currentMode = savedMode;
                    document.getElementById('trendModeSel').value = savedMode;
                }
            } catch (e) {}

            initEvents();
            initCardCollapse();
            initFilterCalculatorListeners();
            updateFollowZodiacOptions();
            updateTailOptions();
            updateFollowNumAbsentOptions();
            buildModeQuickBar();
            updateFollowPanelSummaries();
            updateSetModeButton();
            updateKillChipsUI();
            updateColdCalcWindowUI();
            updateLiveSelectionPreview();
            initTheme();
            buildOverlayOptions();
            initUserStrategies();
            initAllDualSliders();

            // 恢复推荐配置
            loadRecConfig();

            // 初始化10期倍投计算器
            calculateBetPlan();

            // 监听年份切换以自动持久化
            const yearSelEl = document.getElementById('yearSel');
            if (yearSelEl) {
                yearSelEl.addEventListener('change', (e) => {
                    try { localStorage.setItem('aomen_selected_year', e.target.value); } catch (err) {}
                });
            }

            fetchData();
        });

        // ==================== 高性能分帧防抖重绘引擎 ====================
        let drawRafId = null;
        function requestDraw() {
            if (drawRafId) return;
            drawRafId = requestAnimationFrame(() => {
                drawRafId = null;
                draw();
            });
        }

        function resizeCanvas() {
            const container = state.canvas.parentElement;
            const header = container.querySelector('.chart-header');
            const headerHeight = header ? header.offsetHeight : 50;
            const dpr = window.devicePixelRatio || 1;
            
            const targetHeight = container.clientHeight - headerHeight;
            state.canvas.width = container.clientWidth * dpr;
            state.canvas.height = targetHeight * dpr;
            state.canvas.style.width = container.clientWidth + 'px';
            state.canvas.style.height = targetHeight + 'px';
            state.canvas.style.top = headerHeight + 'px'; // 动态对齐到头部信息栏正下方
            
            state.ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换，防止缩放叠加累积
            state.ctx.scale(dpr, dpr);
        }

        function initEvents() {
            const canvas = state.canvas;

            document.addEventListener('click', (e) => {
                const tooltip = document.getElementById('klineTooltip');
                const chartSection = document.getElementById('chartSection');
                if (tooltip && chartSection && !chartSection.contains(e.target)) {
                    hideKlineTooltip();
                }
            });

            canvas.addEventListener('mousemove', (e) => {
                if (state.isDragging) {
                    const dx = e.clientX - state.lastMouse.x;
                    const dy = e.clientY - state.lastMouse.y;
                    state.viewState.x += dx;
                    state.viewState.y += dy;
                    state.lastMouse.x = e.clientX;
                    state.lastMouse.y = e.clientY;
                    requestDraw();
                    return;
                }

                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                const logicalWidth = canvas.width / dpr;
                const { spacing, startX } = getChartSettings(state.visibleData.length, logicalWidth);

                const mouseX = e.clientX - rect.left - state.viewState.x;

                let idx = Math.round((mouseX - startX) / spacing);
                idx = Math.max(0, Math.min(idx, state.visibleData.length - 1));

                if (idx !== state.hoverIndex) {
                    state.hoverIndex = idx;
                    requestDraw();
                    updateInfoPanel(state.visibleData[idx]);
                    
                    if (state.visibleData[idx]) {
                        showKlineTooltip(state.visibleData[idx], state.lastMouse.x - rect.left, e.clientY - rect.top);
                    }
                }
                
                state.lastMouse.x = e.clientX;
                state.lastMouse.y = e.clientY;
            });

            canvas.addEventListener('mousedown', (e) => {
                state.isDragging = true;
                state.lastMouse.x = e.clientX;
                state.lastMouse.y = e.clientY;
                canvas.style.cursor = 'grabbing';
            });

            window.addEventListener('mouseup', () => {
                state.isDragging = false;
                canvas.style.cursor = 'crosshair';
            });

            canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const rect = canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                
                const oldScale = state.viewState.scale;
                const delta = e.deltaY > 0 ? 0.9 : 1.1;
                state.viewState.scale = Math.max(0.2, Math.min(20, state.viewState.scale * delta));
                
                state.viewState.x = mouseX - (mouseX - state.viewState.x) * (state.viewState.scale / oldScale);
                
                requestDraw();
            });

            canvas.addEventListener('mouseleave', () => {
                state.hoverIndex = -1;
                requestDraw();
                hideKlineTooltip();
                if (state.latestDataRecord) {
                    updateInfoPanel(state.latestDataRecord, false);
                } else if (state.visibleData && state.visibleData.length > 0) {
                    updateInfoPanel(state.visibleData[state.visibleData.length - 1], false);
                }
            });

            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    state.isDragging = true;
                    state.lastMouse.x = e.touches[0].clientX;
                    state.lastMouse.y = e.touches[0].clientY;
                    
                    const rect = canvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    const logicalWidth = canvas.width / dpr;
                    const { spacing, startX } = getChartSettings(state.visibleData.length, logicalWidth);
                    const touchX = e.touches[0].clientX - rect.left - state.viewState.x;
                    let idx = Math.round((touchX - startX) / spacing);
                    state.hoverIndex = Math.max(0, Math.min(idx, state.visibleData.length - 1));
                    requestDraw();
                    if (state.visibleData[state.hoverIndex]) {
                        updateInfoPanel(state.visibleData[state.hoverIndex]);
                    }
                } else if (e.touches.length === 2) {
                    state.isDragging = false;
                    state.lastTouchDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                }
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1 && state.isDragging) {
                    const dx = e.touches[0].clientX - state.lastMouse.x;
                    const dy = e.touches[0].clientY - state.lastMouse.y;
                    state.viewState.x += dx;
                    state.viewState.y += dy;
                    state.lastMouse.x = e.touches[0].clientX;
                    state.lastMouse.y = e.touches[0].clientY;
                    requestDraw();
                } else if (e.touches.length === 2) {
                    e.preventDefault();
                    const dist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    
                    if (state.lastTouchDist > 0) {
                        const factor = dist / state.lastTouchDist;
                        const oldScale = state.viewState.scale;
                        state.viewState.scale = Math.max(0.2, Math.min(20, state.viewState.scale * factor));
                        
                        const rect = canvas.getBoundingClientRect();
                        const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
                        state.viewState.x = centerX - (centerX - state.viewState.x) * (state.viewState.scale / oldScale);
                        
                        requestDraw();
                    }
                    state.lastTouchDist = dist;
                }
            }, { passive: false });

            canvas.addEventListener('touchend', () => {
                state.isDragging = false;
                state.lastTouchDist = 0;
                setTimeout(() => {
                    if (!state.isDragging && state.hoverIndex >= 0) {
                        state.hoverIndex = -1;
                        requestDraw();
                        hideKlineTooltip();
                        if (state.latestDataRecord) {
                            updateInfoPanel(state.latestDataRecord, false);
                        } else if (state.visibleData && state.visibleData.length > 0) {
                            updateInfoPanel(state.visibleData[state.visibleData.length - 1], false);
                        }
                    }
                }, 3000);
            });
        }

        let toastTimer = null;
        function showToast(msg, duration = 2200) {
            const el = document.getElementById('appToast');
            if (!el) return;
            el.innerHTML = msg;
            el.classList.add('show');
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(() => {
                el.classList.remove('show');
            }, duration);
        }

        function switchSidebarCategory(category) {
            state.activeSidebarCategory = category;
            try {
                localStorage.setItem('aomen_sidebar_category', category);
            } catch (e) {}

            const pills = document.querySelectorAll('.sidebar-cat-pill');
            pills.forEach(p => {
                const fn = p.getAttribute('onclick') || '';
                p.classList.toggle('active', fn.includes(`'${category}'`));
            });

            const cards = document.querySelectorAll('.sidebar-card');
            let firstVisibleCard = null;
            cards.forEach(card => {
                const isColdCard = card.id === 'coldCard';
                if (isColdCard && state.currentMode !== 'cold_custom') {
                    card.style.display = 'none';
                    return;
                }

                const cat = card.getAttribute('data-category') || '';
                const catList = cat.split(',').map(s => s.trim());
                if (category === 'all' || catList.includes(category)) {
                    card.style.display = '';
                    if (!firstVisibleCard) firstVisibleCard = card;
                } else {
                    card.style.display = 'none';
                }
            });

            if (firstVisibleCard && category !== 'all') {
                firstVisibleCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        function initCardCollapse() {
            const cards = document.querySelectorAll('.sidebar-card');
            let savedCollapse = {};
            try {
                savedCollapse = JSON.parse(localStorage.getItem('aomen_cards_collapsed') || '{}');
            } catch (e) {}

            cards.forEach((card, idx) => {
                const header = card.querySelector('h3');
                if (!header) return;

                const cardKey = card.id || ('card_' + idx);
                if (savedCollapse[cardKey]) {
                    card.classList.add('collapsed');
                }

                if (header.querySelector('.card-toggle-arrow')) return;

                const arrow = document.createElement('span');
                arrow.className = 'card-toggle-arrow';
                arrow.textContent = '▼';

                const actionGroup = header.querySelector('.rec-header-actions');
                if (actionGroup) {
                    actionGroup.appendChild(arrow);
                } else {
                    header.appendChild(arrow);
                }

                header.addEventListener('click', (e) => {
                    if (e.target && ['INPUT', 'SELECT', 'BUTTON', 'LABEL'].includes(e.target.tagName)) return;
                    card.classList.toggle('collapsed');
                    try {
                        const curr = JSON.parse(localStorage.getItem('aomen_cards_collapsed') || '{}');
                        curr[cardKey] = card.classList.contains('collapsed');
                        localStorage.setItem('aomen_cards_collapsed', JSON.stringify(curr));
                    } catch (err) {}
                });
            });

            // 恢复上次选中的分类
            try {
                const savedCat = localStorage.getItem('aomen_sidebar_category');
                if (savedCat) {
                    switchSidebarCategory(savedCat);
                }
            } catch (e) {}
        }

        // ==================== 数据获取 ====================
        async function fetchData() {
            showLoading(true);
            const year = document.getElementById('yearSel').value;
            state.currentYear = parseInt(year);

            try {
                await fetchDataInternal();
                showLoading(false);
                return true;
            } catch (err) {
                console.error('Fetch error:', err);
                // 检查本地是否有历史缓存
                const cacheKey = `lottery_data_${year}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const result = parsed.data || parsed;
                        if (Array.isArray(result) && result.length > 0) {
                            showToast(`⚠️ 网络不畅，已载入 ${year} 年本地缓存数据`, 3000);
                            processData(result);
                            showLoading(false);
                            return true;
                        }
                    } catch (e) {}
                }

                // 若首次使用无任何缓存，展示重试与使用离线演示数据操作面板
                showLoading(true, true, `数据请求失败: ${err.message || '网络连接超时'}。您可以重试或载入演示数据继续体验。`);
                return false;
            }
        }

        function getSelectedLoadCount() {
            const pageSizeSel = document.getElementById('pageSizeSel');
            if (!pageSizeSel) return Infinity;
            return pageSizeSel.value === 'all' ? Infinity : parseInt(pageSizeSel.value);
        }

        async function fetchYearData(year) {
            if (!year || isNaN(year)) {
                throw new Error('Invalid year: ' + year);
            }
            const currentActualYear = new Date().getFullYear();
            const isHistoricalYear = parseInt(year, 10) < currentActualYear;
            const cacheKey = `lottery_data_${year}`;
            const cached = localStorage.getItem(cacheKey);
            const cacheTime = localStorage.getItem(`${cacheKey}_time`);

            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime, 10);
                const maxAge = isHistoricalYear ? Infinity : 6 * 60 * 60 * 1000;
                if (age < maxAge) {
                    try {
                        const data = JSON.parse(cached);
                        const result = data.data || data;
                        if (Array.isArray(result) && result.length > 0) {
                            return result;
                        }
                    } catch (e) {
                        console.warn('Cache parse error for year', year, e);
                    }
                }
            }

            const apiUrl = `https://history.macaumarksix.com/history/macaujc2/y/${year}`;
            const proxyUrl = `/api/proxy?year=${year}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            let response = await fetch(proxyUrl, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: controller.signal }).catch(() => null);
            if (!response || !response.ok) {
                const fallbackController = new AbortController();
                const fallbackTimeout = setTimeout(() => fallbackController.abort(), 10000);
                response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: fallbackController.signal
                });
                clearTimeout(fallbackTimeout);
            }

            clearTimeout(timeoutId);
            if (!response || !response.ok) {
                // 网络失败时，尝试降级读取本地已有的任何缓存版本，保障离线可用性
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        const result = parsed.data || parsed;
                        if (Array.isArray(result) && result.length > 0) {
                            showToast(`⚠️ 网络连接受限，已载入 ${year} 年本地离线数据`, 2800);
                            return result;
                        }
                    } catch (e) {}
                }
                throw new Error(`HTTP ${response ? response.status : 'Network Failed'}`);
            }
            const data = await response.json();

            if (data.data && Array.isArray(data.data) && data.data.length > 0) {
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
                return data.data;
            }

            if (Array.isArray(data) && data.length > 0) {
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(`${cacheKey}_time`, Date.now().toString());
                return data;
            }

            throw new Error('Invalid data format');
        }

        async function fetchDataInternal() {
            const year = document.getElementById('yearSel').value;
            state.currentYear = parseInt(year);
            const requiredCount = Infinity;
            const years = Object.keys(CONFIG.zodiacMap).map(Number).sort((a, b) => b - a);
            const currentYearIndex = years.indexOf(state.currentYear);
            const selectedYears = currentYearIndex >= 0 ? years.slice(currentYearIndex) : [state.currentYear];

            const allData = [];
            const progEl = document.getElementById('loadingProgress');
            if (progEl) progEl.textContent = '正在加载 ' + selectedYears.length + ' 年数据...';
            const yearPromises = selectedYears.map(yearToLoad =>
                fetchYearData(yearToLoad).then(data => ({ year: yearToLoad, data })).catch(e => {
                    console.warn('Year fetch failed', yearToLoad, e);
                    return { year: yearToLoad, data: null };
                })
            );
            const results = await Promise.all(yearPromises);
            results.forEach(({ year: yearToLoad, data: yearData }) => {
                if (yearData && Array.isArray(yearData) && yearData.length) {
                    allData.push(...yearData);
                    state.loadedYears.add(yearToLoad);
                }
            });

            if (allData.length === 0) {
                throw new Error('Invalid data format');
            }

            document.getElementById('jsonInput').value = JSON.stringify(allData);
            if (progEl) progEl.textContent = '数据加载完成，正在处理...';
            processData(allData);
            return true;
        }

        async function ensureCrossYearData(requiredCount) {
            if (state.historyData.length >= requiredCount) return;
            const years = Object.keys(CONFIG.zodiacMap).map(Number).sort((a, b) => b - a);
            const currentYearIndex = years.indexOf(state.currentYear);
            const selectedYears = currentYearIndex >= 0 ? years.slice(currentYearIndex) : [state.currentYear];
            const combinedData = [...state.processedList];
            const loaded = new Set(state.loadedYears);

            for (const yearToLoad of selectedYears) {
                if (loaded.has(yearToLoad)) continue;
                try {
                    const yearData = await fetchYearData(yearToLoad);
                    if (yearData && Array.isArray(yearData) && yearData.length) {
                        combinedData.push(...yearData);
                        loaded.add(yearToLoad);
                        state.loadedYears.add(yearToLoad);
                    }
                } catch (e) {
                    console.warn('Year fetch failed', yearToLoad, e);
                }
                if (combinedData.length >= requiredCount) break;
            }

            if (combinedData.length > state.processedList.length) {
                processData(combinedData);
            }
        }

        function clearCacheAndRetry() {
            const years = Object.keys(CONFIG.zodiacMap);
            years.forEach(y => {
                localStorage.removeItem(`lottery_data_${y}`);
                localStorage.removeItem(`lottery_data_${y}_time`);
            });
            fetchData();
        }

        function loadMockData() {
            const warningList = document.getElementById('warningList');
            if (warningList) warningList.innerHTML = '<div style="text-align:center;color:var(--text-secondary);padding:15px;font-size:12px;">✓ 已加载演示数据</div>';
            const warnCount = document.getElementById('warnCount');
            if (warnCount) warnCount.textContent = '0';

            const mockData =[];
            const base = parseInt(state.currentYear + '001');
            let lastOmissions = {};
            CONFIG.zodiacMap[state.currentYear].forEach(z => lastOmissions[z] = 0);

            for (let i = 0; i < 300; i++) {
                const codes = [];
                const zodiacs =[];
                const waves =[];
                const used = new Set();

                while (codes.length < 6) {
                    const n = Math.floor(Math.random() * 49) + 1;
                    const s = n.toString().padStart(2, '0');
                    if (!used.has(s)) {
                        used.add(s);
                        codes.push(s);
                        zodiacs.push(getZodiac(n));
                        waves.push(getColor(s));
                    }
                }

                const special = generateWeightedNumber(lastOmissions);
                const specialStr = special.toString().padStart(2, '0');
                const specialZodiac = getZodiac(special);

                CONFIG.zodiacMap[state.currentYear].forEach(z => {
                    lastOmissions[z] = (z === specialZodiac) ? 0 : lastOmissions[z] + 1;
                });

                mockData.push({
                    expect: (base + i).toString(),
                    openTime: new Date(state.currentYear, 0, 1 + Math.floor(i / 3)).toISOString().split('T')[0],
                    openCode: [...codes, specialStr].join(','),
                    zodiac: [...zodiacs, specialZodiac].join(','),
                    wave: [...waves, getColor(specialStr)].join(',')
                });
            }
            processData(mockData);
        }

        function generateWeightedNumber(omissions) {
            const zodiacs = CONFIG.zodiacMap[state.currentYear];
            const weights = zodiacs.map(z => Math.pow(omissions[z] + 1, 1.5));
            const total = weights.reduce((a, b) => a + b, 0);
            let random = Math.random() * total;

            for (let i = 0; i < zodiacs.length; i++) {
                random -= weights[i];
                if (random <= 0) {
                    const base = i + 1;
                    const candidates = [base, base + 12, base + 24, base + 36].filter(n => n <= 49);
                    return candidates[Math.floor(Math.random() * candidates.length)];
                }
            }
            return Math.floor(Math.random() * 49) + 1;
        }

        function loadMockDataAndRefresh() {
            loadMockData();
            setTimeout(() => {
                updateOmissionStats();
            }, 500);
        }

        // ==================== 核心处理 ====================
        function processData(input) {
            try {
                const parsed = typeof input === 'string' ? JSON.parse(input) : input;
                const list = parsed.data || parsed;
                if (!Array.isArray(list) || list.length === 0) throw new Error('Invalid data');

                const seen = new Set();
                state.processedList = list.filter(item => {
                    if (seen.has(item.expect)) return false;
                    seen.add(item.expect);
                    return true;
                }).sort((a, b) => {
                    const ka = parseInt(String(a.expect).replace(/\D/g, ''), 10);
                    const kb = parseInt(String(b.expect).replace(/\D/g, ''), 10);
                    if (!isNaN(ka) && !isNaN(kb)) return ka - kb;
                    return String(a.expect).localeCompare(String(b.expect));
                });
                // 确保按时间从旧到新排列（防止上游返回新期在前导致遗漏统计反向）
                const firstN = state.processedList.length ? parseInt(String(state.processedList[0].expect).replace(/\D/g, ''), 10) : NaN;
                const lastN = state.processedList.length ? parseInt(String(state.processedList[state.processedList.length - 1].expect).replace(/\D/g, ''), 10) : NaN;
                if (!isNaN(firstN) && !isNaN(lastN) && firstN > lastN) {
                    state.processedList.reverse();
                }

                state.processedList.forEach(item => {
                    if (item.zodiac) {
                        item.zodiac = item.zodiac
                            .replace(/龍/g, '龙')
                            .replace(/豬/g, '猪')
                            .replace(/雞/g, '鸡')
                            .replace(/馬/g, '马');
                    }
                });

                recalcData();
            } catch (e) {
                console.error('Process error:', e);
                alert('数据处理失败: ' + e.message);
            }
        }

        function recalcData() {
            const list = [...state.processedList];
            updateFollowZodiacOptions();
            updateTailOptions();
            updateFollowNumAbsentOptions();
            updateFollowPanelSummaries();
            buildOverlayOptions();
            const zodiacs = CONFIG.zodiacMap[state.currentYear];
            let omissions = {};
            let counts = {};
            state.globalMaxOm = {};
            zodiacs.forEach(z => {
                omissions[z] = 0;
                counts[z] = 0;
                state.globalMaxOm[z] = 0;
            });

            state.historyData =[];
            let score = 0;
            let colorScores = { red: 0, blue: 0, green: 0 };
            const maWindow =[];
            let prevFollowZodiac = null;
            let prevPeriodZodiacs = null;
            const numLastSeen = {};
            for (let n = 1; n <= 49; n++) numLastSeen[n.toString().padStart(2, '0')] = -1;
            let prevFollowTail = null;
            const tailLastSeen = {};
            for (let t = 0; t <= 9; t++) tailLastSeen[t] = -1;
            let tailOmissions = {};
            let tailCounts = {};
            state.tailGlobalMaxOm = {};
            for (let t = 0; t <= 9; t++) {
                tailOmissions[t] = 0;
                tailCounts[t] = 0;
                state.tailGlobalMaxOm[t] = 0;
            }
            const overlayItems = (state.overlay && state.overlay.enabled && state.overlay.type !== 'cold' && state.overlay.items) || [];
            const overlayScores = {};
            const colorStreaks = {
                red: { up: 0, down: 0, maxUp: 0, maxDown: 0 },
                blue: { up: 0, down: 0, maxUp: 0, maxDown: 0 },
                green: { up: 0, down: 0, maxUp: 0, maxDown: 0 }
            };

            let colorOmissions = { red: 0, blue: 0, green: 0 };
            let sizeOmissions = { big: 0, small: 0 };
            let colorMaxOmissions = { red: 0, blue: 0, green: 0 };
            let sizeMaxOmissions = { big: 0, small: 0 };

            list.forEach((item, idx) => {
                const zList = item.zodiac.split(',');
                const wList = (item.wave || '').split(',');
                const cList = item.openCode.split(',');
                const winZ = zList[6];
                const winNum = parseInt(cList[6]);

                let step = 0;
                const color = getColor(cList[6]);
                let coldHitSetsForPoint = null;
                let coldMatchesForPoint = 0;
                let followTargetForPoint = null;

                if (state.currentMode === 'zodiac') {
                    const sorted = zodiacs.map(z => ({ name: z, om: omissions[z] }))
                        .sort((a, b) => a.om - b.om);
                    const hot6 = sorted.slice(0, 6).map(x => x.name);
                    step = hot6.includes(winZ) ? 1 : -1;
                } else if (state.currentMode === 'oddeven') {
                    step = winNum % 2 === 1 ? 1 : -1;
                } else if (state.currentMode === 'bigsmall') {
                    step = winNum >= 25 ? 1 : -1;
                } else if (state.currentMode === 'color') {
                    colorScores.red += (color === 'red' ? 1 : -0.5);
                    colorScores.blue += (color === 'blue' ? 1 : -0.5);
                    colorScores.green += (color === 'green' ? 1 : -0.5);
                    step = 0;
                } else if (state.currentMode === 'cold_custom' && state.coldSelection && state.coldSelection.types.length) {
                    const cold = state.coldSelection;
                    if (cold.setKline) {
                        const rollingSets = calculateColdSets(
                            cold.setTypes || [],
                            getRollingColdSourceData(state.historyData, idx),
                            cold.setCounts || {},
                            getRollingHotColdSourceData(state.historyData, idx)
                        );
                        const rollingOptionSets = getColdOptionNumberSets({
                            ...rollingSets,
                            base49: (cold.setTypes && cold.setTypes.includes('base49')),
                            inputNumbers: cold.selectedNumbers,
                            inputTerms: cold.inputTerms,
                            selectZodiacs: cold.selectedZodiacs,
                            selectedWaves: cold.selectedWaves,
                            selectedWuxings: cold.selectedWuxings,
                            selectedWuxingDs: cold.selectedWuxingDs,
                            selectedMorphs: cold.selectedMorphs,
                            selectedHeNumbers: cold.selectedHeNumbers,
                            selectedHeTails: cold.selectedHeTails,
                            selectedHeads: cold.selectedHeads,
                            selectedTails: cold.selectedTails
                        });
                        const smode = cold.setMode || cold.filterCalcMode || 'all';
                        const killsToUse = cold.excludeKills || state.excludeKills;
                        const rollingColdSource = getRollingColdSourceData(state.historyData, idx);
                        const { finalNumbers: nums } = applySetModeAndExcludeKills(
                            rollingOptionSets,
                            smode,
                            killsToUse,
                            rollingColdSource
                        );
                        // 悬浮显示用含本期的窗口（本期开奖后数据）
                        const currentPointForSets = {
                            winNum,
                            win: winZ,
                            codes: cList.map((n, i) => ({ num: n, wave: item.wave ? item.wave.split(',')[i] : getColor(n) })),
                            pingXiao: zList.slice(0, 6).join(' ')
                        };
                        const currentData = state.historyData.concat([currentPointForSets]);
                        const currentSets = calculateColdSets(
                            cold.setTypes || [],
                            getCurrentColdSourceData(currentData),
                            cold.setCounts || {},
                            getCurrentHotColdSourceData(currentData)
                        );
                        const currentOptionSets = getColdOptionNumberSets({
                            ...currentSets,
                            base49: (cold.setTypes && cold.setTypes.includes('base49')),
                            inputNumbers: cold.selectedNumbers,
                            inputTerms: cold.inputTerms,
                            selectZodiacs: cold.selectedZodiacs,
                            selectedWaves: cold.selectedWaves,
                            selectedWuxings: cold.selectedWuxings,
                            selectedWuxingDs: cold.selectedWuxingDs,
                            selectedMorphs: cold.selectedMorphs,
                            selectedHeNumbers: cold.selectedHeNumbers,
                            selectedHeTails: cold.selectedHeTails,
                            selectedHeads: cold.selectedHeads,
                            selectedTails: cold.selectedTails
                        });
                        const { finalNumbers: curNums } = applySetModeAndExcludeKills(
                            currentOptionSets,
                            smode,
                            killsToUse,
                            getCurrentColdSourceData(currentData)
                        );
                        coldHitSetsForPoint = { ...currentSets, setKline: curNums.map(n => parseInt(n, 10)) };
                        if (cold.inputTerms) coldHitSetsForPoint.inputNumbers = formatInputTerms(cold.inputTerms);
                        if (cold.selectedZodiacs && cold.selectedZodiacs.length) coldHitSetsForPoint.selectZodiacs = cold.selectedZodiacs;
                        if (cold.selectedWaves && cold.selectedWaves.length) coldHitSetsForPoint.selectedWaves = cold.selectedWaves;
                        if (cold.selectedWuxings && cold.selectedWuxings.length) coldHitSetsForPoint.selectedWuxings = cold.selectedWuxings;
                        if (cold.selectedWuxingDs && cold.selectedWuxingDs.length) coldHitSetsForPoint.selectedWuxingDs = cold.selectedWuxingDs;
                        if (cold.selectedMorphs && cold.selectedMorphs.length) coldHitSetsForPoint.selectedMorphs = cold.selectedMorphs;
                        if (cold.selectedHeNumbers && cold.selectedHeNumbers.length) coldHitSetsForPoint.selectedHeNumbers = cold.selectedHeNumbers;
                        if (cold.selectedHeTails && cold.selectedHeTails.length) coldHitSetsForPoint.selectedHeTails = cold.selectedHeTails;
                        if (cold.selectedHeheads && cold.selectedHeheads.length) coldHitSetsForPoint.selectedHeheads = cold.selectedHeheads;
                        if (cold.selectedHeads && cold.selectedHeads.length) coldHitSetsForPoint.selectedHeads = cold.selectedHeads;
                        if (cold.selectedTails && cold.selectedTails.length) coldHitSetsForPoint.selectedTails = cold.selectedTails;
                        if (nums.length >= 1) {
                            followTargetForPoint = nums.map(n => parseInt(n, 10)).join('、');
                            step = nums.includes(winNum.toString().padStart(2, '0')) ? 1 : -1;
                            coldMatchesForPoint = step > 0 ? 1 : 0;
                        } else {
                            followTargetForPoint = '';
                            step = 0;
                            coldMatchesForPoint = 0;
                        }
                    } else {
                        const rollingColdSets = calculateColdSets(
                            cold.types,
                            getRollingColdSourceData(state.historyData, idx),
                            cold.counts || {},
                            getRollingHotColdSourceData(state.historyData, idx)
                        );
                        coldHitSetsForPoint = rollingColdSets;
                        let matches = 0;
                        const numStr = winNum.toString().padStart(2, '0');
                        const allNums = cList.map(n => n.toString().padStart(2, '0'));
                        const allZodiacs = zList.filter(Boolean);
                        const headKey = `${Math.floor(winNum / 10)}头`;
                        const tailKey = `${winNum % 10}尾`;
                        const halfWaveKey = getHalfWaveKey(cList[6]);
                        const halfHeadKey = getHalfHeadKey(winNum);
                        const segment = getSegmentKey(winNum);
                        const regionKey = getRegionKey(winNum);
                        const regionShort = getRegionShortKey(winNum);
                        const jiaYe = getJiaYe(winZ);

                        matches = countColdConditionMatches(cold, rollingColdSets, {
                            numStr, winZ, winNum, color, cList,
                            headKey, tailKey, halfWaveKey, halfHeadKey, segment, regionKey, regionShort, jiaYe,
                            wuxingKey: getWuxingKey(winNum),
                            wuxingDsKey: getWuxingDsKey(winNum)
                        });

                        step = matches > 0 ? 1 : -1;
                        coldMatchesForPoint = matches;
                    }
                } else if (state.currentMode === 'pingxiao_follow') {
                    if (state.followMode === 'missnum') {
                        const ranks = (state.followMissRanks || [])
                            .filter(r => r >= 1 && r <= 15)
                            .sort((a, b) => a - b);
                        if (idx >= 1 && ranks.length >= 1) {
                            const sortedNums = Object.entries(numLastSeen)
                                .sort((a, b) => {
                                    const omA = idx - 1 - a[1];
                                    const omB = idx - 1 - b[1];
                                    return omB - omA || parseInt(a[0], 10) - parseInt(b[0], 10);
                                })
                                .map(e => e[0]);
                            const targets = ranks.map(r => sortedNums[r - 1]);
                            followTargetForPoint = ranks.map((r, i) => `${r}名${parseInt(targets[i], 10)}(${getZodiac(parseInt(targets[i], 10))})`).join('、');
                            step = targets.every(num => zList.includes(getZodiac(parseInt(num, 10)))) ? 1 : -1;
                        }
                    } else if (state.followMode === 'multi') {
                        const targets = (state.followMultiZodiacs || []).filter(Boolean);
                        if (targets.length >= 2 && targets.length <= 5) {
                            followTargetForPoint = targets.join('、');
                            step = targets.every(z => zList.includes(z)) ? 1 : -1;
                        }
                    } else {
                        const followTarget = state.followMode === 'zodiac' ? state.followZodiac : prevFollowZodiac;
                        followTargetForPoint = followTarget;
                        step = followTarget ? (zList.includes(followTarget) ? 1 : -1) : 0;
                    }
                } else if (state.currentMode === 'special_zodiac_follow') {
                    // 用上一期全部 7 个开奖号对应生肖，判断本期特肖是否延续开出。
                    if (prevPeriodZodiacs) {
                        const targets = [...new Set(prevPeriodZodiacs.filter(Boolean))];
                        followTargetForPoint = targets.join('、');
                        step = targets.includes(winZ) ? 1 : -1;
                    }
                } else if (state.currentMode === 'pingtail_follow') {
                    const tailHit = tail => cList.some(n => parseInt(n, 10) % 10 === tail);
                    if (state.tailMode === 'missrank') {
                        const ranks = (state.tailMissRanks || [])
                            .filter(r => r >= 1 && r <= 10)
                            .sort((a, b) => a - b);
                        if (idx >= 1 && ranks.length >= 1) {
                            const sortedTails = Object.entries(tailLastSeen)
                                .sort((a, b) => {
                                    const omA = idx - 1 - a[1];
                                    const omB = idx - 1 - b[1];
                                    return omB - omA || parseInt(a[0], 10) - parseInt(b[0], 10);
                                })
                                .map(e => e[0]);
                            const targets = ranks.map(r => sortedTails[r - 1]);
                            followTargetForPoint = ranks.map((r, i) => `${r}名${targets[i]}尾`).join('、');
                            step = targets.every(t => tailHit(parseInt(t, 10))) ? 1 : -1;
                        }
                    } else if (state.tailMode === 'multi') {
                        const targets = (state.tailMultiTails || []).filter(t => t >= 0 && t <= 9);
                        if (targets.length >= 2 && targets.length <= 5) {
                            followTargetForPoint = targets.slice().sort((a, b) => a - b).map(t => t + '尾').join('、');
                            step = targets.every(t => tailHit(t)) ? 1 : -1;
                        }
                    } else if (state.tailMode === 'position') {
                        if (prevFollowTail !== null) {
                            followTargetForPoint = prevFollowTail + '尾';
                            step = tailHit(prevFollowTail) ? 1 : -1;
                        }
                    } else {
                        const t = state.tailValue;
                        if (t >= 0 && t <= 9) {
                            followTargetForPoint = t + '尾';
                            step = tailHit(t) ? 1 : -1;
                        }
                    }
                } else if (state.currentMode === 'pingnum_absent') {
                    const targets = (state.followNumAbsent || []).filter(Boolean);
                    if (targets.length >= 5 && targets.length <= 12) {
                        followTargetForPoint = targets.slice().sort((a, b) => parseInt(a, 10) - parseInt(b, 10)).map(n => parseInt(n, 10)).join('、');
                        step = targets.every(n => !cList.includes(n)) ? 1 : -1;
                    }
                } else if (state.currentMode === 'zodiac_hotcold' || state.currentMode === 'number_hotcold') {
                    const N = parseInt(document.getElementById('pageSizeSel')?.value) || state.historyData.length;
                    const isAll = document.getElementById('pageSizeSel')?.value === 'all';
                    const pageN = isAll ? Math.max(1, idx) : N;
                    const windowData = state.historyData.slice(Math.max(0, idx - pageN), idx);
                    if (windowData.length > 0) {
                        if (state.currentMode === 'zodiac_hotcold') {
                            const zCounts = {};
                            zodiacs.forEach(z => zCounts[z] = 0);
                            windowData.forEach(item => { if (item.win) zCounts[item.win]++; });
                            const hotZ = new Set(Object.entries(zCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(e => e[0]));
                            step = hotZ.has(winZ) ? 1 : -1;
                        } else {
                            const nCounts = {};
                            for (let n = 1; n <= 49; n++) nCounts[n] = 0;
                            windowData.forEach(item => { if (item.winNum) nCounts[item.winNum]++; });
                            const hotN = new Set(Object.entries(nCounts).sort((a, b) => b[1] - a[1] || parseInt(a[0]) - parseInt(b[0])).slice(0, 25).map(e => parseInt(e[0])));
                            step = hotN.has(winNum) ? 1 : -1;
                        }
                    } else {
                        step = -1;
                    }
                }

                ['red', 'blue', 'green'].forEach(c => {
                    if (c === color) {
                        colorOmissions[c] = 0;
                    } else {
                        colorOmissions[c]++;
                        colorMaxOmissions[c] = Math.max(colorMaxOmissions[c], colorOmissions[c]);
                    }
                });
                ['red', 'blue', 'green'].forEach(c => {
                    if (c === color) {
                        colorStreaks[c].up++;
                        colorStreaks[c].down = 0;
                        colorStreaks[c].maxUp = Math.max(colorStreaks[c].maxUp, colorStreaks[c].up);
                    } else {
                        colorStreaks[c].down++;
                        colorStreaks[c].up = 0;
                        colorStreaks[c].maxDown = Math.max(colorStreaks[c].maxDown, colorStreaks[c].down);
                    }
                });

                if (winNum >= 25) {
                    sizeOmissions.big = 0;
                    sizeOmissions.small++;
                    sizeMaxOmissions.small = Math.max(sizeMaxOmissions.small, sizeOmissions.small);
                } else {
                    sizeOmissions.big++;
                    sizeMaxOmissions.big = Math.max(sizeMaxOmissions.big, sizeOmissions.big);
                    sizeOmissions.small = 0;
                }

                score += step;
                maWindow.push(score);
                if (maWindow.length > 5) maWindow.shift();
                const ma5 = maWindow.reduce((a, b) => a + b, 0) / maWindow.length;

                zodiacs.forEach(z => {
                    if (z === winZ) {
                        omissions[z] = 0;
                        counts[z]++;
                    } else {
                        omissions[z]++;
                    }
                    if (omissions[z] > state.globalMaxOm[z]) {
                        state.globalMaxOm[z] = omissions[z];
                    }
                });

                for (let t = 0; t <= 9; t++) {
                    if (cList.some(n => parseInt(n, 10) % 10 === t)) {
                        tailOmissions[t] = 0;
                        tailCounts[t]++;
                    } else {
                        tailOmissions[t]++;
                    }
                    if (tailOmissions[t] > state.tailGlobalMaxOm[t]) {
                        state.tailGlobalMaxOm[t] = tailOmissions[t];
                    }
                }

                overlayItems.forEach(item => {
                    let ovHit = false;
                    if (state.overlay.type === 'zodiac') {
                        ovHit = zList.includes(item);
                    } else if (state.overlay.type === 'tail') {
                        ovHit = cList.some(n => parseInt(n, 10) % 10 === parseInt(item, 10));
                    } else {
                        ovHit = cList.includes(item);
                    }
                    overlayScores[item] = (overlayScores[item] || 0) + (ovHit ? 1 : -1);
                });
                if (state.overlay && state.overlay.enabled && state.overlay.type === 'cold' && state.overlay.coldSets && state.overlay.coldSets.length) {
                    state.overlay.coldSets.forEach((set, si) => {
                        const rolling = calculateColdSets(
                            set.types,
                            getRollingColdSourceData(state.historyData, idx),
                            set.counts || {},
                            getRollingHotColdSourceData(state.historyData, idx)
                        );
                        const numStrC = winNum.toString().padStart(2, '0');
                        const m = countColdConditionMatches(set, rolling, {
                            numStr: numStrC, winZ, winNum, color, cList,
                            headKey: `${Math.floor(winNum / 10)}头`,
                            tailKey: `${winNum % 10}尾`,
                            halfWaveKey: getHalfWaveKey(cList[6]),
                            halfHeadKey: getHalfHeadKey(winNum),
                            segment: getSegmentKey(winNum),
                            regionKey: getRegionKey(winNum),
                            regionShort: getRegionShortKey(winNum),
                            jiaYe: getJiaYe(winZ),
                            wuxingKey: getWuxingKey(winNum)
                        });
                        overlayScores['cold_' + si] = (overlayScores['cold_' + si] || 0) + (m > 0 ? 1 : -1);
                    });
                }

                const pointTotalSum = cList.reduce((acc, cur) => acc + parseInt(cur, 10), 0);
                const sortedNormal = cList.slice(0, 6).map(n => parseInt(n, 10)).sort((a, b) => a - b);
                const pointNormalSpan = sortedNormal.length > 0 ? (sortedNormal[sortedNormal.length - 1] - sortedNormal[0]) : 0;
                const prevSpecialNum = idx > 0 ? parseInt(list[idx - 1].openCode.split(',')[6], 10) : winNum;
                const pointSpecialAmp = Math.abs(winNum - prevSpecialNum);

                const historyPoint = {
                    expect: item.expect,
                    period: item.expect,
                    time: item.openTime,
                    win: winZ,
                    winNum: winNum,
                    special: winNum.toString().padStart(2, '0'),
                    numbers: cList.slice(0, 6),
                    step: step,
                    score: score,
                    ma5: ma5,
                    codes: cList.map((n, i) => ({ num: n, wave: item.wave ? item.wave.split(',')[i] : getColor(n) })),
                    pingXiao: zList.slice(0, 6).join(' '),
                    snapshot: { ...omissions },
                    counts: { ...counts },
                    tailSnapshot: { ...tailOmissions },
                    tailCounts: { ...tailCounts },
                    total: idx + 1,
                    totalSum: pointTotalSum,
                    normalSpan: pointNormalSpan,
                    specialAmplitude: pointSpecialAmp,
                    colorScores: { ...colorScores },
                    colorOmissions: { ...colorOmissions },
                    colorMaxOmissions: { ...colorMaxOmissions },
                    colorStreaks: {
                        red: { ...colorStreaks.red },
                        blue: { ...colorStreaks.blue },
                        green: { ...colorStreaks.green }
                    },
                    sizeOmissions: { ...sizeOmissions },
                    sizeMaxOmissions: { ...sizeMaxOmissions },
                    currentColor: color,
                    currentSize: winNum >= 25 ? 'big' : 'small',
                    overlayScores: { ...overlayScores },
                    coldHitSets: coldHitSetsForPoint,
                    coldMatches: coldMatchesForPoint,
                    followZodiac: followTargetForPoint,
                    followHit: state.currentMode === 'special_zodiac_follow' && !followTargetForPoint ? null : step > 0
                };

                state.historyData.push(historyPoint);

                if (state.currentMode === 'cold_custom' && state.coldSelection && state.coldSelection.types.length) {
                    if (state.coldSelection.setKline) {
                        historyPoint.coldSets = coldHitSetsForPoint || {};
                    } else {
                        historyPoint.coldSets = calculateColdSets(
                            state.coldSelection.types,
                            getCurrentColdSourceData(state.historyData),
                            state.coldSelection.counts || {},
                            getCurrentHotColdSourceData(state.historyData)
                        );
                        if (state.coldSelection.types.includes('inputNumbers') && state.coldSelection.inputTerms) {
                            historyPoint.coldSets.inputNumbers = formatInputTerms(state.coldSelection.inputTerms);
                        }
                    }
                }

                prevFollowZodiac = zList[state.followPosition] || null;
                prevPeriodZodiacs = zList;
                cList.forEach(num => { numLastSeen[num] = idx; });
                prevFollowTail = parseInt(cList[state.tailPosition], 10) % 10;
                new Set(cList.map(n => parseInt(n, 10) % 10)).forEach(t => { tailLastSeen[t] = idx; });
            });

            // 期数切换后，同步更新自由K线当前显示的号码集，避免仍保留生成时的旧窗口结果。
            if (state.currentMode === 'cold_custom' && state.coldSelection) {
                const cold = state.coldSelection;
                const selectedSourceData = getSelectedColdSourceData();
                const selectedHotColdSourceData = getSelectedHotColdSourceData();
                const latestSets = calculateColdSets(
                    cold.setKline ? (cold.setTypes || []) : cold.types,
                    selectedSourceData,
                    cold.setKline ? (cold.setCounts || {}) : (cold.counts || {}),
                    selectedHotColdSourceData
                );

                if (cold.setKline) {
                    const latestOptionSets = getColdOptionNumberSets({
                        ...latestSets,
                        base49: (cold.setTypes && cold.setTypes.includes('base49')),
                        inputNumbers: cold.selectedNumbers,
                        inputTerms: cold.inputTerms,
                        selectZodiacs: cold.selectedZodiacs,
                        selectedWaves: cold.selectedWaves,
                        selectedWuxings: cold.selectedWuxings,
                        selectedWuxingDs: cold.selectedWuxingDs,
                        selectedMorphs: cold.selectedMorphs,
                        selectedHeNumbers: cold.selectedHeNumbers,
                        selectedHeTails: cold.selectedHeTails,
                        selectedHeads: cold.selectedHeads,
                        selectedTails: cold.selectedTails
                    });
                    const setMode = cold.setMode || cold.filterCalcMode || 'all';
                    const killsToUse = cold.excludeKills || state.excludeKills;
                    const { finalNumbers: latestSetNumbers } = applySetModeAndExcludeKills(
                        latestOptionSets,
                        setMode,
                        killsToUse,
                        selectedSourceData
                    );
                    cold.setNumbers = latestSetNumbers;
                    cold.sets = { ...latestSets, setNumbers: latestSetNumbers };
                } else {
                    cold.sets = latestSets;
                }
                updateColdSummary();
            }

            updatePagination();

            // Pre-compute displayScore for all history data (hot/cold modes only set it for the visible page)
            if (['zodiac_hotcold', 'number_hotcold'].includes(state.currentMode)) {
                let ds = 0;
                const N = parseInt(document.getElementById('pageSizeSel').value) || state.historyData.length;
                const isAll = document.getElementById('pageSizeSel').value === 'all';
                const pageN = isAll ? state.historyData.length : N;
                state.historyData.forEach((d, i) => {
                    const windowData = state.historyData.slice(Math.max(0, i - pageN), i);
                    if (windowData.length > 0) {
                        const zCounts = {}; const nCounts = {};
                        CONFIG.zodiacMap[state.currentYear].forEach(z => zCounts[z] = 0);
                        for (let n = 1; n <= 49; n++) nCounts[n] = 0;
                        windowData.forEach(item => { if (item.win) zCounts[item.win]++; if (item.winNum) nCounts[item.winNum]++; });
                        if (state.currentMode === 'zodiac_hotcold') {
                            const hotZ = new Set(Object.entries(zCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6).map(e => e[0]));
                            ds += hotZ.has(d.win) ? 1 : -1;
                        } else {
                            const hotN = new Set(Object.entries(nCounts).sort((a, b) => b[1] - a[1] || parseInt(a[0]) - parseInt(b[0])).slice(0, 25).map(e => parseInt(e[0])));
                            ds += hotN.has(d.winNum) ? 1 : -1;
                        }
                    } else { ds += -1; }
                    d.displayScore = ds;
                });
            }

            changePage('last');
            updateStats();
            updatePeriodSelectors();

            const overall = computeMaxRiseFall(state.historyData);
            state.overallMaxRise = overall.maxRiseCount;
            state.overallMaxFall = overall.maxFallCount;
            updateColdCalcWindowUI();
            updateAllDualSliders();
            updateLiveSelectionPreview();
            schedulePanelUpdates();
        }

        let panelUpdateTimer = null;
        function schedulePanelUpdates() {
            if (panelUpdateTimer) clearTimeout(panelUpdateTimer);
            panelUpdateTimer = setTimeout(() => {
                panelUpdateTimer = null;
                updateChartLegend();
                updateKlineMetricsDisplay();
                renderOverlayComparison();
                renderHotColdMatrix();
                runBacktest();
            }, 150);
        }

        // ==================== 动态冷热数据拦截计算 ====================
        function updateDynamicHotCold() {
            const infoDiv = document.getElementById('dynamicHotColdInfo');
            
            if (!['zodiac_hotcold', 'number_hotcold'].includes(state.currentMode)) {
                if(infoDiv) infoDiv.style.display = 'none';
                state.visibleData.forEach(d => {
                    d.displayScore = d.score; 
                    d.displayMa5 = d.ma5;
                });
                return;
            }

            const pageSizeVal = document.getElementById('pageSizeSel').value;
            const N = pageSizeVal === 'all' ? state.historyData.length : parseInt(pageSizeVal);

            let dynamicScore = 0;
            const maWindow = [];

            let latestHotZ = [];
            let latestColdZ = [];
            let latestHotN = [];
            let latestColdN = [];

            state.visibleData.forEach(d => {
                const absIdx = d.total - 1; 
                
                const windowData = state.historyData.slice(Math.max(0, absIdx - N), absIdx);
                let step = 0;

                if (windowData.length > 0) {
                    const zCounts = {};
                    const nCounts = {};
                    CONFIG.zodiacMap[state.currentYear].forEach(z => zCounts[z] = 0);
                    for (let i = 1; i <= 49; i++) nCounts[i] = 0;

                    windowData.forEach(item => {
                        if (item.win) zCounts[item.win]++;
                        if (item.winNum) nCounts[item.winNum]++;
                    });

                    if (state.currentMode === 'zodiac_hotcold') {
                        const sortedZ = Object.entries(zCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
                        const hotZ = new Set(sortedZ.slice(0, 6).map(e => e[0]));
                        
                        latestHotZ = sortedZ.slice(0, 6).map(e => e[0]);
                        latestColdZ = sortedZ.slice(6).map(e => e[0]);

                        step = hotZ.has(d.win) ? 1 : -1;
                        d.isCurrentHot = step > 0;
                    } else if (state.currentMode === 'number_hotcold') {
                        const sortedN = Object.entries(nCounts).sort((a, b) => b[1] - a[1] || parseInt(a[0]) - parseInt(b[0]));
                        const hotN = new Set(sortedN.slice(0, 25).map(e => parseInt(e[0])));
                        
                        latestHotN = sortedN.slice(0, 25).map(e => parseInt(e[0]));
                        latestColdN = sortedN.slice(25).map(e => parseInt(e[0]));

                        step = hotN.has(d.winNum) ? 1 : -1;
                        d.isCurrentHot = step > 0;
                    }
                } else {
                    d.isCurrentHot = false;
                    step = -1; 
                }

                dynamicScore += step;
                maWindow.push(dynamicScore);
                if (maWindow.length > 5) maWindow.shift();
                const dynamicMa5 = maWindow.reduce((a, b) => a + b, 0) / maWindow.length;

                d.displayScore = dynamicScore;
                d.displayMa5 = dynamicMa5;
            });

            if (infoDiv) {
                infoDiv.style.display = 'flex';
                const periodText = pageSizeVal === 'all' ? '全部' : pageSizeVal;

                // 顶部横幅展示全量样本中最新 N 期的全局最新冷热分布，确保不受历史翻页影响
                let bannerHotZ = latestHotZ;
                let bannerColdZ = latestColdZ;
                let bannerHotN = latestHotN;
                let bannerColdN = latestColdN;

                const latestSlice = state.historyData.slice(Math.max(0, state.historyData.length - N));
                if (latestSlice.length > 0) {
                    const zCounts = {};
                    const nCounts = {};
                    const zMap = (CONFIG.zodiacMap && CONFIG.zodiacMap[state.currentYear]) || [];
                    zMap.forEach(z => { zCounts[z] = 0; });
                    for (let i = 1; i <= 49; i++) nCounts[i] = 0;
                    latestSlice.forEach(item => {
                        if (item.win && zCounts[item.win] !== undefined) zCounts[item.win]++;
                        if (item.winNum && nCounts[item.winNum] !== undefined) nCounts[item.winNum]++;
                    });
                    const sortedZ = Object.entries(zCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
                    bannerHotZ = sortedZ.slice(0, 6).map(e => e[0]);
                    bannerColdZ = sortedZ.slice(6).map(e => e[0]);

                    const sortedN = Object.entries(nCounts).sort((a, b) => b[1] - a[1] || parseInt(a[0], 10) - parseInt(b[0], 10));
                    bannerHotN = sortedN.slice(0, 25).map(e => parseInt(e[0], 10));
                    bannerColdN = sortedN.slice(25).map(e => parseInt(e[0], 10));
                }
                
                if (state.currentMode === 'zodiac_hotcold') {
                    const hotStr = bannerHotZ.join(' ') || '加载中...';
                    const coldStr = bannerColdZ.join(' ') || '加载中...';
                    infoDiv.innerHTML = `
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap: wrap; gap: 4px;">
                            <span style="white-space: nowrap;"><span style="color:var(--text-secondary);">基于前[${periodText}期] 最新热肖:</span> <span style="color:var(--up); font-weight:bold; font-size:13px; margin-left:4px;">${hotStr}</span></span>
                            <span style="white-space: nowrap;"><span style="color:var(--text-secondary);">最新冷肖:</span> <span style="color:var(--down); font-weight:bold; font-size:13px; margin-left:4px;">${coldStr}</span></span>
                        </div>
                    `;
                } else {
                    const hotStr = bannerHotN.map(n => n.toString().padStart(2, '0')).join(' ') || '加载中...';
                    const coldStr = bannerColdN.map(n => n.toString().padStart(2, '0')).join(' ') || '加载中...';
                    infoDiv.innerHTML = `
                        <div style="white-space: nowrap; overflow-x: auto; padding-bottom: 2px;">
                            <span style="color:var(--text-secondary);">基于前[${periodText}期] 最新热码:</span> <span style="color:var(--up); font-weight:bold; font-size:12px; margin-left:4px;">${hotStr}</span>
                        </div>
                        <div style="white-space: nowrap; overflow-x: auto; padding-bottom: 2px;">
                            <span style="color:var(--text-secondary);">最新冷码:</span> <span style="color:var(--down); font-weight:bold; font-size:12px; margin-left:4px;">${coldStr}</span>
                        </div>
                    `;
                }
            }
        }

        // ==================== 绘图引擎 ====================
        function getChartSettings(dataCount, width) {
            const padding = 30;
            const availableWidth = width - padding * 2;
            let baseSpacing = dataCount > 1 ? availableWidth / (dataCount - 1) : 10;
            let spacing = baseSpacing * state.viewState.scale;
            spacing = Math.max(1, Math.min(300, spacing));
            const totalWidth = (dataCount - 1) * spacing;
            const startX = totalWidth < availableWidth ? (width - totalWidth) / 2 : padding;
            return { spacing, startX, padding };
        }

        function draw() {
            const ctx = state.ctx;
            const canvas = state.canvas;
            const dpr = window.devicePixelRatio || 1;
            const width = canvas.width / dpr;
            const height = canvas.height / dpr;
            const data = state.visibleData;

            if (data.length === 0) return;

            computeDataSignals(data);

            ctx.clearRect(0, 0, width, height);

            ctx.save();
            ctx.translate(state.viewState.x, state.viewState.y);

            const { spacing, startX } = getChartSettings(data.length, width);

            if (state.currentMode === 'color') {
                drawColorModeFixed(ctx, data, width, height, spacing, startX);
            } else {
                drawNormalModeFixed(ctx, data, width, height, spacing, startX);
            }

            drawHoverEffect(ctx, data, width, height);

            ctx.restore();
         }


        // ==================== 图表坐标轴辅助 ====================
        function drawYAxisGrid(ctx, width, height, centerY, scaleY, maxVal, minVal) {
            const range = maxVal - minVal;
            const rawStep = [1, 2, 5, 10, 20, 50, 100].find(s => range / s <= 8) || 50;
            const start = Math.floor(minVal / rawStep) * rawStep;
            const end = Math.ceil(maxVal / rawStep) * rawStep;
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'right';
            for (let v = start; v <= end; v += rawStep) {
                if (Math.abs(v) < rawStep * 0.1) continue;
                const y = centerY - v * scaleY;
                if (y < 0 || y > height) continue;
                ctx.strokeStyle = themeGrid(0.12);
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 6]);
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = themeText(0.45);
                ctx.fillText(v > 0 ? '+' + v : '' + v, -6, y + 3);
            }
        }
        function drawXAxisLabels(ctx, data, width, height, spacing, startX) {
            if (data.length < 2) return;
            const labelCount = Math.min(data.length, Math.max(3, Math.floor(width / 60)));
            const step = Math.max(1, Math.floor(data.length / labelCount));
            ctx.font = '9px sans-serif';
            ctx.textAlign = 'center';
            for (let i = 0; i < data.length; i += step) {
                const d = data[i];
                const x = startX + i * spacing;
                const label = d.expect.slice(-4);
                ctx.fillStyle = themeText(0.4);
                ctx.fillText(label, x, height - 8);
                ctx.strokeStyle = themeGrid(0.15);
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x, height - 16);
                ctx.lineTo(x, height - 12);
                ctx.stroke();
            }
        }
        function drawNormalModeFixed(ctx, data, width, height, spacing, startX) {
            const baseScore = data.length > 0 ? data[0].displayScore : 0;
            const scores = data.map(d => d.displayScore - baseScore);
            let maxScore = Math.max(...scores, 5);
            let minScore = Math.min(...scores, -5);
            const overlayOk = state.overlay && state.overlay.enabled &&
                ((state.overlay.type === 'cold' && (state.overlay.coldSets || []).length >= 1) ||
                 (state.overlay.type !== 'cold' && state.overlay.items.length >= 2));
            if (overlayOk) {
                const ovItems = (state.overlay.type === 'cold'
                    ? (state.overlay.coldSets || []).map((_, i) => 'cold_' + i)
                    : state.overlay.items || []).slice(0, 3);
                data.forEach(d => {
                    ovItems.forEach(item => {
                        if (state.overlay.hidden && state.overlay.hidden[item]) return;
                        const v = d.overlayScores ? d.overlayScores[item] : null;
                        if (v == null) return;
                        const first = data[0].overlayScores ? data[0].overlayScores[item] : 0;
                        const off = v - first;
                        if (off > maxScore) maxScore = off;
                        if (off < minScore) minScore = off;
                    });
                });
            }
            const range = maxScore - minScore;
            const chartHeight = height * 0.6;
            const centerY = height / 2;
            const zoomBoost = Math.max(1, Math.min(state.viewState.scale, 5));
            const scaleY = (chartHeight / Math.max(range, 20)) * zoomBoost;
            drawYAxisGrid(ctx, width, height, centerY, scaleY, maxScore, minScore);
            drawXAxisLabels(ctx, data, width, height, spacing, startX);

            ctx.strokeStyle = isLightTheme() ? '#ccd3dd' : '#1f2329';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, centerY);
            ctx.lineTo(width, centerY);
            ctx.stroke();

            if (state.maWindow > 0) {
                ctx.strokeStyle = 'rgba(255, 214, 0, 0.6)';
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                data.forEach((d, i) => {
                    const slice = data.slice(Math.max(0, i - state.maWindow + 1), i + 1);
                    const avg = slice.reduce((a, b) => a + b.displayScore, 0) / slice.length;
                    const x = startX + i * spacing;
                    const y = centerY - (avg - baseScore) * scaleY;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
                ctx.setLineDash([]);
            }

            const gradient = ctx.createLinearGradient(0, centerY - 50, 0, centerY + 50);
            gradient.addColorStop(0, 'rgba(0, 230, 118, 0.8)');
            gradient.addColorStop(0.5, 'rgba(0, 212, 255, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 23, 68, 0.8)');

            ctx.lineWidth = 2;
            ctx.strokeStyle = gradient;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            data.forEach((d, i) => {
                const x = startX + i * spacing;
                const y = centerY - (d.displayScore - baseScore) * scaleY;
                d.px = x;
                d.py = y;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            const dotSize = Math.max(2, Math.min(4, spacing / 3));
            data.forEach((d, i) => {
                ctx.globalAlpha = i === data.length - 1 ? 1 : Math.max(0.15, Math.min(1, spacing / 5));
                ctx.beginPath();
                ctx.arc(d.px, d.py, dotSize, 0, Math.PI * 2);
                ctx.fillStyle = ['zodiac_hotcold', 'number_hotcold'].includes(state.currentMode)
                    ? (d.isCurrentHot ? '#00e676' : '#ff1744')
                    : state.currentMode === 'special_zodiac_follow'
                        ? (d.followHit === null ? '#78909c' : d.followHit ? '#00e676' : '#ff1744')
                        : (d.displayScore >= 0 ? '#00e676' : '#ff1744');
                ctx.fill();
            });
            if (['pingxiao_follow', 'special_zodiac_follow', 'pingtail_follow', 'pingnum_absent'].includes(state.currentMode)) {
                data.forEach(d => {
                    if (typeof d.followHit !== 'boolean' || d.px == null) return;
                    const markY = d.followHit ? d.py - dotSize - 5 : d.py + dotSize + 5;
                    ctx.globalAlpha = 0.9;
                    ctx.fillStyle = d.followHit ? '#00e676' : '#ff1744';
                    ctx.beginPath();
                    ctx.arc(d.px, markY, 2.4, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
            if (state.showSignals !== false) {
                data.forEach(d => {
                    if (!d.chartSignal || d.px == null || d.py == null) return;
                    const sig = d.chartSignal;
                    const isAbove = sig.type === 'reversal' || sig.type === 'golden_cross';
                    const badgeY = isAbove ? d.py - dotSize - 11 : d.py + dotSize + 11;

                    ctx.save();
                    ctx.globalAlpha = 0.95;
                    // Draw mini glow aura
                    ctx.beginPath();
                    ctx.arc(d.px, d.py, dotSize + 3, 0, Math.PI * 2);
                    ctx.strokeStyle = sig.type === 'reversal' ? 'rgba(0, 230, 118, 0.85)' : (sig.type === 'peak' ? 'rgba(255, 152, 0, 0.85)' : (sig.type === 'golden_cross' ? 'rgba(0, 212, 255, 0.85)' : 'rgba(255, 23, 68, 0.85)'));
                    ctx.lineWidth = 1.5;
                    ctx.stroke();

                    // Draw icon
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(sig.icon, d.px, badgeY);
                    ctx.restore();
                });
            }
            if (overlayOk) {
                const ovItems = (state.overlay.type === 'cold'
                    ? (state.overlay.coldSets || []).map((_, i) => 'cold_' + i)
                    : state.overlay.items || []).slice(0, 3);
                const palette = ['#ff9800', '#e040fb', '#00c4ff'];
                ovItems.forEach((item, idx) => {
                    if (state.overlay.hidden && state.overlay.hidden[item]) return;
                    const firstVal = data.length && data[0].overlayScores ? data[0].overlayScores[item] : 0;
                    ctx.strokeStyle = palette[idx % 3];
                    ctx.lineWidth = 1.8;
                    ctx.setLineDash([]);
                    ctx.beginPath();
                    let started = false;
                    data.forEach((d, i) => {
                        const v = d.overlayScores ? d.overlayScores[item] : null;
                        if (v == null) { started = false; return; }
                        const x = startX + i * spacing;
                        const y = centerY - (v - firstVal) * scaleY;
                        if (!started) { ctx.moveTo(x, y); started = true; }
                        else ctx.lineTo(x, y);
                    });
                    ctx.stroke();
                });
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'left';
                ovItems.forEach((item, idx) => {
                    if (state.overlay.hidden && state.overlay.hidden[item]) return;
                    const label = state.overlay.type === 'zodiac' ? item
                        : state.overlay.type === 'tail' ? parseInt(item, 10) + '尾'
                        : state.overlay.type === 'cold' ? '条件' + (parseInt(item.replace('cold_', ''), 10) + 1)
                        : parseInt(item, 10);
                    ctx.fillStyle = palette[idx % 3];
                    ctx.fillText(String(label), 8, 16 + idx * 14);
                });
            }

            // 表格双向联动高亮展示：如果在表格中点击选中了生肖或尾数，在对应开出的期次上打上金色光环
            if (state.tableHighlightItem && data.length) {
                const hlName = state.tableHighlightItem;
                const isTailSearch = hlName.endsWith('尾');
                const targetVal = isTailSearch ? parseInt(hlName.replace('尾', ''), 10) : hlName;

                ctx.save();
                data.forEach(d => {
                    if (d.px == null || d.py == null) return;
                    let isHit = false;
                    if (isTailSearch) {
                        isHit = (d.tailWin === targetVal || (d.tailWin != null && d.tailWin + '尾' === hlName));
                    } else {
                        isHit = (d.win === targetVal || (d.pingXiao && d.pingXiao.includes(targetVal)));
                    }

                    if (isHit) {
                        ctx.beginPath();
                        ctx.arc(d.px, d.py, dotSize + 4.5, 0, Math.PI * 2);
                        ctx.strokeStyle = '#ffd700';
                        ctx.lineWidth = 2.2;
                        ctx.stroke();

                        ctx.beginPath();
                        ctx.arc(d.px, d.py, dotSize + 1.5, 0, Math.PI * 2);
                        ctx.fillStyle = 'rgba(255, 215, 0, 0.35)';
                        ctx.fill();
                    }
                });
                ctx.restore();
            }

            ctx.globalAlpha = 1;
        }
        function drawColorModeFixed(ctx, data, width, height, spacing, startX) {
            const allScores =[];
            data.forEach(d => {
                if (d.colorScores) {
                    allScores.push(d.colorScores.red, d.colorScores.blue, d.colorScores.green);
                }
            });
            const maxScore = Math.max(...allScores, 10);
            const minScore = Math.min(...allScores, -10);
            const range = maxScore - minScore;
            const chartHeight = height * 0.6;
            const centerY = height / 2;
                        const zoomBoost = Math.max(1, Math.min(state.viewState.scale, 5));
            const scaleY = (chartHeight / Math.max(range, 30)) * zoomBoost;
            drawYAxisGrid(ctx, width, height, centerY, scaleY, maxScore, minScore);
            drawXAxisLabels(ctx, data, width, height, spacing, startX);

            const colors = { red: '#ff1744', blue: '#448aff', green: '#00e676' };

            ['red', 'blue', 'green'].forEach(color => {
                ctx.strokeStyle = colors[color];
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';
                ctx.beginPath();
                data.forEach((d, i) => {
                    if (!d.colorScores) return;
                    const x = startX + i * spacing;
                    const y = centerY - (d.colorScores[color] - (maxScore + minScore) / 2) * scaleY;
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });
                ctx.stroke();
            });

            const legendItems = [
                { key: 'red', label: '红波', color: '#ff1744', y: 20 },
                { key: 'blue', label: '蓝波', color: '#448aff', y: 35 },
                { key: 'green', label: '绿波', color: '#00e676', y: 50 }
            ];
            const last = data[data.length - 1];
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            legendItems.forEach(item => {
                ctx.strokeStyle = item.color;
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(width - 54, item.y - 2);
                ctx.lineTo(width - 40, item.y - 2);
                ctx.stroke();
                let info = item.label;
                if (last && last.colorScores) {
                    const sc = last.colorScores[item.key];
                    const om = last.colorOmissions ? last.colorOmissions[item.key] : null;
                    const st = last.colorStreaks ? last.colorStreaks[item.key] : null;
                    info += ' ' + (sc != null ? sc.toFixed(1) : '-') + (om != null ? '·遗' + om : '') + (st ? '·涨' + st.maxUp + '跌' + st.maxDown : '');
                }
                ctx.fillStyle = item.color;
                ctx.fillText(info, width - 58, item.y + 3);
            });
            if (last && last.codes) {
                const cnt = { red: 0, blue: 0, green: 0 };
                last.codes.forEach(c => { if (cnt[c.wave] != null) cnt[c.wave]++; });
                ctx.font = '10px sans-serif';
                ctx.fillStyle = themeText(0.6);
                ctx.fillText(`本期红${cnt.red} 蓝${cnt.blue} 绿${cnt.green}`, width - 58, 68);
            }

            if (state.tableHighlightItem && data.length) {
                const hlName = state.tableHighlightItem;
                const isTailSearch = hlName.endsWith('尾');
                const targetVal = isTailSearch ? parseInt(hlName.replace('尾', ''), 10) : hlName;

                ctx.save();
                data.forEach((d, i) => {
                    let isHit = false;
                    if (isTailSearch) {
                        isHit = (d.tailWin === targetVal || (d.tailWin != null && d.tailWin + '尾' === hlName));
                    } else {
                        isHit = (d.win === targetVal || (d.pingXiao && d.pingXiao.includes(targetVal)));
                    }

                    if (isHit) {
                        const x = startX + i * spacing;
                        ctx.beginPath();
                        ctx.setLineDash([2, 2]);
                        ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
                        ctx.lineWidth = 1;
                        ctx.moveTo(x, 20);
                        ctx.lineTo(x, height - 30);
                        ctx.stroke();
                        ctx.setLineDash([]);
                    }
                });
                ctx.restore();
            }

            ctx.textAlign = 'center';
        }

        function drawHoverEffect(ctx, data, width, height) {
            if (state.hoverIndex < 0 || state.hoverIndex >= data.length) return;
            const d = data[state.hoverIndex];

            const { spacing, startX } = getChartSettings(data.length, width);
            const x = startX + state.hoverIndex * spacing;

            let y;
            if (state.currentMode === 'color' && d.colorScores) {
                const allScores =[];
                data.forEach(item => {
                    if (item.colorScores) {
                        allScores.push(item.colorScores.red, item.colorScores.blue, item.colorScores.green);
                    }
                });
                const maxScore = Math.max(...allScores, 10);
                const minScore = Math.min(...allScores, -10);
                const range = maxScore - minScore;
                const chartHeight = height * 0.6;
                const zoomBoost = Math.max(1, Math.min(state.viewState.scale, 5));
            const scaleY = (chartHeight / Math.max(range, 30)) * zoomBoost;
                y = height / 2 - (d.colorScores.red - (maxScore + minScore) / 2) * scaleY;
            } else {
                const baseScore = data.length > 0 ? data[0].displayScore : 0;
                const scores = data.map(item => item.displayScore - baseScore);
                const maxScore = Math.max(...scores, 5);
                const minScore = Math.min(...scores, -5);
                const range = maxScore - minScore;
                const chartHeight = height * 0.6;
                const zoomBoost = Math.max(1, Math.min(state.viewState.scale, 5));
            const scaleY = (chartHeight / Math.max(range, 20)) * zoomBoost;
                y = height / 2 - (d.displayScore - baseScore) * scaleY;
            }

            ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(x, -state.viewState.y);
            ctx.lineTo(x, height - state.viewState.y);
            ctx.moveTo(-state.viewState.x, y);
            ctx.lineTo(width - state.viewState.x, y);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';

            const xLabel = d.expect;
            ctx.font = 'bold 10px sans-serif';
            const xLabelWidth = ctx.measureText(xLabel).width;
            const labelY = height - 20 - state.viewState.y;
            ctx.fillRect(x - (xLabelWidth + 10) / 2, labelY, xLabelWidth + 10, 20);
            ctx.fillStyle = '#111';
            ctx.fillText(xLabel, x - xLabelWidth / 2, labelY + 13);

            ctx.fillStyle = 'rgba(0, 212, 255, 0.8)';
            const yLabel = state.currentMode === 'color' ? d.colorScores.red.toFixed(1) : d.displayScore.toString();
            const yLabelWidth = ctx.measureText(yLabel).width;
            const labelX = -state.viewState.x;
            ctx.fillRect(labelX, y - 10, yLabelWidth + 10, 20);
            ctx.fillStyle = '#111';
            ctx.fillText(yLabel, labelX + 5, y + 4);

            const pulse = (Math.sin(Date.now() / 200) + 1) / 2;
            ctx.beginPath();
            ctx.arc(x, y, 8 + pulse * 4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 212, 255, ' + (0.2 * (1 - pulse)) + ')';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = isLightTheme() ? '#1c2530' : '#fff';
            ctx.fill();
            ctx.strokeStyle = '#00d4ff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // ==================== UI更新 ====================
        function updateInfoPanel(d, isLatest = false) {
            if (!d) return;
            state.lastRenderedData = d;
            if (isLatest) {
                state.latestDataRecord = d;
            }
            const topExpectEl = document.getElementById('topExpect');
            if (topExpectEl) topExpectEl.textContent = d.expect;

            let topHtml = '';
            const topZodiacs = d.pingXiao ? d.pingXiao.split(' ') : [];
            topZodiacs.push(d.win || '');

            d.codes.forEach((c, i) => {
                const isSpecial = i === 6;
                topHtml += `<span class="top-ball-cell">` +
                    `<span class="ball ${c.wave}${isSpecial ? ' top-special-ball' : ''}">${c.num}</span>` +
                    `<span class="top-zodiac${isSpecial ? ' top-special' : ''}">${topZodiacs[i] || ''}</span>` +
                    `</span>${i === 5 ? ' <span class="top-plus">+</span> ' : ''}`;
            });

            const topCenterEl = document.getElementById('topBarCenter');
            if (topCenterEl) topCenterEl.innerHTML = topHtml;
            renderTable(d);
        }

        function handleTableRowClick(name) {
            if (!name) return;
            if (state.tableHighlightItem === name) {
                clearTableHighlight();
            } else {
                state.tableHighlightItem = name;
                updateTableHighlightBadge(name);
                requestDraw();
                if (state.lastRenderedData) {
                    renderTable(state.lastRenderedData);
                }
            }
        }

        function clearTableHighlight() {
            state.tableHighlightItem = null;
            updateTableHighlightBadge(null);
            requestDraw();
            if (state.lastRenderedData) {
                renderTable(state.lastRenderedData);
            }
        }

        function updateTableHighlightBadge(name) {
            const badge = document.getElementById('tableHighlightBadge');
            const nameEl = document.getElementById('tableHighlightName');
            if (!badge) return;
            if (name) {
                if (nameEl) nameEl.textContent = name;
                badge.style.display = 'inline-flex';
            } else {
                badge.style.display = 'none';
            }
        }

        function renderTable(currentData) {
            const snapshot = currentData.snapshot;
            const counts = currentData.counts;
            const total = currentData.total;

            let sorted;
            if (state.currentMode === 'pingtail_follow') {
                const tSnap = currentData.tailSnapshot || {};
                const tCounts = currentData.tailCounts || {};
                const tMax = state.tailGlobalMaxOm || {};
                sorted = Array.from({ length: 10 }, (_, i) => ({
                    name: i + '尾',
                    om: tSnap[i] || 0,
                    max: tMax[i] || 0,
                    count: tCounts[i] || 0,
                    avg: (total / (tCounts[i] || 1)).toFixed(1),
                    ratio: (tMax[i] || 0) > 0 ? (tSnap[i] || 0) / tMax[i] : 0
                })).sort((a, b) => a.om - b.om);
            } else {
                const zodiacs = CONFIG.zodiacMap[state.currentYear];
                sorted = zodiacs.map(z => ({
                    name: z,
                    om: snapshot[z],
                    max: state.globalMaxOm[z],
                    count: counts[z],
                    avg: (total / (counts[z] || 1)).toFixed(1),
                    ratio: state.globalMaxOm[z] > 0 ? snapshot[z] / state.globalMaxOm[z] : 0
                })).sort((a, b) => a.om - b.om);
            }

            const sortKey = state.tableSort && state.tableSort.key;
            if (sortKey && sortKey !== 'rank') {
                const dir = state.tableSort.dir;
                sorted = sorted.slice().sort((a, b) => {
                    if (sortKey === 'name') return String(a.name).localeCompare(String(b.name)) * dir;
                    return (Number(a[sortKey]) - Number(b[sortKey])) * dir;
                });
            } else if (sortKey === 'rank') {
                sorted = sorted.slice().sort((a, b) => a.om - b.om);
            }

            const tbody = document.getElementById('tableBody');
            const winTarget = state.currentMode === 'pingtail_follow'
                ? (currentData.tailWin != null ? currentData.tailWin + '尾' : null)
                : currentData.win;

            tbody.innerHTML = sorted.map((item, i) => {
                const isHot = item.om <= 3;
                const isCold = item.ratio >= 0.8;
                const isWinMatch = winTarget && (item.name === winTarget || item.name === String(winTarget));
                const isUserSelected = state.tableHighlightItem && (item.name === state.tableHighlightItem || item.name === String(state.tableHighlightItem));
                const trend = isHot ? '↗ 热' : isCold ? '↘ 冷' : '→ 稳';
                const trendColor = isHot ? 'var(--up)' : isCold ? 'var(--down)' : 'var(--text-secondary)';

                return `
            <tr class="${isHot ? 'hot' : isCold ? 'cold' : ''} ${isWinMatch ? 'table-row-crosshair-active' : ''} ${isUserSelected ? 'table-row-user-selected' : ''}" data-name="${item.name}" onclick="handleTableRowClick('${item.name}')" title="点击高亮在K线图上标注该生肖/尾数" style="cursor:pointer;">
                <td><b style="color:var(--accent);">${i + 1}</b></td>
                <td><b style="font-size:14px;">${item.name}</b></td>
                <td style="color:${item.om === 0 ? 'var(--up)' : item.om > 15 ? 'var(--down)' : 'inherit'};font-weight:600;font-size:14px;">
                    ${item.om}
                </td>
                <td style="color:var(--text-secondary);">${item.max}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="min-width:36px;font-size:11px;">${(item.ratio * 100).toFixed(0)}%</span>
                        <div class="stat-bar" style="flex:1;">
                            <div class="stat-bar-fill" style="width:${Math.min(item.ratio * 100, 100)}%;background:${item.ratio > 0.8 ? 'var(--down)' : item.ratio < 0.3 ? 'var(--up)' : 'var(--accent)'}"></div>
                        </div>
                    </div>
                </td>
                <td>${item.count}</td>
                <td style="color:var(--text-secondary);">${item.avg}</td>
                <td style="font-size:11px;">${getColorOmissionDisplay(currentData)}</td>
                <td style="font-size:11px;">${getSizeOmissionDisplay(currentData)}</td>
                <td style="color:${trendColor};font-weight:600;">${trend}</td>
            </tr>
            `;
            }).join('');
        }

        function getColorOmissionDisplay(data) {
            if (!data.colorOmissions) return '-';
            const co = data.colorOmissions;
            const current = data.currentColor;
            return `
            <span style="color:${current === 'red' ? '#ff1744' : '#666'};font-weight:${current === 'red' ? '700' : '400'};">红${co.red}</span>
            <span style="color:${current === 'blue' ? '#448aff' : '#666'};font-weight:${current === 'blue' ? '700' : '400'};margin:0 3px;">蓝${co.blue}</span>
            <span style="color:${current === 'green' ? '#00e676' : '#666'};font-weight:${current === 'green' ? '700' : '400'};">绿${co.green}</span>
        `;
        }

        function getSizeOmissionDisplay(data) {
            if (!data.sizeOmissions) return '-';
            const so = data.sizeOmissions;
            const current = data.currentSize;
            return `
            <span style="color:${current === 'big' ? 'var(--up)' : '#666'};font-weight:${current === 'big' ? '700' : '400'};">大${so.big}</span>
            <span style="color:${current === 'small' ? 'var(--accent)' : '#666'};font-weight:${current === 'small' ? '700' : '400'};margin-left:4px;">小${so.small}</span>
        `;
        }

        function updateStats() {
            const last = state.historyData[state.historyData.length - 1];
            const totalEl = document.getElementById('statTotal');
            if (totalEl) totalEl.textContent = state.historyData.length;
            const scoreEl = document.getElementById('statScore');
            if (scoreEl) {
                scoreEl.textContent = last ? (last.score > 0 ? '+' : '') + last.score : 0;
                scoreEl.style.color = last && last.score >= 0 ? 'var(--up)' : 'var(--down)';
            }

            const hotEl = document.getElementById('statHot');
            const coldEl = document.getElementById('statCold');
            if (hotEl && coldEl) {
                const source = (typeof getSelectedColdSourceData === 'function') ? getSelectedColdSourceData() : state.historyData;
                if (source && source.length > 0) {
                    const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
                    const counts = (typeof calculateFrequencyCounts === 'function') 
                        ? calculateFrequencyCounts(keys, item => getAllDrawNumbers(item), source)
                        : {};
                    const freqs = Object.values(counts);
                    if (freqs.length > 0) {
                        const avg = freqs.reduce((a, b) => a + b, 0) / freqs.length;
                        const hotCount = freqs.filter(f => f > avg).length;
                        const coldCount = freqs.filter(f => f < avg).length;
                        hotEl.textContent = hotCount;
                        coldEl.textContent = coldCount;
                    } else {
                        hotEl.textContent = '0';
                        coldEl.textContent = '0';
                    }
                } else {
                    hotEl.textContent = '0';
                    coldEl.textContent = '0';
                }
            }

            generateRecommendations();
        }

        const recConfig = {
            track: 'special', // 'special' or 'normal'
            weightCold: 50,   // 0=cold, 100=hot
            weightMorph: 60,  // 0-100
            spanCount: 20,    // 8-30 (最少20码推荐)
            shrink: false
        };

        function saveRecConfig() {
            try {
                localStorage.setItem('aomen_rec_config', JSON.stringify(recConfig));
            } catch (e) {}
        }

        function loadRecConfig() {
            try {
                const saved = localStorage.getItem('aomen_rec_config');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    if (parsed && typeof parsed === 'object') {
                        if (typeof parsed.weightCold === 'number') recConfig.weightCold = parsed.weightCold;
                        if (typeof parsed.weightMorph === 'number') recConfig.weightMorph = parsed.weightMorph;
                        if (typeof parsed.spanCount === 'number') {
                            recConfig.spanCount = Math.max(20, parsed.spanCount);
                        }
                        if (typeof parsed.shrink === 'boolean') recConfig.shrink = parsed.shrink;
                        if (parsed.track) recConfig.track = parsed.track;
                    }
                }
            } catch (e) {}

            if (recConfig.spanCount < 20) recConfig.spanCount = 20;
            if (document.getElementById('recWeightCold')) document.getElementById('recWeightCold').value = recConfig.weightCold;
            if (document.getElementById('recWeightMorph')) document.getElementById('recWeightMorph').value = recConfig.weightMorph;
            if (document.getElementById('recSpanCount')) document.getElementById('recSpanCount').value = recConfig.spanCount;
            if (document.getElementById('recSpanCountVal')) document.getElementById('recSpanCountVal').textContent = `${recConfig.spanCount}码`;
            if (document.getElementById('recShrinkToggle')) document.getElementById('recShrinkToggle').checked = recConfig.shrink;
            if (document.getElementById('recTrackSpecial') && document.getElementById('recTrackNormal')) {
                document.getElementById('recTrackSpecial').classList.toggle('active', recConfig.track === 'special');
                document.getElementById('recTrackNormal').classList.toggle('active', recConfig.track === 'normal');
            }
        }

        function applyRecPreset(type) {
            document.querySelectorAll('.rec-preset-btn').forEach(btn => btn.classList.remove('active'));
            if (window.event && window.event.currentTarget) {
                window.event.currentTarget.classList.add('active');
            }

            if (type === 'cold') {
                recConfig.weightCold = 20; // ❄️ 极冷超跌 (80%冷偏)
                recConfig.weightMorph = 35;
                recConfig.spanCount = 20;
                recConfig.shrink = true;
                showToast('已应用预设：❄️ 极冷超跌反弹 (20码精选)');
            } else if (type === 'hot') {
                recConfig.weightCold = 80; // 🔥 顺势高频 (80%热偏)
                recConfig.weightMorph = 65;
                recConfig.spanCount = 20;
                recConfig.shrink = true;
                showToast('已应用预设：🔥 顺势高频连开 (20码精选)');
            } else if (type === 'morph') {
                recConfig.weightCold = 50; // 🎯 形态共振 (均衡)
                recConfig.weightMorph = 90;
                recConfig.spanCount = 20;
                recConfig.shrink = true;
                showToast('已应用预设：🎯 形态共振精选 (20码精选)');
            } else if (type === 'solid') {
                recConfig.weightCold = 50; // 🛡️ 稳健大底 (无缩水)
                recConfig.weightMorph = 50;
                recConfig.spanCount = 24;
                recConfig.shrink = false;
                showToast('已应用预设：🛡️ 稳健防守大底 (24码大底)');
            } else if (type === 'sum_span') {
                recConfig.weightCold = 50; // ⚖️ 和值跨度均值回归
                recConfig.weightMorph = 75;
                recConfig.spanCount = 20;
                recConfig.shrink = true;
                const stratSelect = document.getElementById('recommendStrategy');
                if (stratSelect) stratSelect.value = 'sum_span';
                showToast('已应用预设：📐 和值跨度·均值回归精选 (20码精选)');
            }

            if (document.getElementById('recWeightCold')) document.getElementById('recWeightCold').value = recConfig.weightCold;
            if (document.getElementById('recWeightMorph')) document.getElementById('recWeightMorph').value = recConfig.weightMorph;
            if (document.getElementById('recSpanCount')) document.getElementById('recSpanCount').value = recConfig.spanCount;
            if (document.getElementById('recShrinkToggle')) document.getElementById('recShrinkToggle').checked = recConfig.shrink;

            onRecWeightChange();
        }

        function exportRecommendationPlan() {
            if (!state.currentRecommendations || !state.historyData || !state.historyData.length) {
                showToast('⚠️ 暂无推荐结果，请先生成推荐');
                return;
            }

            const last = state.historyData[state.historyData.length - 1];
            const period = last ? (last.period || last.id || '') : '';
            const { strategy, recommendations, track } = state.currentRecommendations;

            let lines = [];
            lines.push(`【六合趋势 Pro · 智能量化推荐单】`);
            lines.push(`参考期数: 第 ${period} 期后 (预测下一期)`);
            lines.push(`策略模式: ${track === 'special' ? '🎯 特码智能推荐' : '🎰 平特肖尾推荐'}`);

            if (track === 'normal') {
                if (recommendations.topFlatZodiacs) {
                    lines.push(`★ 推荐平肖: ${recommendations.topFlatZodiacs.map(z => z.zodiac + '(' + z.rate + '%)').join(' ')}`);
                }
                if (recommendations.topFlatTails) {
                    lines.push(`★ 推荐尾数: ${recommendations.topFlatTails.map(t => t.tail + '尾').join(' ')}`);
                }
                if (recommendations.topFlatNums) {
                    lines.push(`★ 正码精选 (${recommendations.topFlatNums.length}码):`);
                    lines.push(recommendations.topFlatNums.map(n => `${n.number}(${n.zodiac})`).join(' '));
                }
            } else if (strategy === 'multifactor' && recommendations.topNumbers) {
                const nums = recommendations.topNumbers;
                const colorName = { red: '红', blue: '蓝', green: '绿' };
                lines.push(`★ 核心算法: 多因子量化共振模型`);
                lines.push(`★ 精选特码 (${nums.length}码):`);
                const numStrs = nums.map(n => `${n.number}(${n.zodiac}·${colorName[n.color] || ''})`);
                for (let i = 0; i < numStrs.length; i += 4) {
                    lines.push('   ' + numStrs.slice(i, i + 4).join('  '));
                }
                if (recommendations.topZodiacs) {
                    lines.push(`★ 共振生肖: ${recommendations.topZodiacs.map(z => z.zodiac).join('、')}`);
                }
                if (recConfig.shrink) {
                    lines.push(`★ 缩水状态: 已启用智能同尾/同肖/冷态瘦身`);
                }
            } else if (strategy === 'dan_base_kill' && recommendations.goldDan) {
                lines.push(`★ 核心算法: 胆码·大底·智能杀码`);
                lines.push(`★ 黄金金胆: ${recommendations.goldDan.map(n => n.number + '(' + n.zodiac + ')').join(' ')}`);
                lines.push(`★ 辅助银胆: ${recommendations.silverDan.map(n => n.number + '(' + n.zodiac + ')').join(' ')}`);
                lines.push(`★ 精选大底 (${recommendations.baseNumbers.length}码): ${recommendations.baseNumbers.map(n => n.number).join(' ')}`);
                lines.push(`★ 避险杀码: ${recommendations.killedNumbers.map(n => n.number).join(' ')}`);
            } else if (Array.isArray(recommendations)) {
                lines.push(`★ 推荐号码 (${recommendations.length}码):`);
                lines.push(recommendations.map(r => typeof r === 'object' ? r.number : r).join(' '));
            }

            const hit5 = getLookbackRecords(5, strategy, track);
            if (hit5 && hit5.count) {
                lines.push(`★ 5期历史回看: 命中率 ${hit5.winRate}% (${hit5.hitTotal}/${hit5.count})`);
                const miniSummary = hit5.records.slice(0, 5).map(r => `${String(r.issue).slice(-3)}期(开${r.special}${r.isHit ? '🎯中' : '❌'})`).join(' ');
                lines.push(`   逐期战绩: ${miniSummary}`);
            }

            const now = new Date();
            const timeStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            lines.push(`生成时间: ${timeStr}`);
            lines.push(`(注: 量化模型基于统计与走势规律，仅供分析参考)`);

            const textToCopy = lines.join('\n');

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(textToCopy).then(() => {
                    showToast('📋 推荐方案已成功复制到剪贴板！');
                }).catch(() => {
                    fallbackCopy(textToCopy);
                });
            } else {
                fallbackCopy(textToCopy);
            }
        }

        function fallbackCopy(text) {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.select();
            try {
                document.execCommand('copy');
                showToast('📋 推荐方案已成功复制到剪贴板！');
            } catch (e) {
                showToast('⚠️ 复制失败，请手动截屏保存');
            }
            document.body.removeChild(ta);
        }

        function switchRecTrack(track) {
            recConfig.track = track;
            saveRecConfig();
            document.getElementById('recTrackSpecial')?.classList.toggle('active', track === 'special');
            document.getElementById('recTrackNormal')?.classList.toggle('active', track === 'normal');
            generateRecommendations();
        }

        function toggleRecDrawer() {
            const card = document.getElementById('recommendCard') || document.getElementById('recDrawer')?.closest('.sidebar-card');
            if (card && card.classList.contains('collapsed')) {
                card.classList.remove('collapsed');
            }
            const el = document.getElementById('recDrawer');
            if (el) el.classList.toggle('open');
        }

        function onRecWeightChange() {
            recConfig.weightCold = parseInt(document.getElementById('recWeightCold')?.value || '50', 10);
            recConfig.weightMorph = parseInt(document.getElementById('recWeightMorph')?.value || '60', 10);
            recConfig.spanCount = parseInt(document.getElementById('recSpanCount')?.value || '20', 10);
            recConfig.shrink = !!document.getElementById('recShrinkToggle')?.checked;
            saveRecConfig();

            const coldValEl = document.getElementById('recWeightColdVal');
            if (coldValEl) {
                if (recConfig.weightCold <= 35) {
                    coldValEl.textContent = `❄️ 冷偏 ${100 - recConfig.weightCold}%`;
                    coldValEl.style.color = 'var(--down)';
                } else if (recConfig.weightCold >= 65) {
                    coldValEl.textContent = `🔥 热偏 ${recConfig.weightCold}%`;
                    coldValEl.style.color = 'var(--up)';
                } else {
                    coldValEl.textContent = `⚖️ 均衡 50%`;
                    coldValEl.style.color = 'var(--accent)';
                }
            }

            const morphValEl = document.getElementById('recWeightMorphVal');
            if (morphValEl) morphValEl.textContent = `${recConfig.weightMorph}%`;
            const spanValEl = document.getElementById('recSpanCountVal');
            if (spanValEl) spanValEl.textContent = `${recConfig.spanCount}码`;
            const shrinkStatusEl = document.getElementById('recShrinkStatus');
            if (shrinkStatusEl) {
                shrinkStatusEl.innerHTML = recConfig.shrink ? '<b style="color:var(--up);">已启用</b>' : '未启用';
            }

            generateRecommendations();
        }

        function resetRecWeights() {
            if (document.getElementById('recWeightCold')) document.getElementById('recWeightCold').value = 50;
            if (document.getElementById('recWeightMorph')) document.getElementById('recWeightMorph').value = 60;
            if (document.getElementById('recSpanCount')) document.getElementById('recSpanCount').value = 20;
            if (document.getElementById('recShrinkToggle')) document.getElementById('recShrinkToggle').checked = false;
            onRecWeightChange();
        }

        function generateRecommendations() {
            const container = document.getElementById('recommendationResult');
            const strategy = document.getElementById('recommendStrategy')?.value || 'multifactor';
            const last = state.historyData[state.historyData.length - 1];

            if (!last || !state.historyData.length) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 11px; padding: 10px;">暂无数据</div>';
                return;
            }

            // 同步微调控制项最新状态
            if (document.getElementById('recWeightCold')) {
                recConfig.weightCold = parseInt(document.getElementById('recWeightCold').value || '50', 10);
            }
            if (document.getElementById('recWeightMorph')) {
                recConfig.weightMorph = parseInt(document.getElementById('recWeightMorph').value || '60', 10);
            }
            if (document.getElementById('recSpanCount')) {
                recConfig.spanCount = parseInt(document.getElementById('recSpanCount').value || '20', 10);
            }
            if (document.getElementById('recShrinkToggle')) {
                recConfig.shrink = !!document.getElementById('recShrinkToggle').checked;
            }

            // 5. 走势异动与形态预警提示
            renderTrendAnomalies();

            const snapshot = last.snapshot || {};
            const colorOm = last.colorOmissions || { red: 0, blue: 0, green: 0 };
            const sizeOm = last.sizeOmissions || { big: 0, small: 0 };
            const maxOm = last.colorMaxOmissions || { red: 0, blue: 0, green: 0 };

            let recommendations = [];

            // 3. 平特肖尾双轨模式分支
            if (recConfig.track === 'normal') {
                recommendations = getNormalTrackRecommendations(last, state.historyData);
                renderRecommendations(container, recommendations, 'normal_track');
                renderRecHistory5Inline('normal_track', 'normal');
                const hit5 = getLookbackRecords(5, 'normal_track', 'normal');
                const hitEl = document.getElementById('recommendHitRate');
                if (hitEl) {
                    hitEl.innerHTML = hit5.count
                        ? `📜 平特近5期命中: <b style="color:${hit5.winRate >= 50 ? 'var(--up)' : 'var(--warn)'};">${hit5.hitTotal}/${hit5.count}</b>（${hit5.winRate}%） <span style="opacity:0.4;margin:0 4px;">|</span> 正码1~6落球共振`
                        : `平特双轨模式：已根据正码1~6落球共振生成平特肖与精选尾数`;
                }
                const modal = document.getElementById('recHistoryModal');
                if (modal && modal.style.display !== 'none') {
                    renderRecHistoryModal();
                }
                return;
            }

            switch (strategy) {
                case 'multifactor':
                    recommendations = getMultiFactorRecommendations(last, state.historyData);
                    break;
                case 'sum_span':
                    recommendations = getSumSpanRecommendations(last, state.historyData);
                    break;
                case 'dan_base_kill':
                    recommendations = getDanBaseKillRecommendations(last, state.historyData);
                    break;
                case 'auto_opt':
                    recommendations = getAutoOptimizedStrategy(last, state.historyData);
                    break;
                case 'omission':
                    recommendations = getOmissionBasedRecommendations(snapshot, maxOm, state.globalMaxOm, last.currentColor);
                    break;
                case 'balance':
                    recommendations = getBalanceRecommendations(snapshot, colorOm, sizeOm, last.counts, state.historyData.length);
                    break;
                case 'hot':
                    recommendations = getHotRecommendations(snapshot, last.counts, state.historyData.length);
                    break;
                case 'color':
                    recommendations = getColorRecommendations(colorOm, maxOm);
                    break;
                case 'size':
                    recommendations = getSizeRecommendations(sizeOm);
                    break;
                default:
                    recommendations = getMultiFactorRecommendations(last, state.historyData);
                    break;
            }

            renderRecommendations(container, recommendations, strategy);

            // 渲染近5期历史回看验证面板（当前策略实时联动）
            renderRecHistory5Inline(strategy, 'special');

            const hitStats = computeRecommendationStats(strategy, 10);
            const hit5 = getLookbackRecords(5, strategy, 'special');
            const hitEl = document.getElementById('recommendHitRate');
            if (hitEl) {
                const hit5Html = hit5.count
                    ? `📜 近5期命中: <b style="color:${hit5.winRate >= 50 ? 'var(--up)' : 'var(--warn)'};">${hit5.hitTotal}/${hit5.count}</b>（${hit5.winRate}%）`
                    : '';
                const hit10Html = hitStats.total
                    ? `最近10期命中：<b style="color:${hitStats.rate >= 50 ? 'var(--up)' : 'var(--down)'};">${hitStats.hit}/${hitStats.total}</b>（${hitStats.rate.toFixed(0)}%）`
                    : '数据就绪';
                hitEl.innerHTML = hit5Html ? `${hit5Html} <span style="opacity:0.4;margin:0 4px;">|</span> ${hit10Html}` : hit10Html;
            }

            const modal = document.getElementById('recHistoryModal');
            if (modal && modal.style.display !== 'none') {
                renderRecHistoryModal();
            }
        }

        // ==================== 5. 跨期形态学特征与异动预警 ====================
        function getMorphologyTags(numStr, historyData) {
            if (historyData.length < 2) return [];
            const tags = [];
            const num = parseInt(numStr, 10);
            const last = historyData[historyData.length - 1];
            const prev = historyData[historyData.length - 2];

            const lastSpecial = parseInt(last.special, 10);
            const lastNums = (last.numbers || []).map(n => parseInt(n, 10));

            // 邻号判断 (邻近上一期特码或正码)
            if (Math.abs(num - lastSpecial) === 1 || (num === 1 && lastSpecial === 49) || (num === 49 && lastSpecial === 1)) {
                tags.push('特邻号');
            } else if (lastNums.some(n => Math.abs(num - n) === 1)) {
                tags.push('正邻号');
            }

            // 重号判断
            if (num === lastSpecial) {
                tags.push('特重号');
            } else if (lastNums.includes(num)) {
                tags.push('正重号');
            }

            // 隔期跳码
            if (prev) {
                const prevSpecial = parseInt(prev.special, 10);
                if (num === prevSpecial && num !== lastSpecial) {
                    tags.push('隔期跳');
                }
            }

            // 同尾共振 (计算近10期特码最热尾数)
            const tail = num % 10;
            const recentTails = {};
            historyData.slice(-10).forEach(d => {
                if (d.special) {
                    const t = parseInt(d.special, 10) % 10;
                    recentTails[t] = (recentTails[t] || 0) + 1;
                }
            });
            let maxTail = 0, maxTailCount = 0;
            Object.entries(recentTails).forEach(([t, c]) => {
                if (c > maxTailCount) { maxTailCount = c; maxTail = parseInt(t, 10); }
            });
            if (tail === maxTail && maxTailCount >= 2) {
                tags.push('同尾共振');
            }

            return tags;
        }

        function renderTrendAnomalies() {
            const alertWrap = document.getElementById('recommendAlertWrap');
            if (!alertWrap) return;
            const data = state.historyData;
            if (data.length < 5) {
                alertWrap.innerHTML = '';
                return;
            }

            const last = data[data.length - 1];
            const alerts = [];

            // 1) 波色偏态预警
            const colorOm = last.colorOmissions || {};
            if ((colorOm.red || 0) >= 5) alerts.push({ type: 'wave', text: `🔴 红波已连续遗漏 <b>${colorOm.red}</b> 期，接近极值回补窗口` });
            if ((colorOm.blue || 0) >= 5) alerts.push({ type: 'wave', text: `🔵 蓝波已连续遗漏 <b>${colorOm.blue}</b> 期，接近极值回补窗口` });
            if ((colorOm.green || 0) >= 5) alerts.push({ type: 'wave', text: `🟢 绿波已连续遗漏 <b>${colorOm.green}</b> 期，接近极值回补窗口` });

            // 2) 大小 / 单双连续偏态
            let consecutiveBig = 0, consecutiveSmall = 0, consecutiveOdd = 0, consecutiveEven = 0;
            for (let i = data.length - 1; i >= 0; i--) {
                const winNum = parseInt(data[i].special, 10);
                if (isNaN(winNum)) break;
                if (winNum >= 25 && consecutiveSmall === 0) consecutiveBig++;
                else if (winNum < 25 && consecutiveBig === 0) consecutiveSmall++;
                else break;
            }
            for (let i = data.length - 1; i >= 0; i--) {
                const winNum = parseInt(data[i].special, 10);
                if (isNaN(winNum)) break;
                if (winNum % 2 !== 0 && consecutiveEven === 0) consecutiveOdd++;
                else if (winNum % 2 === 0 && consecutiveOdd === 0) consecutiveEven++;
                else break;
            }

            if (consecutiveBig >= 4) alerts.push({ type: 'size', text: `⚖️ 特码连续 <b>${consecutiveBig}</b> 期开出大数，防小数拐点修复` });
            if (consecutiveSmall >= 4) alerts.push({ type: 'size', text: `⚖️ 特码连续 <b>${consecutiveSmall}</b> 期开出小数，防大数反弹回补` });
            if (consecutiveOdd >= 4) alerts.push({ type: 'oe', text: `⚡ 特码连续 <b>${consecutiveOdd}</b> 期为单数，注意双数反转` });
            if (consecutiveEven >= 4) alerts.push({ type: 'oe', text: `⚡ 特码连续 <b>${consecutiveEven}</b> 期为双数，注意单数反转` });

            // 3) 头数极值预警
            if (last.numberSnapshot) {
                const headOms = { '0': 999, '1': 999, '2': 999, '3': 999, '4': 999 };
                for (let n = 1; n <= 49; n++) {
                    const nStr = n.toString().padStart(2, '0');
                    const h = Math.floor(n / 10).toString();
                    const om = last.numberSnapshot[nStr] !== undefined ? last.numberSnapshot[nStr] : 999;
                    if (om < headOms[h]) headOms[h] = om;
                }
                Object.entries(headOms).forEach(([h, minOm]) => {
                    if (minOm >= 7) alerts.push({ type: 'head', text: `🎯 <b>${h}头</b> 号码群已连续 <b>${minOm}</b> 期未出特码，重点关注回补` });
                });
            }

            // 4) 和值走势均值偏态预警
            const lastSum = last.totalSum || (last.codes ? last.codes.reduce((a, b) => a + parseInt(b.num, 10), 0) : 0);
            if (lastSum >= 200) {
                alerts.push({ type: 'sum', text: `📐 上期7码和值达 <b>${lastSum}</b> (高于理论中轴+${lastSum - 175})，高位超买，防小号区间 (01-24) 均值回归` });
            } else if (lastSum > 0 && lastSum <= 150) {
                alerts.push({ type: 'sum', text: `📐 上期7码和值仅 <b>${lastSum}</b> (低于理论中轴-${175 - lastSum})，深度超跌，看大号区间 (25-49) 强力反弹` });
            }

            // 5) 跨度走势异动预警
            const allBalls = last.codes ? last.codes.map(c => parseInt(c.num, 10)).sort((a, b) => a - b) : [];
            const lastSpan = allBalls.length > 0 ? (allBalls[allBalls.length - 1] - allBalls[0]) : 0;
            if (lastSpan >= 46) {
                alerts.push({ type: 'span', text: `📏 上期开奖跨度达 <b>${lastSpan}</b> 极值拉满，首尾离散已见顶，防本期两端小幅向内收缩` });
            } else if (lastSpan > 0 && lastSpan <= 34) {
                alerts.push({ type: 'span', text: `📏 上期开奖跨度仅 <b>${lastSpan}</b> 极端聚拢，关注首尾两端号码 (01-08与43-49) 扩散拉伸` });
            }

            if (alerts.length === 0) {
                alertWrap.innerHTML = '';
            } else {
                alertWrap.innerHTML = alerts.slice(0, 3).map(a => `
                    <div class="rec-alert-item">
                        <span>⚠️</span>
                        <div>${a.text}</div>
                    </div>
                `).join('');
            }
        }

        // ==================== 4. 智能缩水过滤矩阵 ====================
        function applyShrinkMatrix(scoredNumbers, targetCount = 10) {
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

                // 1. 同尾扎堆过滤
                if ((tailCounts[tail] || 0) >= maxPerTail) {
                    rejectReason = `同尾(${tail}尾超标)`;
                }
                // 2. 同肖扎堆过滤
                else if ((zodiacCounts[z] || 0) >= maxPerZodiac) {
                    rejectReason = `同肖(${z}超标)`;
                }
                // 3. 极冷号码扎堆过滤 (防全冷死单)
                else if (isExtremeCold && extremeColdCount >= maxExtremeCold) {
                    rejectReason = `极冷超跌过多`;
                }
                // 4. 单一波色超标过滤
                else if ((colorCounts[color] || 0) >= maxColor && (selected.length < target - 2)) {
                    rejectReason = `波色失衡(${color === 'red' ? '红' : color === 'blue' ? '蓝' : '绿'}波过载)`;
                }
                // 5. 奇偶极端失衡过滤
                else if (selected.length >= target - 3) {
                    if (isOdd && oddCount >= Math.ceil(target * 0.75)) {
                        rejectReason = `奇数过载`;
                    } else if (!isOdd && evenCount >= Math.ceil(target * 0.75)) {
                        rejectReason = `偶数过载`;
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

            // 若候选耗尽未达 target 则顺延补齐
            if (selected.length < target) {
                for (const item of scoredNumbers) {
                    if (!selected.some(s => s.number === item.number)) {
                        selected.push(item);
                        if (selected.length >= target) break;
                    }
                }
            }

            return {
                result: selected,
                shrinkCount,
                details
            };
        }

        // ==================== 1. 多因子量化打分模型 ====================
        function getMultiFactorRecommendations(last, historyData) {
            const zodiacs = CONFIG.zodiacMap[state.currentYear] || [];
            const snapshot = last.snapshot || {};
            const numSnapshot = last.numberSnapshot || {};
            const globalMaxOm = state.globalMaxOm || {};
            const total = historyData.length || 1;

            const recent30 = historyData.slice(-30);
            const recent10 = historyData.slice(-10);
            const freq30 = {};
            const freq10 = {};
            const recentColorCounts = { red: 0, blue: 0, green: 0 };

            recent30.forEach(d => {
                if (d.special) {
                    const numStr = parseInt(d.special, 10).toString().padStart(2, '0');
                    freq30[numStr] = (freq30[numStr] || 0) + 1;
                }
            });
            recent10.forEach(d => {
                if (d.special) {
                    const numStr = parseInt(d.special, 10).toString().padStart(2, '0');
                    freq10[numStr] = (freq10[numStr] || 0) + 1;
                    const c = getColor(numStr);
                    if (recentColorCounts[c] !== undefined) recentColorCounts[c]++;
                }
            });

            let dominantColor = 'red';
            let maxColorF = -1;
            Object.entries(recentColorCounts).forEach(([c, cnt]) => {
                if (cnt > maxColorF) { maxColorF = cnt; dominantColor = c; }
            });

            // 权重调节因子
            const wCold = Math.max(0, Math.min(100, recConfig.weightCold !== undefined ? recConfig.weightCold : 50));
            const wMorph = Math.max(0, Math.min(100, recConfig.weightMorph !== undefined ? recConfig.weightMorph : 60));

            // coldBias (0~2) & hotBias (0~2)
            const coldBias = (100 - wCold) / 50;
            const hotBias = wCold / 50;
            const morphWeight = wMorph / 100;

            // 49码打分
            const scoredNumbers = [];
            for (let i = 1; i <= 49; i++) {
                const numStr = i.toString().padStart(2, '0');
                const z = getZodiac(i);
                const color = getColor(numStr);
                const currentOm = numSnapshot[numStr] !== undefined ? numSnapshot[numStr] : 0;
                const zOm = snapshot[z] || 0;
                const zMax = (globalMaxOm || {})[z] || 25;
                const zRatio = zMax > 0 ? zOm / zMax : 0;
                const f30 = freq30[numStr] || 0;
                const f10 = freq10[numStr] || 0;

                const morphTags = getMorphologyTags(numStr, historyData);

                // 1. 遗漏冷度得分 (0 ~ 100)
                let coldScore = 0;
                if (currentOm >= 20) {
                    coldScore = 75 + Math.min(25, (currentOm - 20) * 1.5);
                } else if (currentOm >= 12) {
                    coldScore = 50 + (currentOm - 12) * 3;
                } else if (currentOm >= 6) {
                    coldScore = 24 + (currentOm - 6) * 4;
                } else {
                    coldScore = currentOm * 4;
                }
                if (zRatio >= 0.75) coldScore = Math.min(100, coldScore + 15);

                // 2. 热度活跃得分 (0 ~ 100)
                let hotScore = (f30 * 12) + (f10 * 18);
                if (currentOm === 0) {
                    hotScore += 35;
                } else if (currentOm <= 2) {
                    hotScore += 22;
                } else if (currentOm <= 5) {
                    hotScore += 10;
                } else if (currentOm >= 12) {
                    hotScore = Math.max(0, hotScore - (currentOm - 10) * 3);
                }
                if (zOm <= 1) hotScore = Math.min(100, hotScore + 15);
                hotScore = Math.min(100, hotScore);

                // 3. 形态学共振得分 (0 ~ 100)
                let morphScore = 0;
                if (morphTags.includes('特重号')) morphScore += 30;
                if (morphTags.includes('特邻号')) morphScore += 26;
                if (morphTags.includes('正邻号')) morphScore += 16;
                if (morphTags.includes('隔期跳')) morphScore += 22;
                if (morphTags.includes('同尾共振')) morphScore += 25;
                if (color === dominantColor) {
                    morphScore += 18;
                    if (!morphTags.includes('热波共振')) morphTags.push('热波共振');
                }
                if (zRatio >= 0.7) {
                    morphScore += 20;
                    if (!morphTags.includes('生肖偏态')) morphTags.push('生肖偏态');
                }
                morphScore = Math.min(100, morphScore);

                // 综合评分计算：冷热平衡基底 + 形态加权
                const statBase = (coldScore * coldBias) + (hotScore * hotBias);
                const statPart = statBase * (1.0 - morphWeight * 0.4);
                const morphPart = morphScore * (morphWeight * 2.0);
                const finalScore = Math.round(statPart + morphPart);

                // 标签匹配
                let primaryTag = '均线平衡';
                if (wCold <= 35 && currentOm >= 8) {
                    primaryTag = currentOm >= 20 ? '极冷超跌' : '遗漏反弹';
                } else if (wCold >= 65 && (f30 >= 2 || currentOm <= 2)) {
                    primaryTag = currentOm <= 1 ? '顺势连庄' : '高频热码';
                } else if (morphWeight >= 0.45 && morphTags.length > 0) {
                    primaryTag = morphTags[0];
                } else if (currentOm >= 15) {
                    primaryTag = '极值回补';
                } else if (f30 >= 3) {
                    primaryTag = '热码中继';
                } else if (morphTags.length > 0) {
                    primaryTag = morphTags[0];
                }

                scoredNumbers.push({
                    number: numStr,
                    zodiac: z,
                    color,
                    score: finalScore,
                    currentOm,
                    f30,
                    f10,
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
                shrinkInfo = shrinkRes.details.length > 0 ? shrinkRes.details.join('、') : '优化同尾与生肖过度集中';
            } else {
                topNumbers = scoredNumbers.slice(0, displayCount);
            }

            // 12生肖评分
            const scoredZodiacs = zodiacs.map(z => {
                const currentOm = snapshot[z] || 0;
                const maxRecord = (globalMaxOm || {})[z] || 25;
                const ratio = maxRecord > 0 ? currentOm / maxRecord : 0;
                const count = (last.counts || {})[z] || 0;
                let zScore = (currentOm * 4 * coldBias) + (ratio * 35) + ((count / total) * 100 * hotBias);
                let zTag = ratio >= 0.75 ? '极限逼近' : currentOm <= 2 ? '顺势热肖' : '中枢回归';
                return { zodiac: z, score: Math.round(zScore), currentOm, maxRecord, ratio, tag: zTag };
            }).sort((a, b) => b.score - a.score);

            return {
                type: 'multifactor',
                topNumbers,
                topZodiacs: scoredZodiacs.slice(0, 4),
                allScored: scoredNumbers,
                shrinkApplied: recConfig.shrink,
                shrinkCount,
                shrinkInfo
            };
        }

        // ==================== 2. 胆码·大底·智能杀码 ====================
        function getDanBaseKillRecommendations(last, historyData) {
            const mf = getMultiFactorRecommendations(last, historyData);
            const all = mf.allScored;

            const goldDan = all.slice(0, 2);
            const silverDan = all.slice(2, 5);
            const baseCount = recConfig.spanCount || 20;
            const baseNumbers = mf.topNumbers;

            const killCandidates = all.slice(-12).filter(item => item.f30 === 0 && item.currentOm < 35).slice(0, 8);
            const killedNumbers = killCandidates.length >= 5 ? killCandidates : all.slice(-8);

            return {
                type: 'dan_base_kill',
                goldDan,
                silverDan,
                baseNumbers,
                killedNumbers,
                topZodiacs: mf.topZodiacs,
                shrinkCount: mf.shrinkCount,
                shrinkInfo: mf.shrinkInfo
            };
        }

        // ==================== 2.5 和值跨度·均值回归精选模型 ====================
        function getSumSpanRecommendations(last, historyData) {
            const mf = getMultiFactorRecommendations(last, historyData);
            const all = mf.allScored;

            // 1. 提取最新一期 7 码数据与和值、跨度
            const lastCodes = (last.codes || []).map(c => parseInt(c.num, 10)).filter(n => !isNaN(n));
            const lastSum = last.totalSum || (lastCodes.length ? lastCodes.reduce((a, b) => a + b, 0) : 175);
            const sortedBalls = lastCodes.slice().sort((a, b) => a - b);
            const lastSpan = sortedBalls.length > 0 ? (sortedBalls[sortedBalls.length - 1] - sortedBalls[0]) : (last.normalSpan || 40);

            // 2. 统计近 10 期和值与跨度均值
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

            // 3. 和值均值回归状态判断 (理论中轴 175)
            let sumStatus = 'mid'; // 'high', 'low', 'mid'
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

            // 4. 跨度离散度与首尾守门定位
            let spanStatus = 'normal'; // 'wide', 'narrow', 'normal'
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

            // 5. 对 49 码进行和值与跨度专属重构打分
            const ssScored = all.map(item => {
                const num = parseInt(item.number, 10);
                let score = item.score;
                let tag = item.tag;
                let role = 'mid'; // 'head', 'tail', 'mid'

                // (A) 和值倾向修正
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

                // (B) 跨度首尾区间角色定位
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

                return {
                    ...item,
                    score,
                    tag,
                    role,
                    isSmall: num <= 24
                };
            });

            ssScored.sort((a, b) => b.score - a.score);

            // 筛选跨度首号守门 (01-10) 与 尾号守门 (40-49)
            const headDan = ssScored.filter(n => n.role === 'head').slice(0, 2);
            const tailDan = ssScored.filter(n => n.role === 'tail').slice(0, 2);
            const midDan = ssScored.filter(n => n.role === 'mid').slice(0, 3);

            // 推荐精选号码 (支持缩水)
            const displayCount = recConfig.spanCount || 20;
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
                metrics: {
                    lastSum,
                    avgSum10,
                    sumStatus,
                    sumDesc,
                    suggestDirection,
                    suggestRatio,
                    sumAdvice,
                    lastSpan,
                    avgSpan10,
                    spanStatus,
                    spanDesc,
                    spanAdvice
                },
                shrinkApplied: recConfig.shrink,
                shrinkCount,
                shrinkInfo
            };
        }

        // ==================== 3. 平特肖与平特尾双轨推荐 ====================
        function getNormalTrackRecommendations(last, historyData) {
            const zodiacs = CONFIG.zodiacMap[state.currentYear] || [];
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
                    const z = getZodiac(n);
                    const tail = n % 10;
                    zFlatFreq[z] = (zFlatFreq[z] || 0) + 1;
                    tailFlatFreq[tail] = (tailFlatFreq[tail] || 0) + 1;
                    numFlatFreq[numStr] = (numFlatFreq[numStr] || 0) + 1;
                });
            });

            // 权重调节因子
            const wCold = Math.max(0, Math.min(100, recConfig.weightCold !== undefined ? recConfig.weightCold : 50));
            const cBias = (100 - wCold) / 50;
            const hBias = wCold / 50;

            // 排序平特生肖
            const topFlatZodiacs = zodiacs.map(z => ({
                zodiac: z,
                hits: zFlatFreq[z] || 0,
                rate: Math.round(((zFlatFreq[z] || 0) / (recent30.length * 7)) * 100)
            })).sort((a, b) => b.hits - a.hits).slice(0, 4);

            // 排序平特尾数
            const topFlatTails = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(t => ({
                tail: `${t}尾`,
                hits: tailFlatFreq[t] || 0,
                rate: Math.round(((tailFlatFreq[t] || 0) / (recent30.length * 7)) * 100)
            })).sort((a, b) => b.hits - a.hits).slice(0, 3);

            // 排序平特推荐码（结合冷热偏好）
            const topFlatNums = [];
            for (let i = 1; i <= 49; i++) {
                const nStr = i.toString().padStart(2, '0');
                const om = (last.numberSnapshot || {})[nStr] || 0;
                const hits = numFlatFreq[nStr] || 0;
                const flatScore = (hits * 6 * hBias) + (Math.min(30, om * 2) * cBias);
                topFlatNums.push({
                    number: nStr,
                    zodiac: getZodiac(i),
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

        // ==================== 4. AI 自动寻优最优组合 ====================
        function getAutoOptimizedStrategy(last, historyData) {
            const mf = getMultiFactorRecommendations(last, historyData);
            const top12Nums = mf.allScored.slice(0, 12).map(x => x.number);
            const top3Z = mf.topZodiacs.slice(0, 3).map(x => x.zodiac);

            const presets = [
                { id: 'opt_multi', name: '多因子共振精选12码', text: top12Nums.join(','), count: top12Nums.length },
                { id: 'opt_zodiac', name: '极值共振前3肖', text: top3Z.join(','), count: top3Z.length * 4 },
                { id: 'opt_gold_wave', name: '金银胆 + 热波色', text: `${mf.allScored.slice(0, 5).map(x=>x.number).join(',')},${mf.allScored[0].color === 'red' ? '红波' : mf.allScored[0].color === 'blue' ? '蓝波' : '绿波'}`, count: 18 }
            ];

            const testLen = Math.min(30, historyData.length);
            presets.forEach(p => {
                let hitCount = 0;
                const terms = parseInputTerms(p.text);
                for (let i = historyData.length - testLen; i < historyData.length; i++) {
                    const pt = historyData[i];
                    const winNum = parseInt(pt.special, 10);
                    const winStr = winNum.toString().padStart(2, '0');
                    const winZ = pt.win;
                    const winColor = pt.currentColor;
                    if (
                        terms.numbers.includes(winStr) ||
                        terms.zodiacs.includes(winZ) ||
                        terms.waves.includes(winColor)
                    ) {
                        hitCount++;
                    }
                }
                p.hitRate = Math.round((hitCount / testLen) * 100);
                p.hits = hitCount;
                p.total = testLen;
                p.roi = Math.round(((hitCount * 48) / (testLen * p.count) - 1) * 100);
            });

            presets.sort((a, b) => b.hitRate - a.hitRate);
            const best = presets[0];

            return {
                type: 'auto_opt',
                best,
                presets,
                topNumbers: mf.allScored.slice(0, 10)
            };
        }

        // ==================== 1. 历史逐期复盘与5期回看核心逻辑 ====================
        const STRATEGY_NAME_MAP = {
            'multifactor': '多因子量化共振',
            'sum_span': '和值跨度·均值回归',
            'dan_base_kill': '胆码·大底·杀码',
            'auto_opt': 'AI 历史自动寻优',
            'omission': '极值遗漏回补',
            'balance': '周期均线回归',
            'hot': '顺势热码追热',
            'color': '波色共振',
            'size': '大小分界',
            'normal_track': '平特肖尾双轨'
        };

        function getLookbackRecords(reviewCount = 5, customStrat = null, customTrack = null) {
            const data = state.historyData;
            if (!data || data.length < 2) return { records: [], hitTotal: 0, count: 0, winRate: 0, activeStrat: 'multifactor', activeTrack: 'special' };

            const count = Math.min(reviewCount, data.length - 1);
            let activeTrack = customTrack !== null ? customTrack : (recConfig.track || 'special');
            let activeStrat = customStrat || document.getElementById('recommendStrategy')?.value || 'multifactor';

            if (customStrat === 'normal_track' || activeStrat === 'normal_track') {
                activeTrack = 'normal';
                activeStrat = 'normal_track';
            }

            const records = [];
            let hitTotal = 0;

            for (let i = data.length - count; i < data.length; i++) {
                const cur = data[i];
                const prevSubset = data.slice(0, i);
                const prevLast = prevSubset[prevSubset.length - 1];

                const winNum = parseInt(cur.special, 10).toString().padStart(2, '0');
                const winZodiac = cur.win;
                const winColor = cur.currentColor;
                const normalBalls = (cur.numbers || []).filter(Boolean);

                let resultType = '未中';
                let hitRole = '';
                let isHit = false;
                let topNumbers = [];
                let top10Text = '';

                if (activeTrack === 'normal') {
                    const rec = getNormalTrackRecommendations(prevLast, prevSubset);
                    const allBalls = [...normalBalls, cur.special].filter(Boolean);
                    const openZodiacs = allBalls.map(b => getZodiac(parseInt(b, 10)));
                    const openTails = allBalls.map(b => `${parseInt(b, 10) % 10}尾`);

                    const flatNums = (rec.topFlatNums || []).map(n => n.number);
                    const flatZodiacs = (rec.topFlatZodiacs || []).map(z => z.zodiac);
                    const flatTails = (rec.topFlatTails || []).map(t => t.tail);

                    topNumbers = flatNums;

                    // 检查平特命中情况
                    const hitNums = normalBalls.filter(b => flatNums.slice(0, 10).includes(b));
                    const hitZ = flatZodiacs.slice(0, 3).filter(z => openZodiacs.includes(z));
                    const hitT = flatTails.slice(0, 2).filter(t => openTails.includes(t));

                    if (hitNums.length > 0 || hitZ.length > 0) {
                        isHit = true;
                        hitTotal++;
                    }

                    if (hitNums.length > 0 && hitZ.length > 0) {
                        resultType = `🎯 中码[${hitNums.join(',')}] 肖[${hitZ.join(',')}]`;
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
                    } else {
                        resultType = '未中';
                    }

                    top10Text = `肖:${flatZodiacs.slice(0, 3).join('')} 尾:${flatTails.slice(0, 2).join('')} 码:${flatNums.slice(0, 5).join(',')}`;
                } else if (activeStrat === 'sum_span') {
                    const rec = getSumSpanRecommendations(prevLast, prevSubset);
                    topNumbers = (rec.topNumbers || []).map(n => n.number);
                    const gold = (rec.headDan || []).map(n => n.number);
                    const silver = (rec.tailDan || []).map(n => n.number);
                    const hitIdx = topNumbers.indexOf(winNum);

                    if (gold.includes(winNum)) {
                        resultType = '🥇 命中金胆/守门';
                        hitRole = 'gold';
                        isHit = true;
                    } else if (silver.includes(winNum)) {
                        resultType = '🥈 命中银胆/次守';
                        hitRole = 'silver';
                        isHit = true;
                    } else if (hitIdx >= 0) {
                        resultType = `🎯 命中精选(第${hitIdx + 1}位)`;
                        hitRole = 'base';
                        isHit = true;
                    }
                    if (isHit) hitTotal++;
                    top10Text = topNumbers.slice(0, 6).join(' ');
                } else if (activeStrat === 'dan_base_kill') {
                    const rec = getDanBaseKillRecommendations(prevLast, prevSubset);
                    topNumbers = (rec.baseNumbers || rec.topNumbers || []).map(n => n.number);
                    const gold = (rec.goldDan || []).map(n => n.number);
                    const silver = (rec.silverDan || []).map(n => n.number);
                    const kill = (rec.killNumbers || []).map(n => n.number);
                    const hitIdx = topNumbers.indexOf(winNum);

                    if (gold.includes(winNum)) {
                        resultType = '🥇 命中金胆';
                        hitRole = 'gold';
                        isHit = true;
                    } else if (silver.includes(winNum)) {
                        resultType = '🥈 命中银胆';
                        hitRole = 'silver';
                        isHit = true;
                    } else if (hitIdx >= 0) {
                        resultType = `🎯 命中大底(第${hitIdx + 1}位)`;
                        hitRole = 'base';
                        isHit = true;
                    } else if (kill.includes(winNum)) {
                        resultType = '⚠️ 误杀特码';
                        hitRole = 'kill_fail';
                    } else {
                        resultType = '未中(避杀成功)';
                    }
                    if (isHit) hitTotal++;
                    top10Text = topNumbers.slice(0, 6).join(' ');
                } else if (activeStrat === 'auto_opt') {
                    const rec = getAutoOptimizedStrategy(prevLast, prevSubset);
                    const best = rec.best;
                    const terms = parseInputTerms(best.text);
                    isHit = terms.numbers.includes(winNum) || terms.zodiacs.includes(winZodiac) || terms.waves.includes(winColor);
                    if (isHit) hitTotal++;
                    topNumbers = rec.topNumbers ? rec.topNumbers.map(n => n.number) : terms.numbers;
                    hitRole = isHit ? 'gold' : '';
                    resultType = isHit ? `🎯 命中(${best.name.slice(0, 5)})` : '未中';
                    top10Text = `${best.name}: ${best.text}`;
                } else if (activeStrat === 'omission') {
                    const rec = getOmissionBasedRecommendations(prevLast.snapshot || {}, prevLast.colorMaxOmissions || {}, state.globalMaxOm || {}, prevLast.currentColor);
                    const topZ = rec.map(x => x.zodiac);
                    const hitIdx = topZ.indexOf(winZodiac);
                    isHit = hitIdx >= 0;
                    if (isHit) hitTotal++;
                    if (hitIdx === 0) {
                        resultType = '🥇 命中首选极值肖';
                        hitRole = 'gold';
                    } else if (hitIdx < 3) {
                        resultType = `🥈 命中前3肖(${winZodiac})`;
                        hitRole = 'silver';
                    } else if (isHit) {
                        resultType = `🎯 命中6肖(${winZodiac})`;
                        hitRole = 'base';
                    } else {
                        resultType = '未中';
                    }
                    topZ.slice(0, 4).forEach(z => {
                        for (let n = 1; n <= 49; n++) {
                            if (getZodiac(n) === z) topNumbers.push(n.toString().padStart(2, '0'));
                        }
                    });
                    top10Text = `推荐6肖: ${topZ.join(' ')}`;
                } else if (activeStrat === 'balance') {
                    const rec = getBalanceRecommendations(prevLast.snapshot || {}, prevLast.colorOmissions || {}, prevLast.sizeOmissions || {}, prevLast.counts || {}, prevSubset.length);
                    const topZ = rec.map(x => x.zodiac);
                    const hitIdx = topZ.indexOf(winZodiac);
                    isHit = hitIdx >= 0;
                    if (isHit) hitTotal++;
                    if (hitIdx === 0) {
                        resultType = '🥇 命中首推均线肖';
                        hitRole = 'gold';
                    } else if (hitIdx < 3) {
                        resultType = `🥈 命中前3肖(${winZodiac})`;
                        hitRole = 'silver';
                    } else if (isHit) {
                        resultType = `🎯 命中回归肖(${winZodiac})`;
                        hitRole = 'base';
                    } else {
                        resultType = '未中';
                    }
                    topZ.slice(0, 4).forEach(z => {
                        for (let n = 1; n <= 49; n++) {
                            if (getZodiac(n) === z) topNumbers.push(n.toString().padStart(2, '0'));
                        }
                    });
                    top10Text = `均线肖: ${topZ.join(' ')}`;
                } else if (activeStrat === 'hot') {
                    const rec = getHotRecommendations(prevLast.snapshot || {}, prevLast.counts || {}, prevSubset.length);
                    const topZ = rec.map(x => x.zodiac);
                    const hitIdx = topZ.indexOf(winZodiac);
                    isHit = hitIdx >= 0;
                    if (isHit) hitTotal++;
                    if (hitIdx === 0) {
                        resultType = '🥇 命中极热头肖';
                        hitRole = 'gold';
                    } else if (hitIdx < 3) {
                        resultType = `🥈 命中高频前3肖(${winZodiac})`;
                        hitRole = 'silver';
                    } else if (isHit) {
                        resultType = `🎯 命中热肖群(${winZodiac})`;
                        hitRole = 'base';
                    } else {
                        resultType = '未中';
                    }
                    topZ.slice(0, 4).forEach(z => {
                        for (let n = 1; n <= 49; n++) {
                            if (getZodiac(n) === z) topNumbers.push(n.toString().padStart(2, '0'));
                        }
                    });
                    top10Text = `顺热肖: ${topZ.join(' ')}`;
                } else if (activeStrat === 'color') {
                    const rec = getColorRecommendations(prevLast.colorOmissions || {}, prevLast.colorMaxOmissions || {});
                    const topColor = rec[0];
                    isHit = topColor && topColor.color === winColor;
                    if (isHit) hitTotal++;
                    hitRole = isHit ? 'gold' : '';
                    resultType = isHit ? `🎯 命中${topColor.name}` : `未中 (首推${topColor ? topColor.name : ''})`;
                    topNumbers = (CONFIG.colors[topColor ? topColor.color : 'red'] || []).slice(0, 10);
                    top10Text = `首推波色: ${topColor ? topColor.name : ''}`;
                } else if (activeStrat === 'size') {
                    const rec = getSizeRecommendations(prevLast.sizeOmissions || {});
                    const topSize = rec[0];
                    const curSize = parseInt(cur.special, 10) >= 25 ? 'big' : 'small';
                    isHit = topSize && topSize.type === curSize;
                    if (isHit) hitTotal++;
                    hitRole = isHit ? 'gold' : '';
                    resultType = isHit ? `🎯 命中${topSize.name.slice(0, 2)}` : `未中 (推${topSize ? topSize.name.slice(0, 2) : ''})`;
                    topNumbers = topSize && topSize.type === 'big' ? ['25','26','27','28','29','30'] : ['01','02','03','04','05','06'];
                    top10Text = `推荐分界: ${topSize ? topSize.name : ''}`;
                } else {
                    // multifactor
                    const rec = getMultiFactorRecommendations(prevLast, prevSubset);
                    topNumbers = (rec.topNumbers || []).map(n => n.number);
                    const gold = (rec.goldDan || (rec.topNumbers ? rec.topNumbers.slice(0, 2) : [])).map(n => n.number);
                    const silver = (rec.silverDan || (rec.topNumbers ? rec.topNumbers.slice(2, 5) : [])).map(n => n.number);
                    const hitIdx = topNumbers.indexOf(winNum);

                    if (gold.includes(winNum)) {
                        resultType = '🥇 命中金胆';
                        hitRole = 'gold';
                        isHit = true;
                    } else if (silver.includes(winNum)) {
                        resultType = '🥈 命中银胆';
                        hitRole = 'silver';
                        isHit = true;
                    } else if (hitIdx >= 0) {
                        resultType = `🎯 命中精选(第${hitIdx + 1}位)`;
                        hitRole = 'base';
                        isHit = true;
                    }
                    if (isHit) hitTotal++;
                    top10Text = topNumbers.slice(0, 6).join(' ');
                }

                records.unshift({
                    issue: cur.period || cur.expect || cur.id,
                    special: winNum,
                    zodiac: winZodiac,
                    color: winColor,
                    normalBalls,
                    topNumbers,
                    top6: topNumbers.slice(0, 6),
                    top10Text,
                    hitRole,
                    resultType,
                    isHit
                });
            }

            const winRate = count ? Math.round((hitTotal / count) * 100) : 0;
            const effectiveStrat = (activeTrack === 'normal') ? 'normal_track' : activeStrat;
            return { records, hitTotal, count, winRate, activeStrat: effectiveStrat, activeTrack };
        }

        function renderRecHistory5Inline(strategy, track = 'special') {
            const wrap = document.getElementById('recHistory5Wrap');
            if (!wrap) return;

            if (!state.historyData || state.historyData.length < 2) {
                wrap.innerHTML = '';
                return;
            }

            const { records, hitTotal, count, winRate, activeStrat } = getLookbackRecords(5, strategy, track);
            if (!records.length) {
                wrap.innerHTML = '';
                return;
            }

            const hitBadgeColor = winRate >= 60 ? 'var(--up)' : winRate >= 40 ? 'var(--warn)' : 'var(--text-secondary)';
            const stratLabel = STRATEGY_NAME_MAP[activeStrat] || '当前策略';

            wrap.innerHTML = `
                <div class="rec-section-box" style="background:rgba(255,215,0,0.02);border:1px solid rgba(255,215,0,0.25);border-radius:8px;padding:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:11px;font-weight:700;color:#ffd700;display:flex;align-items:center;gap:4px;">
                            <span>📜 近5期历史回看</span>
                            <span style="font-size:10px;color:var(--text-secondary);font-weight:normal;">(${stratLabel})</span>
                        </span>
                        <div style="display:flex;align-items:center;gap:5px;">
                            <span style="font-size:9.5px;padding:1px 6px;border-radius:4px;background:rgba(0,230,118,0.15);color:${hitBadgeColor};font-weight:700;">
                                5期中 ${hitTotal} (${winRate}%)
                            </span>
                            <button type="button" class="rec-apply-btn" style="padding:1px 6px;font-size:9.5px;font-weight:normal;" onclick="openRecHistoryModal(5)">🔍 详情</button>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        ${records.map(r => `
                            <div style="display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.28);border:1px solid ${r.isHit ? 'rgba(0,230,118,0.25)' : 'rgba(255,255,255,0.05)'};border-radius:6px;padding:4px 6px;font-size:10px;gap:6px;">
                                <div style="display:flex;align-items:center;gap:5px;flex-shrink:0;">
                                    <span style="color:var(--text-secondary);font-size:9.5px;min-width:38px;">${String(r.issue).slice(-3)}期</span>
                                    <span style="display:inline-block;width:19px;height:19px;line-height:19px;border-radius:50%;background:${r.color === 'red' ? '#ff1744' : r.color === 'blue' ? '#448aff' : '#00e676'};color:#fff;font-weight:700;font-size:9.5px;text-align:center;">${r.special}</span>
                                    <span style="font-size:9.5px;color:var(--text-primary);">${r.zodiac}</span>
                                </div>
                                <div style="font-size:9px;color:var(--text-secondary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 4px;" title="当时推荐: ${r.top10Text}">
                                    ${r.isHit ? `<span style="color:var(--accent);">命中: <b style="color:${r.hitRole === 'gold' ? '#ffd700' : 'var(--up)'};font-size:10px;">${r.resultType.replace('🎯 ','').replace('🥇 ','').replace('🥈 ','')}</b></span>` : `<span style="color:var(--text-secondary);">${r.top10Text}</span>`}
                                </div>
                                <div style="flex-shrink:0;">
                                    <span style="display:inline-block;font-size:9px;padding:1px 5px;border-radius:3px;background:${r.isHit ? (r.hitRole === 'gold' ? 'rgba(255,215,0,0.18)' : 'rgba(0,230,118,0.18)') : 'rgba(255,255,255,0.05)'};color:${r.isHit ? (r.hitRole === 'gold' ? '#ffd700' : 'var(--up)') : 'var(--text-secondary)'};border:1px solid ${r.isHit ? 'currentColor' : 'transparent'};font-weight:700;white-space:nowrap;">
                                        ${r.resultType}
                                    </span>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function setRecModalCount(count) {
            state.recModalCount = count;
            const t5 = document.getElementById('recModalTab5');
            const t10 = document.getElementById('recModalTab10');
            const t20 = document.getElementById('recModalTab20');
            if (t5) t5.classList.toggle('active', count === 5);
            if (t10) t10.classList.toggle('active', count === 10);
            if (t20) t20.classList.toggle('active', count === 20);

            const titleEl = document.getElementById('recModalTitle');
            if (titleEl) titleEl.textContent = `📜 智能推荐·逐期复盘验证 (近${count}期)`;

            renderRecHistoryModal(count);
        }

        function onRecModalStrategyChange(newStrat) {
            if (newStrat === 'normal_track') {
                recConfig.track = 'normal';
                document.getElementById('recTrackSpecial')?.classList.remove('active');
                document.getElementById('recTrackNormal')?.classList.add('active');
            } else {
                recConfig.track = 'special';
                document.getElementById('recTrackSpecial')?.classList.add('active');
                document.getElementById('recTrackNormal')?.classList.remove('active');
                const stratSelect = document.getElementById('recommendStrategy');
                if (stratSelect) stratSelect.value = newStrat;
            }
            saveRecConfig();
            generateRecommendations();
        }

        function openRecHistoryModal(count = 5) {
            const modal = document.getElementById('recHistoryModal');
            if (!modal) return;
            modal.style.display = 'flex';
            const selectEl = document.getElementById('recModalStrategySelect');
            if (selectEl) {
                selectEl.value = recConfig.track === 'normal' ? 'normal_track' : (document.getElementById('recommendStrategy')?.value || 'multifactor');
            }
            setRecModalCount(count);
        }

        function closeRecHistoryModal() {
            const modal = document.getElementById('recHistoryModal');
            if (modal) modal.style.display = 'none';
        }

        function renderRecHistoryModal(reviewCount = null, customStrat = null) {
            const count = reviewCount || state.recModalCount || 5;
            const statsEl = document.getElementById('recModalStats');
            const sparkEl = document.getElementById('recModalSpark');
            const tableEl = document.getElementById('recModalTable');
            const tbodyEl = document.getElementById('recModalTbody');
            if (!state.historyData || !state.historyData.length || !tbodyEl) return;

            const selectEl = document.getElementById('recModalStrategySelect');
            const targetStrat = customStrat || (selectEl ? selectEl.value : (recConfig.track === 'normal' ? 'normal_track' : (document.getElementById('recommendStrategy')?.value || 'multifactor')));
            const targetTrack = targetStrat === 'normal_track' ? 'normal' : 'special';

            if (selectEl && selectEl.value !== targetStrat) {
                selectEl.value = targetStrat;
            }

            const { records, hitTotal, count: actualCount, winRate, activeStrat } = getLookbackRecords(count, targetStrat, targetTrack);
            if (!records.length) return;

            const stratDisplayName = STRATEGY_NAME_MAP[activeStrat] || '当前策略';

            if (statsEl) {
                statsEl.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.3);border-radius:8px;padding:8px 12px;font-size:11px;flex-wrap:wrap;gap:8px;">
                        <span>复盘样本: <b>近${actualCount}期</b> (${stratDisplayName})</span>
                        <span>综合命中率: <b style="color:var(--up);font-size:13px;">${winRate}%</b> (${hitTotal}/${actualCount})</span>
                        <span>盈利收益比: <b style="color:var(--accent);">+${Math.max(0, winRate * 3 - 100)}%</b></span>
                    </div>
                `;
            }

            if (sparkEl) {
                sparkEl.innerHTML = records.slice().reverse().map(r => `
                    <div class="rec-spark-bar" title="${r.issue}期 开${r.special} (${r.resultType})">
                        <div class="bar" style="height:${r.isHit ? '100%' : '20%'};background:${r.isHit ? (r.hitRole === 'gold' ? '#ffd700' : 'var(--up)') : 'rgba(255,255,255,0.1)'};"></div>
                    </div>
                `).join('');
            }

            if (tableEl) {
                const theadEl = tableEl.querySelector('thead');
                if (theadEl) {
                    theadEl.innerHTML = `
                        <tr style="color:var(--text-secondary);border-bottom:1px solid var(--border);text-align:left;">
                            <th style="padding:6px 4px;">期号</th>
                            <th style="padding:6px 4px;">${activeStrat === 'normal_track' ? '开奖落球 (平特+特码)' : '开出特码'}</th>
                            <th style="padding:6px 4px;">当时推荐核心 (${stratDisplayName})</th>
                            <th style="padding:6px 4px;text-align:center;">验证结果</th>
                        </tr>
                    `;
                }
            }

            tbodyEl.innerHTML = records.map(r => {
                let ballDisplay = '';
                if (activeStrat === 'normal_track') {
                    const normalBadges = (r.normalBalls || []).map(b => {
                        const c = getColor(b);
                        const bg = c === 'red' ? '#ff1744' : c === 'blue' ? '#448aff' : '#00e676';
                        return `<span style="display:inline-block;padding:0 3px;border-radius:3px;background:${bg};color:#fff;font-size:9.5px;margin-right:2px;">${b}</span>`;
                    }).join('');
                    const spColor = r.color === 'red' ? '#ff1744' : r.color === 'blue' ? '#448aff' : '#00e676';
                    ballDisplay = `
                        <div style="font-size:9.5px;display:flex;align-items:center;flex-wrap:wrap;gap:2px;">
                            ${normalBadges}
                            <span style="display:inline-block;padding:0 4px;border-radius:3px;background:${spColor};color:#fff;font-weight:700;font-size:9.5px;">+${r.special}</span>
                        </div>
                    `;
                } else {
                    ballDisplay = `
                        <span style="display:inline-block;padding:1px 5px;border-radius:4px;background:${r.color === 'red' ? '#ff1744' : r.color === 'blue' ? '#448aff' : '#00e676'};color:#fff;font-weight:700;">${r.special}</span>
                        <span style="font-size:10px;margin-left:3px;color:var(--text-secondary);">${r.zodiac}</span>
                    `;
                }

                let recDetail = '';
                if (activeStrat === 'normal_track') {
                    recDetail = `<span style="color:var(--text-secondary);">${r.top10Text}</span>`;
                } else if (r.topNumbers && r.topNumbers.length > 0) {
                    recDetail = r.topNumbers.slice(0, 8).map(num => num === r.special ? `<b style="color:${r.hitRole === 'gold' ? '#ffd700' : 'var(--up)'};background:rgba(255,255,255,0.08);padding:1px 3px;border-radius:2px;border:1px solid currentColor;">${num}</b>` : num).join(' ') + '...';
                } else {
                    recDetail = `<span style="color:var(--text-secondary);">${r.top10Text}</span>`;
                }

                return `
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                        <td style="padding:6px 4px;color:var(--text-secondary);white-space:nowrap;">${String(r.issue).slice(-3)}期</td>
                        <td style="padding:6px 4px;white-space:nowrap;">${ballDisplay}</td>
                        <td style="padding:6px 4px;font-size:10px;color:var(--text-secondary);">${recDetail}</td>
                        <td style="padding:6px 4px;text-align:center;white-space:nowrap;">
                            <span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${r.isHit ? (r.hitRole === 'gold' ? 'rgba(255,215,0,0.2)' : 'rgba(0,230,118,0.2)') : 'rgba(255,255,255,0.05)'};color:${r.isHit ? (r.hitRole === 'gold' ? '#ffd700' : 'var(--up)') : 'var(--text-secondary)'};border:1px solid ${r.isHit ? 'currentColor' : 'transparent'};">
                                ${r.resultType}
                            </span>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // ==================== 3. 一键套用至特码自由K线 ====================
        function applyRecommendToKLine(type, numbersText) {
            const inputEl = document.getElementById('coldOption_inputNumbers');
            if (!inputEl) return;

            let cleanText = numbersText || '';
            if (Array.isArray(cleanText)) cleanText = cleanText.join(',');

            inputEl.value = cleanText;

            // 触发输入联动
            if (typeof onColdCustomInputChange === 'function') {
                onColdCustomInputChange();
            }
            if (typeof updateColdSelectionInfo === 'function') {
                updateColdSelectionInfo();
            }
            if (typeof generateColdKline === 'function') {
                generateColdKline();
            }

            showNotification(`已套用【${cleanText}】至特码自由K线！`);

            const chartEl = document.getElementById('chart') || document.querySelector('.main-card');
            if (chartEl) {
                chartEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function computeRecommendationsForPoint(p, strategy, globalMaxOm) {
            const snapshot = p.snapshot || {};
            const colorOm = p.colorOmissions || { red: 0, blue: 0, green: 0 };
            const sizeOm = p.sizeOmissions || { big: 0, small: 0 };
            const colorMaxOm = p.colorMaxOmissions || { red: 0, blue: 0, green: 0 };
            const counts = p.counts || {};
            const total = p.total || 1;
            switch (strategy) {
                case 'multifactor':
                case 'sum_span':
                case 'dan_base_kill':
                case 'auto_opt':
                case 'omission': return getOmissionBasedRecommendations(snapshot, colorMaxOm, globalMaxOm, p.currentColor || 'red');
                case 'balance': return getBalanceRecommendations(snapshot, colorOm, sizeOm, counts, total);
                case 'hot': return getHotRecommendations(snapshot, counts, total);
                case 'color': return getColorRecommendations(colorOm, colorMaxOm);
                case 'size': return getSizeRecommendations(sizeOm);
                default: return getOmissionBasedRecommendations(snapshot, colorMaxOm, globalMaxOm, p.currentColor || 'red');
            }
        }

        function computeRecommendationStats(strategy, n = 10) {
            const data = state.historyData;
            if (data.length < 2) return { hit: 0, total: 0, rate: 0 };
            const globalMaxOm = state.globalMaxOm || {};
            let hit = 0, total = 0;
            const start = Math.max(0, data.length - 1 - n);
            for (let i = start; i < data.length - 1; i++) {
                const rec = computeRecommendationsForPoint(data[i], strategy, globalMaxOm);
                if (!rec || !rec.length) continue;
                const top = rec[0];
                const next = data[i + 1];
                let isHit = false;
                if (top.zodiac) isHit = top.zodiac === next.win;
                else if (top.color) isHit = top.color === next.currentColor;
                else if (top.type) isHit = top.type === next.currentSize;
                total++;
                if (isHit) hit++;
            }
            return { hit, total, rate: total ? (hit / total) * 100 : 0 };
        }

        function getOmissionBasedRecommendations(snapshot, colorMaxOm, globalMaxOm, currentColor) {
            const zodiacs = CONFIG.zodiacMap[state.currentYear];

            const scored = zodiacs.map(z => {
                const currentOm = snapshot[z] || 0;
                const maxRecord = (globalMaxOm || {})[z] || 0;
                const ratio = maxRecord > 0 ? currentOm / maxRecord : 0;
                const color = currentColor || 'red';

                let score = currentOm * 10 + ratio * 50;

                const zodiacColorMap = { '鼠': 'blue', '牛': 'green', '虎': 'green', '兔': 'green', '龙': 'red', '蛇': 'red', '马': 'red', '羊': 'red', '猴': 'blue', '鸡': 'blue', '狗': 'blue', '猪': 'blue' };
                if (zodiacColorMap[z] === color) {
                    score += 20;
                }

                return { zodiac: z, score, currentOm, maxRecord, ratio };
            });

            return scored.sort((a, b) => b.score - a.score).slice(0, 6);
        }

        function getBalanceRecommendations(snapshot, colorOm, sizeOm, counts, total) {
            const zodiacs = CONFIG.zodiacMap[state.currentYear];

            const scored = zodiacs.map(z => {
                const currentOm = snapshot[z] || 0;
                const count = (counts || {})[z] || 0;
                const avgCycle = total / (count || 1);
                const deviation = currentOm - avgCycle;

                let score = currentOm * 5 + deviation * 20 - Math.abs(deviation) * 5;

                return { zodiac: z, score, currentOm, count, avgCycle };
            });

            return scored.sort((a, b) => b.score - a.score).slice(0, 6);
        }

        function getHotRecommendations(snapshot, counts, total) {
            const zodiacs = CONFIG.zodiacMap[state.currentYear];

            const scored = zodiacs.map(z => {
                const currentOm = snapshot[z] || 0;
                const count = (counts || {})[z] || 0;
                const avgCycle = total / (count || 1);

                let score = (avgCycle - currentOm) * 15 + count;

                return { zodiac: z, score, currentOm, count, avgCycle };
            });

            return scored.sort((a, b) => b.score - a.score).slice(0, 6);
        }

        function getColorRecommendations(colorOm, colorMaxOm) {
            const colors = ['red', 'blue', 'green'];
            const colorNames = { red: '红波', blue: '蓝波', green: '绿波' };

            const scored = colors.map(c => {
                const current = colorOm[c] || 0;
                const max = colorMaxOm[c] || 0;
                const ratio = max > 0 ? current / max : 0;

                let score = current * 10 + ratio * 30;

                return { color: c, name: colorNames[c], score, current, max, ratio };
            });

            return scored.sort((a, b) => b.score - a.score).map(item => ({
                ...item,
                numbers: CONFIG.colors[item.color].slice(0, 5).join(' ')
            }));
        }

        function getSizeRecommendations(sizeOm) {
            const big = { type: 'big', name: '大数(25-49)', current: sizeOm.big || 0 };
            const small = { type: 'small', name: '小数(1-24)', current: sizeOm.small || 0 };

            const scored = [big, small].map(s => {
                let score = s.current * 10;
                return { ...s, score };
            });

            return scored.sort((a, b) => b.score - a.score);
        }

        function renderRecommendations(container, recommendations, strategy) {
            state.currentRecommendations = { strategy, recommendations, track: recConfig.track };
            if (!recommendations || (Array.isArray(recommendations) && recommendations.length === 0)) {
                container.innerHTML = '<div style="text-align: center; color: var(--text-secondary); font-size: 11px; padding: 10px;">暂无推荐</div>';
                return;
            }

            // 0. 平特肖尾双轨模式界面
            if (strategy === 'normal_track' || recommendations.topFlatZodiacs) {
                const { topFlatZodiacs, topFlatTails, topFlatNums } = recommendations;
                const flatZStr = topFlatZodiacs.map(z => z.zodiac).join(',');
                const flatNumStr = topFlatNums.map(n => n.number).join(',');

                let html = `
                    <div class="rec-section-box">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:var(--accent);">🐾 高频平特肖 (近30期正码共振)</span>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('flat_zodiac', '${flatZStr}')">📈 套用平肖</button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:4px;">
                            ${topFlatZodiacs.map(z => `
                                <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:6px;padding:5px 2px;text-align:center;">
                                    <div style="font-size:13px;font-weight:700;color:var(--accent);">${z.zodiac}</div>
                                    <div style="font-size:9px;color:var(--up);">${z.hits}次 (${z.rate}%)</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="rec-section-box">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:var(--warn);">🎯 高频平特尾数</span>
                            <span style="font-size:9px;color:var(--text-secondary);">出球频次占比</span>
                        </div>
                        <div style="display:flex;gap:6px;">
                            ${topFlatTails.map(t => `
                                <div style="flex:1;background:rgba(255,171,0,0.08);border:1px solid rgba(255,171,0,0.3);border-radius:6px;padding:4px 2px;text-align:center;">
                                    <div style="font-size:12px;font-weight:700;color:var(--warn);">${t.tail}</div>
                                    <div style="font-size:9px;color:var(--text-secondary);">${t.hits}次</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="rec-section-box" style="margin-bottom:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:var(--text-primary);">🎰 正码连开精选码 (Top ${topFlatNums.length})</span>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('flat_num', '${flatNumStr}')">套用正码</button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:4px;">
                            ${topFlatNums.map(item => `
                                <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:6px;padding:3px 2px;text-align:center;">
                                    <div style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:50%;background:${item.color === 'red' ? '#ff1744' : item.color === 'blue' ? '#448aff' : '#00e676'};color:#fff;font-weight:700;font-size:10.5px;">${item.number}</div>
                                    <div style="font-size:8.5px;color:var(--text-secondary);margin-top:2px;">${item.zodiac} (${item.hits}次)</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                container.innerHTML = html;
                return;
            }

            // 0.5 和值跨度·均值回归精选界面
            if (strategy === 'sum_span' && recommendations.topNumbers) {
                const { topNumbers, headDan, tailDan, midDan, topZodiacs, metrics, shrinkCount, shrinkInfo } = recommendations;
                const numListStr = topNumbers.map(n => n.number).join(',');
                const guardStr = [...(headDan || []), ...(tailDan || [])].map(n => n.number).join(',');
                const isShrinked = recConfig.shrink;

                const sumDiff = metrics.lastSum - 175;
                const sumDiffText = sumDiff > 0 ? `+${sumDiff}` : `${sumDiff}`;
                const sumBadgeColor = metrics.sumStatus === 'high' ? 'var(--down)' : metrics.sumStatus === 'low' ? 'var(--up)' : 'var(--accent)';
                const spanBadgeColor = metrics.spanStatus === 'wide' ? 'var(--warn)' : metrics.spanStatus === 'narrow' ? 'var(--up)' : 'var(--accent)';

                let html = `
                    <!-- 和值与跨度量化状态看板 -->
                    <div class="rec-section-box" style="background:rgba(0,229,255,0.03);border:1px solid rgba(0,229,255,0.2);">
                        <div style="font-size:10px;font-weight:700;color:var(--accent);margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">
                            <span>📐 和值跨度·均值回归诊断台</span>
                            <span style="font-size:9px;color:var(--text-secondary);">10期均值基准</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <!-- 和值分析卡 -->
                            <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:6px;padding:6px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:10px;color:var(--text-secondary);">7码和值</span>
                                    <span style="font-size:9px;padding:1px 4px;border-radius:3px;background:rgba(255,255,255,0.05);color:${sumBadgeColor};font-weight:700;">${metrics.sumDesc}</span>
                                </div>
                                <div style="font-size:14px;font-weight:800;color:var(--text-primary);margin:2px 0;">
                                    ${metrics.lastSum} <span style="font-size:9.5px;color:${sumBadgeColor};font-weight:normal;">(${sumDiffText})</span>
                                </div>
                                <div style="font-size:8.5px;color:var(--text-secondary);line-height:1.3;">
                                    10期均值: ${metrics.avgSum10} | 回归: <b style="color:${sumBadgeColor};">${metrics.suggestDirection}</b>
                                </div>
                            </div>
                            <!-- 跨度分析卡 -->
                            <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:6px;padding:6px;">
                                <div style="display:flex;justify-content:space-between;align-items:center;">
                                    <span style="font-size:10px;color:var(--text-secondary);">全码跨度</span>
                                    <span style="font-size:9px;padding:1px 4px;border-radius:3px;background:rgba(255,255,255,0.05);color:${spanBadgeColor};font-weight:700;">${metrics.spanDesc}</span>
                                </div>
                                <div style="font-size:14px;font-weight:800;color:var(--text-primary);margin:2px 0;">
                                    ${metrics.lastSpan} <span style="font-size:9.5px;color:var(--text-secondary);font-weight:normal;">(均值${metrics.avgSpan10})</span>
                                </div>
                                <div style="font-size:8.5px;color:var(--text-secondary);line-height:1.3;">
                                    首尾跨距: <b style="color:${spanBadgeColor};">${metrics.spanStatus === 'wide' ? '防收缩' : metrics.spanStatus === 'narrow' ? '防扩散' : '黄金常态'}</b>
                                </div>
                            </div>
                        </div>
                        <div style="font-size:8.5px;color:var(--warn);margin-top:6px;padding-top:4px;border-top:1px dashed rgba(255,255,255,0.08);line-height:1.4;">
                            💡 <b>策略重心</b>：${metrics.sumAdvice}。建议大小配比：<b>${metrics.suggestRatio}</b>
                        </div>
                    </div>

                    <!-- 跨度首尾守门码（首号 + 尾号） -->
                    <div class="rec-section-box">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:#ffd700;">🚪 跨度首尾守门码 (01-10首 / 40-49尾)</span>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('guard', '${guardStr}')">套用首尾</button>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
                            <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.25);border-radius:6px;padding:4px 6px;">
                                <div style="font-size:9.5px;color:var(--text-secondary);margin-bottom:3px;">🚪 首号守门候选:</div>
                                <div style="display:flex;gap:5px;align-items:center;">
                                    ${(headDan || []).map(h => `
                                        <div style="display:flex;align-items:center;gap:3px;">
                                            <span style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:50%;background:${h.color === 'red' ? '#ff1744' : h.color === 'blue' ? '#448aff' : '#00e676'};color:#fff;font-weight:700;font-size:10px;text-align:center;">${h.number}</span>
                                            <span style="font-size:9px;color:var(--text-primary);">${h.zodiac}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <div style="background:rgba(255,215,0,0.06);border:1px solid rgba(255,215,0,0.25);border-radius:6px;padding:4px 6px;">
                                <div style="font-size:9.5px;color:var(--text-secondary);margin-bottom:3px;">🚪 尾号守门候选:</div>
                                <div style="display:flex;gap:5px;align-items:center;">
                                    ${(tailDan || []).map(t => `
                                        <div style="display:flex;align-items:center;gap:3px;">
                                            <span style="display:inline-block;width:20px;height:20px;line-height:20px;border-radius:50%;background:${t.color === 'red' ? '#ff1744' : t.color === 'blue' ? '#448aff' : '#00e676'};color:#fff;font-weight:700;font-size:10px;text-align:center;">${t.number}</span>
                                            <span style="font-size:9px;color:var(--text-primary);">${t.zodiac}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 精选号码推荐群 -->
                    <div class="rec-section-box">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <div style="display:flex;align-items:center;gap:4px;">
                                <span style="font-size:11px;font-weight:700;color:var(--accent);">⭐ 均值回归·精选 ${topNumbers.length} 码</span>
                                ${isShrinked ? `<span style="font-size:8.5px;padding:1px 4px;border-radius:3px;background:rgba(0,230,118,0.15);color:var(--up);border:1px solid rgba(0,230,118,0.3);" title="${shrinkInfo || '已自动进行同尾/同肖瘦身'}">已缩水${shrinkCount ? `(滤换${shrinkCount}码)` : ''}</span>` : ''}
                            </div>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('multi', '${numListStr}')">📈 套用至K线</button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:5px;">
                            ${topNumbers.map(item => `
                                <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:6px;padding:4px 2px;text-align:center;">
                                    <div style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:50%;background:${item.color === 'red' ? '#ff1744' : item.color === 'blue' ? '#448aff' : '#00e676'};color:#fff;font-weight:700;font-size:11px;">${item.number}</div>
                                    <div style="font-size:9px;color:var(--text-secondary);margin-top:2px;">${item.zodiac}</div>
                                    <div class="rec-tag-badge" style="${item.role === 'head' || item.role === 'tail' ? 'background:rgba(255,215,0,0.15);color:#ffd700;border-color:rgba(255,215,0,0.3);' : ''}">${item.tag}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- 共振生肖 -->
                    <div class="rec-section-box" style="margin-bottom:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:var(--warn);">🐾 均值共振优选生肖</span>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('zodiac', '${topZodiacs.map(z=>z.zodiac).join(',')}')">📈 套用生肖</button>
                        </div>
                        <div style="display:flex;gap:6px;">
                            ${topZodiacs.map(z => `
                                <div style="flex:1;background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:6px;padding:5px 2px;text-align:center;">
                                    <div style="font-size:13px;font-weight:700;color:var(--accent);">${z.zodiac}</div>
                                    <div style="font-size:9px;color:var(--text-secondary);">遗漏:${z.currentOm}</div>
                                    <div class="rec-tag-badge" style="background:rgba(255,171,0,0.12);color:var(--warn);border-color:rgba(255,171,0,0.3);">${z.tag}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                container.innerHTML = html;
                return;
            }

            // 1. 多因子量化共振界面
            if (strategy === 'multifactor' && recommendations.topNumbers) {
                const { topNumbers, topZodiacs, shrinkCount, shrinkInfo } = recommendations;
                const numListStr = topNumbers.map(n => n.number).join(',');
                const isShrinked = recConfig.shrink;

                let html = `
                    <div class="rec-section-box">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <div style="display:flex;align-items:center;gap:4px;">
                                <span style="font-size:11px;font-weight:700;color:var(--accent);">⭐ 综合置信度 Top ${topNumbers.length} 码</span>
                                ${isShrinked ? `<span style="font-size:8.5px;padding:1px 4px;border-radius:3px;background:rgba(0,230,118,0.15);color:var(--up);border:1px solid rgba(0,230,118,0.3);" title="${shrinkInfo || '已自动进行同尾/同肖/冷态瘦身'}">已缩水${shrinkCount ? `(滤换${shrinkCount}码)` : ''}</span>` : ''}
                            </div>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('multi', '${numListStr}')">📈 套用至K线</button>
                        </div>
                        <div style="display:grid;grid-template-columns:repeat(5, 1fr);gap:5px;">
                            ${topNumbers.map(item => `
                                <div style="background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:6px;padding:4px 2px;text-align:center;">
                                    <div style="display:inline-block;width:22px;height:22px;line-height:22px;border-radius:50%;background:${item.color === 'red' ? '#ff1744' : item.color === 'blue' ? '#448aff' : '#00e676'};color:#fff;font-weight:700;font-size:11px;">${item.number}</div>
                                    <div style="font-size:9px;color:var(--text-secondary);margin-top:2px;">${item.zodiac}</div>
                                    <div class="rec-tag-badge" title="${(item.morphTags || []).join(' ')}">${item.tag}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="rec-section-box" style="margin-bottom:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:var(--warn);">🐾 共振优选生肖</span>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('zodiac', '${topZodiacs.map(z=>z.zodiac).join(',')}')">📈 套用生肖</button>
                        </div>
                        <div style="display:flex;gap:6px;">
                            ${topZodiacs.map(z => `
                                <div style="flex:1;background:rgba(0,0,0,0.25);border:1px solid var(--border);border-radius:6px;padding:5px 2px;text-align:center;">
                                    <div style="font-size:13px;font-weight:700;color:var(--accent);">${z.zodiac}</div>
                                    <div style="font-size:9px;color:var(--text-secondary);">遗漏:${z.currentOm}</div>
                                    <div class="rec-tag-badge" style="background:rgba(255,171,0,0.12);color:var(--warn);border-color:rgba(255,171,0,0.3);">${z.tag}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
                container.innerHTML = html;
                return;
            }

            // 2. 胆码·大底·智能杀码界面
            if (strategy === 'dan_base_kill' && recommendations.goldDan) {
                const { goldDan, silverDan, baseNumbers, killedNumbers } = recommendations;
                const goldStr = goldDan.map(n => n.number).join(',');
                const baseStr = baseNumbers.map(n => n.number).join(',');
                const killStr = killedNumbers.map(n => n.number).join(',');

                let html = `
                    <div class="rec-section-box">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:#ffd700;">🥇 核心金胆 (主攻)</span>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('dan', '${goldStr}')">套用金胆</button>
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;">
                            ${goldDan.map(g => `
                                <div style="display:flex;align-items:center;gap:6px;background:rgba(255,215,0,0.1);border:1px solid rgba(255,215,0,0.4);border-radius:6px;padding:4px 8px;">
                                    <span class="rec-dan-pill" style="background:linear-gradient(135deg,#ffd700,#ff8f00);">${g.number}</span>
                                    <div>
                                        <div style="font-size:11px;font-weight:700;color:var(--text-primary);">${g.zodiac} (${g.color === 'red' ? '红' : g.color === 'blue' ? '蓝' : '绿'})</div>
                                        <div style="font-size:8.5px;color:var(--warn);">遗漏${g.currentOm}期</div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="rec-section-box">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:#c0c0c0;">🥈 辅助银胆 & 精选大底 (${baseNumbers.length}码)</span>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('base', '${baseStr}')">套用大底</button>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;">
                            ${baseNumbers.map((b, idx) => `
                                <span style="font-size:10px;padding:2px 5px;border-radius:4px;background:${idx < 3 ? 'rgba(192,192,192,0.15)' : 'rgba(0,0,0,0.2)'};border:1px solid ${idx < 3 ? '#c0c0c0' : 'var(--border)'};color:${idx < 3 ? '#fff' : 'var(--text-secondary)'};">
                                    ${b.number} ${b.zodiac}
                                </span>
                            `).join('')}
                        </div>
                    </div>

                    <div class="rec-section-box" style="margin-bottom:0;background:rgba(255,23,68,0.03);border-color:rgba(255,23,68,0.2);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                            <span style="font-size:11px;font-weight:700;color:var(--down);">🚫 智能杀码 (极弱排除)</span>
                            <span style="font-size:9px;color:var(--text-secondary);">${killedNumbers.length}码</span>
                        </div>
                        <div style="display:flex;flex-wrap:wrap;gap:4px;">
                            ${killedNumbers.map(k => `
                                <span style="font-size:10px;padding:1px 5px;border-radius:3px;background:rgba(255,23,68,0.1);color:var(--down);text-decoration:line-through;">
                                    ${k.number}
                                </span>
                            `).join('')}
                        </div>
                    </div>
                `;
                container.innerHTML = html;
                return;
            }

            // 4. AI 自动寻优界面
            if (strategy === 'auto_opt' && recommendations.best) {
                const { best, presets } = recommendations;
                let html = `
                    <div class="rec-section-box" style="background:rgba(0,212,255,0.05);border-color:var(--accent);">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                            <span style="font-size:11px;font-weight:700;color:var(--accent);">🏆 AI 历史最优寻优方案</span>
                            <button class="rec-apply-btn" onclick="applyRecommendToKLine('opt', '${best.text}')">⚡ 一键套用回测</button>
                        </div>
                        <div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:4px;">
                            ${best.name}
                        </div>
                        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text-secondary);margin-bottom:6px;">
                            <span>近30期命中率: <b style="color:var(--up);">${best.hitRate}%</b> (${best.hits}/${best.total})</span>
                            <span>胜率回报比: <b style="color:var(--accent);">${best.roi > 0 ? '+' : ''}${best.roi}%</b></span>
                        </div>
                        <div style="font-size:10px;padding:4px 6px;background:rgba(0,0,0,0.3);border-radius:4px;word-break:break-all;color:var(--text-primary);">
                            ${best.text}
                        </div>
                    </div>

                    <div style="font-size:10px;color:var(--text-secondary);margin-bottom:4px;">📊 备选优胜方案对决</div>
                    <div style="display:flex;flex-direction:column;gap:4px;">
                        ${presets.slice(1, 3).map(p => `
                            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 6px;background:rgba(0,0,0,0.2);border:1px solid var(--border);border-radius:4px;font-size:10px;">
                                <span style="color:var(--text-secondary);">${p.name}</span>
                                <div>
                                    <span style="color:var(--up);margin-right:6px;">命中 ${p.hitRate}%</span>
                                    <button class="rec-apply-btn" style="padding:1px 4px;font-size:9px;" onclick="applyRecommendToKLine('opt', '${p.text}')">套用</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `;
                container.innerHTML = html;
                return;
            }

            // 默认单项推荐渲染
            const strategyLabels = {
                omission: '遗漏优先 - 选择遗漏值最高号码',
                balance: '均衡推荐 - 平衡遗漏与频率',
                hot: '热号回补 - 选择即将出现号码',
                color: '波色策略 - 推荐波色及号码',
                size: '大小策略 - 推荐大小方向',
            };

            let html = `
                <div style="font-size: 10px; color: var(--text-secondary); margin-bottom: 10px;">
                    ${strategyLabels[strategy] || ''}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px; justify-content: center;">
            `;

            if (recommendations[0]?.zodiac) {
                const zList = recommendations.map(r => r.zodiac).join(',');
                html += `<div style="width:100%;text-align:right;margin-bottom:4px;"><button class="rec-apply-btn" onclick="applyRecommendToKLine('zodiac', '${zList}')">📈 一键套用生肖至K线</button></div>`;
                recommendations.forEach(item => {
                    const ratio = item.maxRecord > 0 ? Math.round(item.currentOm / item.maxRecord * 100) : 0;
                    const isHot = item.currentOm <= 3;
                    const isCold = ratio >= 80;

                    html += `
                        <div style="
                            padding: 6px 10px;
                            background: ${isCold ? 'rgba(255, 23, 68, 0.2)' : isHot ? 'rgba(0, 230, 118, 0.2)' : 'var(--card-bg)'};
                            border: 1px solid ${isCold ? 'var(--down)' : isHot ? 'var(--up)' : 'var(--border)'};
                            border-radius: 6px;
                            text-align: center;
                            min-width: 44px;
                        ">
                            <div style="font-size: 14px; font-weight: 700; color: var(--accent);">${item.zodiac}</div>
                            <div style="font-size: 9px; color: var(--text-secondary);">遗漏:${item.currentOm}</div>
                            ${ratio > 0 ? `<div style="font-size: 9px; color: ${ratio >= 80 ? 'var(--down)' : 'var(--text-secondary)'};">${ratio}%</div>` : ''}
                        </div>
                    `;
                });
            } else if (recommendations[0]?.color) {
                recommendations.forEach(item => {
                    html += `
                        <div style="
                            padding: 8px 12px;
                            background: ${item.color === 'red' ? 'rgba(255, 23, 68, 0.15)' : item.color === 'blue' ? 'rgba(68, 138, 255, 0.15)' : 'rgba(0, 230, 118, 0.15)'};
                            border: 1px solid ${item.color === 'red' ? '#ff1744' : item.color === 'blue' ? '#448aff' : '#00e676'};
                            border-radius: 8px;
                            text-align: center;
                            flex: 1;
                            min-width: 80px;
                        ">
                            <div style="font-size: 12px; font-weight: 700; color: ${item.color === 'red' ? '#ff1744' : item.color === 'blue' ? '#448aff' : '#00e676'};">${item.name}</div>
                            <div style="font-size: 11px; font-weight: 700; margin-top: 2px;">${item.current}期</div>
                            <div style="font-size: 9px; color: var(--text-secondary);">最高${item.max}期</div>
                            ${item.numbers ? `<div style="font-size: 8px; color: var(--text-secondary); margin-top: 4px;">${item.numbers}</div>` : ''}
                        </div>
                    `;
                });
            } else if (recommendations[0]?.type) {
                recommendations.forEach(item => {
                    const color = item.type === 'big' ? '#00e676' : '#00d4ff';
                    html += `
                        <div style="
                            padding: 10px;
                            background: ${item.type === 'big' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(0, 212, 255, 0.15)'};
                            border: 1px solid ${color};
                            border-radius: 8px;
                            text-align: center;
                            flex: 1;
                        ">
                            <div style="font-size: 14px; font-weight: 700; color: ${color};">${item.name}</div>
                            <div style="font-size: 20px; font-weight: 700; color: ${color}; margin: 4px 0;">${item.current}期</div>
                            <div style="font-size: 9px; color: var(--text-secondary);">当前遗漏</div>
                        </div>
                    `;
                });
            }

            html += '</div>';

            const top = recommendations[0];
            let reason = '';
            if (top?.zodiac) {
                const ratio = top.maxRecord > 0 ? Math.round(top.currentOm / top.maxRecord * 100) : 0;
                if (ratio >= 80) reason = '⚠️ 接近历史最高遗漏，回补概率高';
                else if (top.currentOm <= 3) reason = '📉 遗漏较低，即将出现';
                else reason = '📊 遗漏适中，可重点关注';
            } else if (top?.color) {
                reason = `当前遗漏 ${top.current} 期，`;
                if (top.ratio >= 0.7) reason += '接近极值，重点关注';
                else reason += '可作为配盘参考';
            }

            if (reason) {
                html += `
                    <div style="margin-top: 10px; padding: 8px; background: var(--glass); border-radius: 6px; font-size: 10px; color: var(--text-secondary); text-align: center;">
                        ${reason}
                    </div>
                `;
            }

            container.innerHTML = html;
        }

        function copyRecommendations() {
            const last = state.historyData[state.historyData.length - 1];
            const strategy = document.getElementById('recommendStrategy')?.value || 'multifactor';
            const snapshot = last?.snapshot || {};

            let text = `【澳门六合彩 智能推荐 - ${recConfig.track === 'normal' ? '平特肖尾' : strategy}】\n`;

            if (recConfig.track === 'normal') {
                const norm = getNormalTrackRecommendations(last, state.historyData);
                text += `🐾 平特生肖: ${norm.topFlatZodiacs.map(z => `${z.zodiac}(${z.hits}次)`).join(', ')}\n`;
                text += `🎯 平特尾数: ${norm.topFlatTails.map(t => t.tail).join(', ')}\n`;
                text += `🎰 平特金码: ${norm.topFlatNums.map(n => n.number).join(', ')}\n`;
            } else if (strategy === 'multifactor' || strategy === 'dan_base_kill') {
                const mf = getMultiFactorRecommendations(last, state.historyData);
                text += `⭐ 推荐Top10码: ${mf.topNumbers.map(n => n.number).join(', ')}\n`;
                text += `🐾 共振生肖: ${mf.topZodiacs.map(z => z.zodiac).join(', ')}\n`;
                if (strategy === 'dan_base_kill') {
                    const dbk = getDanBaseKillRecommendations(last, state.historyData);
                    text += `🥇 金胆: ${dbk.goldDan.map(g => g.number).join(', ')}\n`;
                    text += `🥈 银胆: ${dbk.silverDan.map(s => s.number).join(', ')}\n`;
                    text += `🚫 杀码: ${dbk.killedNumbers.map(k => k.number).join(', ')}\n`;
                }
            } else if (strategy === 'sum_span') {
                const ss = getSumSpanRecommendations(last, state.historyData);
                text += `📐 7码和值: ${ss.metrics.lastSum} (${ss.metrics.sumDesc}, 均值${ss.metrics.avgSum10}) -> 倾向: ${ss.metrics.suggestDirection}\n`;
                text += `📏 全码跨度: ${ss.metrics.lastSpan} (${ss.metrics.spanDesc}, 均值${ss.metrics.avgSpan10}) -> 间距: ${ss.metrics.spanDesc}\n`;
                text += `🚪 首号守门: ${ss.headDan.map(h => h.number).join(', ')} | 尾号守门: ${ss.tailDan.map(t => t.number).join(', ')}\n`;
                text += `⭐ 均值精选: ${ss.topNumbers.map(n => n.number).join(', ')}\n`;
                text += `🐾 共振生肖: ${ss.topZodiacs.map(z => z.zodiac).join(', ')}\n`;
            } else if (strategy === 'auto_opt') {
                const opt = getAutoOptimizedStrategy(last, state.historyData);
                text += `🏆 AI最优方案: ${opt.best.name} (${opt.best.text})\n`;
                text += `近30期胜率: ${opt.best.hitRate}%\n`;
            } else if (strategy === 'color') {
                const colorOm = last?.colorOmissions || {};
                text += `红波: ${colorOm.red || 0}期 | 蓝波: ${colorOm.blue || 0}期 | 绿波: ${colorOm.green || 0}期\n`;
            } else if (strategy === 'size') {
                const sizeOm = last?.sizeOmissions || {};
                text += `大数: ${sizeOm.big || 0}期 | 小数: ${sizeOm.small || 0}期\n`;
            } else {
                const zodiacs = CONFIG.zodiacMap[state.currentYear] || [];
                zodiacs.forEach(z => {
                    text += `${z}: ${snapshot[z] || 0}期 `;
                });
            }

            text += `\n生成时间: ${new Date().toLocaleString()}`;

            navigator.clipboard.writeText(text).then(() => {
                showNotification('推荐已复制到剪贴板');
            }).catch(() => {
                alert('复制失败，请手动复制');
            });
        }

        function showNotification(message) {
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: var(--accent);
                color: var(--bg);
                padding: 10px 20px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 600;
                z-index: 10000;
                animation: slideUp 0.3s ease;
            `;
            notification.textContent = message;
            document.body.appendChild(notification);

            setTimeout(() => {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 2000);
        }

        // ==================== 辅助计算 ====================
        function getZodiac(num) {
            const map = CONFIG.zodiacMap[state.currentYear];
            return map[(num - 1) % 12];
        }

        function getColor(numStr) {
            if (CONFIG.colors.red.includes(numStr)) return 'red';
            if (CONFIG.colors.blue.includes(numStr)) return 'blue';
            return 'green';
        }

        function getJiaYe(zodiac) {
            if (CONFIG.jiaYeMap.jia.includes(zodiac)) return 'jia';
            if (CONFIG.jiaYeMap.ye.includes(zodiac)) return 'ye';
            return 'unknown';
        }

        function getHalfWaveKey(numStr) {
            const colorNames = { red: '红', blue: '蓝', green: '绿' };
            const color = getColor(numStr);
            const parity = parseInt(numStr) % 2 === 0 ? '双' : '单';
            return `${colorNames[color]}${parity}`;
        }

        function getHalfHeadKey(num) {
            const head = Math.floor(num / 10);
            const parity = num % 2 === 0 ? '双' : '单';
            return `${head}头${parity}`;
        }

        function getSegmentKey(num) {
            const segment = Math.ceil(num / 7);
            const start = ((segment - 1) * 7 + 1).toString().padStart(2, '0');
            const end = Math.min(segment * 7, 49).toString().padStart(2, '0');
            return `${start}-${end}段`;
        }

        function getRegionKey(num) {
            const n = typeof num === 'number' ? num : parseInt(num, 10);
            if (n >= 1 && n <= 10) return '一区(01-10)';
            if (n >= 11 && n <= 20) return '二区(11-20)';
            if (n >= 21 && n <= 30) return '三区(21-30)';
            if (n >= 31 && n <= 40) return '四区(31-40)';
            if (n >= 41 && n <= 49) return '五区(41-49)';
            return '一区(01-10)';
        }

        function getRegionShortKey(num) {
            const n = typeof num === 'number' ? num : parseInt(num, 10);
            if (n >= 1 && n <= 10) return '1区';
            if (n >= 11 && n <= 20) return '2区';
            if (n >= 21 && n <= 30) return '3区';
            if (n >= 31 && n <= 40) return '4区';
            if (n >= 41 && n <= 49) return '5区';
            return '1区';
        }

        const NUMBER_TO_WUXING = {};
        Object.entries(CONFIG.wuxingMap || {
            '金': ['04', '05', '12', '13', '26', '27', '34', '35', '42', '43'],
            '木': ['08', '09', '16', '17', '24', '25', '38', '39', '46', '47'],
            '水': ['01', '14', '15', '22', '23', '30', '31', '44', '45'],
            '火': ['02', '03', '10', '11', '18', '19', '32', '33', '40', '41', '48', '49'],
            '土': ['06', '07', '20', '21', '28', '29', '36', '37']
        }).forEach(([wx, nums]) => {
            nums.forEach(n => {
                NUMBER_TO_WUXING[n] = wx;
                NUMBER_TO_WUXING[parseInt(n, 10)] = wx;
            });
        });

        function getWuxingKey(num) {
            if (num === undefined || num === null) return '未知';
            const n = typeof num === 'number' ? num.toString().padStart(2, '0') : num.toString().padStart(2, '0');
            return NUMBER_TO_WUXING[n] || '未知';
        }

        const WUXING_DS_LIST = ['金单', '木单', '水单', '火单', '土单', '金双', '木双', '水双', '火双', '土双'];

        function getWuxingDsKey(num) {
            const wx = getWuxingKey(num);
            if (wx === '未知') return '未知';
            const n = typeof num === 'number' ? num : parseInt(num, 10);
            return `${wx}${n % 2 !== 0 ? '单' : '双'}`;
        }

        function getNumHe(num) {
            const n = typeof num === 'number' ? num : parseInt(num, 10);
            return Math.floor(n / 10) + (n % 10);
        }

        function getNumHeTail(num) {
            return getNumHe(num) % 10;
        }

        function getNumTail(num) {
            const n = typeof num === 'number' ? num : parseInt(num, 10);
            return n % 10;
        }

        function isHeDan(num) {
            return getNumHe(num) % 2 !== 0;
        }

        function isHeShuang(num) {
            return getNumHe(num) % 2 === 0;
        }

        function isHeDa(num) {
            return getNumHe(num) >= 7;
        }

        function isHeXiao(num) {
            return getNumHe(num) <= 6;
        }

        function isWeiDa(num) {
            return getNumTail(num) >= 5;
        }

        function isWeiXiao(num) {
            return getNumTail(num) <= 4;
        }

        function computeMaxRiseFall(data, endIndex) {
            let maxRiseCount = 0;
            let maxFallCount = 0;
            let currentRise = 0;
            let currentFall = 0;
            let prevValue = null;

            const limit = typeof endIndex === 'number' ? Math.min(endIndex + 1, data.length) : data.length;
            for (let index = 0; index < limit; index++) {
                const item = data[index];
                const value = typeof item.displayScore === 'number' ? item.displayScore : item.score;
                if (index === 0) {
                    prevValue = value;
                    continue;
                }

                if (value > prevValue) {
                    currentRise += 1;
                    currentFall = 0;
                } else if (value < prevValue) {
                    currentFall += 1;
                    currentRise = 0;
                } else {
                    currentRise = 0;
                    currentFall = 0;
                }

                maxRiseCount = Math.max(maxRiseCount, currentRise);
                maxFallCount = Math.max(maxFallCount, currentFall);
                prevValue = value;
            }

            return { maxRiseCount, maxFallCount, currentRise, currentFall };
        }

        function getEffectiveColdWindow() {
            const sel = document.getElementById('coldCalcWindowSel');
            if (!sel || sel.value === 'auto') {
                const pageSizeSel = document.getElementById('pageSizeSel');
                if (!pageSizeSel) return 50;
                return pageSizeSel.value === 'all' ? Infinity : (parseInt(pageSizeSel.value, 10) || 50);
            }
            return sel.value === 'all' ? Infinity : (parseInt(sel.value, 10) || 50);
        }

        function updateColdCalcWindowUI() {
            const sel = document.getElementById('coldCalcWindowSel');
            const badge = document.getElementById('coldCalcWindowBadge');
            const tagHot = document.getElementById('factorWindowTag_hotcold');
            const tagOm = document.getElementById('factorWindowTag_omission');
            
            const pageSizeSel = document.getElementById('pageSizeSel');
            const autoCount = pageSizeSel ? (pageSizeSel.value === 'all' ? '全部' : pageSizeSel.value) : '50';
            
            if (sel) {
                const autoOpt = sel.querySelector('option[value="auto"]');
                if (autoOpt) {
                    autoOpt.textContent = `🔗 跟随主图期数 (当前${autoCount}期)`;
                }
            }

            const win = getEffectiveColdWindow();
            const totalLen = state.historyData ? state.historyData.length : 0;
            const actualCount = win === Infinity ? totalLen : Math.min(win, totalLen);
            const txt = `基于最近 ${actualCount} 期样本`;

            if (badge) badge.textContent = txt;
            if (tagHot) tagHot.textContent = `(${txt})`;
            if (tagOm) tagOm.textContent = `(${txt})`;
        }

        function onColdCalcWindowChange(val) {
            state.coldCalcWindow = val;
            updateColdCalcWindowUI();
            updateAllDualSliders();
            updateLiveSelectionPreview();
            updateStats();
            if (state.currentMode === 'cold_custom' && state.coldSelection) {
                recalcData();
            }
        }

        function getSelectedColdSourceData() {
            const win = getEffectiveColdWindow();
            const totalLen = state.historyData ? state.historyData.length : 0;
            const count = win === Infinity ? totalLen : Math.min(win, totalLen);
            return state.historyData.slice(-count);
        }

        function getRollingColdSourceData(historyData, currentIndex) {
            const win = getEffectiveColdWindow();
            const count = win === Infinity ? currentIndex : Math.min(win, currentIndex);
            return historyData.slice(Math.max(0, currentIndex - count), currentIndex);
        }

        function getCurrentColdSourceData(historyData) {
            const win = getEffectiveColdWindow();
            const totalLen = historyData ? historyData.length : 0;
            const count = win === Infinity ? totalLen : Math.min(win, totalLen);
            return historyData.slice(-count);
        }

        // 冷热统计跟随设置的统计窗口（默认跟随右上角选择的期数）
        function getSelectedHotColdSourceData() {
            const win = getEffectiveColdWindow();
            const totalLen = state.historyData ? state.historyData.length : 0;
            const count = win === Infinity ? totalLen : Math.min(win, totalLen);
            return state.historyData.slice(-count);
        }

        function getRollingHotColdSourceData(historyData, currentIndex) {
            const win = getEffectiveColdWindow();
            const count = win === Infinity ? currentIndex : Math.min(win, currentIndex);
            return historyData.slice(Math.max(0, currentIndex - count), currentIndex);
        }

        function getCurrentHotColdSourceData(historyData) {
            const win = getEffectiveColdWindow();
            const totalLen = historyData ? historyData.length : 0;
            const count = win === Infinity ? totalLen : Math.min(win, totalLen);
            return historyData.slice(-count);
        }

        function calculateOmissionCounts(keys, matchFn, sourceData = state.historyData) {
            const counts = {};
            keys.forEach(k => counts[k] = 0);
            const seen = {};
            keys.forEach(k => seen[k] = false);

            for (let i = sourceData.length - 1; i >= 0; i--) {
                const item = sourceData[i];
                const matched = matchFn(item);
                keys.forEach(key => {
                    if (seen[key]) return;
                    const hit = Array.isArray(matched) ? matched.includes(key) : matched === key;
                    if (hit) {
                        seen[key] = true;
                    } else {
                        counts[key]++;
                    }
                });
            }

            return counts;
        }

        function calculateFrequencyCounts(keys, matchFn, sourceData = state.historyData) {
            const counts = {};
            keys.forEach(k => counts[k] = 0);

            sourceData.forEach(item => {
                const matched = matchFn(item);
                keys.forEach(key => {
                    if (Array.isArray(matched)) {
                        counts[key] += matched.filter(value => value === key).length;
                    } else if (matched === key) {
                        counts[key]++;
                    }
                });
            });

            return counts;
        }

        function getCold10Numbers(sourceData, count = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateOmissionCounts(keys, item => item.winNum.toString().padStart(2, '0'), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count).map(item => item[0]);
        }

        function getCold3Zodiacs(sourceData, count = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateOmissionCounts(keys, item => item.win, sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getHot10Numbers(sourceData, count = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateFrequencyCounts(keys, item => getAllDrawNumbers(item), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count).map(item => item[0]);
        }

        function getCold10NumbersByFrequency(sourceData, count = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateFrequencyCounts(keys, item => getAllDrawNumbers(item), sourceData);
            return Object.entries(counts).sort((a, b) => a[1] - b[1] || b[0].localeCompare(a[0])).slice(0, count).map(item => item[0]);
        }

        
        function getHot3Zodiacs(sourceData, count = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateFrequencyCounts(keys, item => getAllDrawZodiacs(item), sourceData);
            return Object.entries(counts)
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, count)
                .map(item => item[0]);
        }
        function getCold3ZodiacsByFrequency(sourceData, count = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateFrequencyCounts(keys, item => getAllDrawZodiacs(item), sourceData);
            return Object.entries(counts)
                .sort((a, b) => a[1] - b[1] || b[0].localeCompare(a[0]))
                .slice(0, count)
                .map(item => item[0]);
        }

        function getAllDrawNumbers(item) {
            return (item.codes || []).map(c => c.num.toString().padStart(2, '0'));
        }

        function getPingXiaoNumbers(item) {
            return (item.codes || []).slice(0, 6).map(c => c.num.toString().padStart(2, '0'));
        }

        function getAllDrawZodiacs(item) {
            const ping = item.pingXiao ? item.pingXiao.split(/\s+/).filter(Boolean) : [];
            return [...ping, item.win].filter(Boolean);
        }

        function getPingXiaoZodiacs(item) {
            return item.pingXiao ? item.pingXiao.split(/\s+/).filter(Boolean) : [];
        }

        function getAllHot10Numbers(sourceData, count = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateFrequencyCounts(keys, item => item.winNum.toString().padStart(2, '0'), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, count).map(item => item[0]);
        }

        function getAllCold10Numbers(sourceData, count = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateFrequencyCounts(keys, item => item.winNum.toString().padStart(2, '0'), sourceData);
            return Object.entries(counts).sort((a, b) => a[1] - b[1] || b[0].localeCompare(a[0])).slice(0, count).map(item => item[0]);
        }

        function getAllHot3Zodiacs(sourceData, count = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateFrequencyCounts(keys, item => item.win, sourceData);
            return Object.entries(counts)
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .slice(0, count)
                .map(item => item[0]);
        }

        function getAllCold3Zodiacs(sourceData, count = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateFrequencyCounts(keys, item => item.win, sourceData);
            return Object.entries(counts)
                .sort((a, b) => a[1] - b[1] || b[0].localeCompare(a[0]))
                .slice(0, count)
                .map(item => item[0]);
        }

        function getColdWave(sourceData) {
            const keys = ['red', 'blue', 'green'];
            const counts = calculateOmissionCounts(keys, item => getColor(item.winNum.toString().padStart(2, '0')), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 1).map(item => item[0]);
        }

        function getColdHalfWave(sourceData, count = 1) {
            const keys = ['红单', '红双', '蓝单', '蓝双', '绿单', '绿双'];
            const counts = calculateOmissionCounts(keys, item => getHalfWaveKey(item.winNum.toString().padStart(2, '0')), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getColdJiaYe(sourceData, count = 1) {
            const keys = ['jia', 'ye'];
            const counts = calculateOmissionCounts(keys, item => getJiaYe(item.win), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getColdHeadGroup(sourceData, count = 1) {
            const keys = ['0头', '1头', '2头', '3头', '4头'];
            const counts = calculateOmissionCounts(keys, item => `${Math.floor(item.winNum / 10)}头`, sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getColdTail2(sourceData, count = 2) {
            const keys = Array.from({ length: 10 }, (_, i) => `${i}尾`);
            const counts = calculateOmissionCounts(keys, item => `${item.winNum % 10}尾`, sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getColdSegment(sourceData, count = 1) {
            const keys = Array.from({ length: 7 }, (_, i) => {
                const start = (i * 7 + 1).toString().padStart(2, '0');
                const end = Math.min((i + 1) * 7, 49).toString().padStart(2, '0');
                return `${start}-${end}段`;
            });
            const counts = calculateOmissionCounts(keys, item => getSegmentKey(item.winNum), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getColdWuxing(sourceData, count = 1) {
            const keys = ['金', '木', '水', '火', '土'];
            const counts = calculateOmissionCounts(keys, item => getWuxingKey(item.winNum), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getColdHalfHead(sourceData, count = 1) {
            const keys = [];
            for (let head = 0; head <= 4; head++) {
                ['单', '双'].forEach(parity => keys.push(`${head}头${parity}`));
            }
            const counts = calculateOmissionCounts(keys, item => getHalfHeadKey(item.winNum), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getColdRegion(sourceData, count = 1) {
            const keys = ['一区(01-10)', '二区(11-20)', '三区(21-30)', '四区(31-40)', '五区(41-49)'];
            const counts = calculateOmissionCounts(keys, item => getRegionKey(item.winNum), sourceData);
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, count).map(item => item[0]);
        }

        function getColdOmissionRangeNumbers(sourceData, startRank = 1, endRank = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateOmissionCounts(keys, item => item.winNum.toString().padStart(2, '0'), sourceData);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(item => item[0]);
            const s = Math.max(1, Math.min(49, Math.min(startRank, endRank)));
            const e = Math.max(1, Math.min(49, Math.max(startRank, endRank)));
            return sorted.slice(s - 1, e);
        }

        function getPingOmissionRangeNumbers(sourceData, startRank = 1, endRank = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateOmissionCounts(keys, item => getAllDrawNumbers(item), sourceData);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(item => item[0]);
            const s = Math.max(1, Math.min(49, Math.min(startRank, endRank)));
            const e = Math.max(1, Math.min(49, Math.max(startRank, endRank)));
            return sorted.slice(s - 1, e);
        }

        function getPingOmissionRangeZodiacs(sourceData, startRank = 1, endRank = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateOmissionCounts(keys, item => getAllDrawZodiacs(item), sourceData);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(item => item[0]);
            const s = Math.max(1, Math.min(12, Math.min(startRank, endRank)));
            const e = Math.max(1, Math.min(12, Math.max(startRank, endRank)));
            return sorted.slice(s - 1, e);
        }

        function getColdOmissionRangeZodiacs(sourceData, startRank = 1, endRank = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateOmissionCounts(keys, item => item.win, sourceData);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(item => item[0]);
            const s = Math.max(1, Math.min(12, Math.min(startRank, endRank)));
            const e = Math.max(1, Math.min(12, Math.max(startRank, endRank)));
            return sorted.slice(s - 1, e);
        }

        function getHotNumberRange(sourceData, startRank = 1, endRank = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateFrequencyCounts(keys, item => getAllDrawNumbers(item), sourceData);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(item => item[0]);
            const s = Math.max(1, Math.min(49, Math.min(startRank, endRank)));
            const e = Math.max(1, Math.min(49, Math.max(startRank, endRank)));
            return sorted.slice(s - 1, e);
        }

        function getAllHotNumberRange(sourceData, startRank = 1, endRank = 10) {
            const keys = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const counts = calculateFrequencyCounts(keys, item => item.winNum.toString().padStart(2, '0'), sourceData);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(item => item[0]);
            const s = Math.max(1, Math.min(49, Math.min(startRank, endRank)));
            const e = Math.max(1, Math.min(49, Math.max(startRank, endRank)));
            return sorted.slice(s - 1, e);
        }

        function getHotZodiacRange(sourceData, startRank = 1, endRank = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateFrequencyCounts(keys, item => getAllDrawZodiacs(item), sourceData);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(item => item[0]);
            const s = Math.max(1, Math.min(12, Math.min(startRank, endRank)));
            const e = Math.max(1, Math.min(12, Math.max(startRank, endRank)));
            return sorted.slice(s - 1, e);
        }

        function getAllHotZodiacRange(sourceData, startRank = 1, endRank = 3) {
            const keys = CONFIG.zodiacMap[state.currentYear];
            const counts = calculateFrequencyCounts(keys, item => item.win, sourceData);
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(item => item[0]);
            const s = Math.max(1, Math.min(12, Math.min(startRank, endRank)));
            const e = Math.max(1, Math.min(12, Math.max(startRank, endRank)));
            return sorted.slice(s - 1, e);
        }

        function countColdConditionMatches(cold, rollingColdSets, ctx) {
            const { numStr, winZ, winNum, color, headKey, tailKey, halfWaveKey, halfHeadKey, segment, regionKey, regionShort, jiaYe } = ctx;
            const wuxingKey = ctx.wuxingKey || getWuxingKey(winNum);
            const wuxingDsKey = ctx.wuxingDsKey || getWuxingDsKey(winNum);
            let matches = 0;
            if (cold.types.includes('numbers') && rollingColdSets.numbers.includes(numStr)) matches++;
            if (cold.types.includes('zodiacs') && rollingColdSets.zodiacs.includes(winZ)) matches++;
            if (cold.types.includes('hotNumbers') && rollingColdSets.hotNumbers.includes(numStr)) matches++;
            if (cold.types.includes('coldNumbers') && rollingColdSets.coldNumbers.includes(numStr)) matches++;
            if (cold.types.includes('hotZodiacs') && rollingColdSets.hotZodiacs.includes(winZ)) matches++;
            if (cold.types.includes('coldZodiacs') && rollingColdSets.coldZodiacs.includes(winZ)) matches++;
            if (cold.types.includes('allHotNumbers') && rollingColdSets.allHotNumbers.includes(numStr)) matches++;
            if (cold.types.includes('allColdNumbers') && rollingColdSets.allColdNumbers.includes(numStr)) matches++;
            if (cold.types.includes('allHotZodiacs') && rollingColdSets.allHotZodiacs.includes(winZ)) matches++;
            if (cold.types.includes('allColdZodiacs') && rollingColdSets.allColdZodiacs.includes(winZ)) matches++;
            if (cold.types.includes('hotNumberRange') && rollingColdSets.hotNumberRange && rollingColdSets.hotNumberRange.includes(numStr)) matches++;
            if (cold.types.includes('allHotNumberRange') && rollingColdSets.allHotNumberRange && rollingColdSets.allHotNumberRange.includes(numStr)) matches++;
            if (cold.types.includes('hotZodiacRange') && rollingColdSets.hotZodiacRange && rollingColdSets.hotZodiacRange.includes(winZ)) matches++;
            if (cold.types.includes('allHotZodiacRange') && rollingColdSets.allHotZodiacRange && rollingColdSets.allHotZodiacRange.includes(winZ)) matches++;
            if (cold.types.includes('selectZodiacs') && cold.selectedZodiacs && cold.selectedZodiacs.includes(winZ)) matches++;
            if (cold.types.includes('selectedWaves') && cold.selectedWaves && cold.selectedWaves.includes(color)) matches++;
            if (cold.types.includes('selectedWuxings') && cold.selectedWuxings && cold.selectedWuxings.includes(wuxingKey)) matches++;
            if (cold.types.includes('selectedWuxingDs') && cold.selectedWuxingDs && cold.selectedWuxingDs.includes(wuxingDsKey)) matches++;
            if (cold.types.includes('selectedRegions') && cold.selectedRegions && (cold.selectedRegions.includes(regionKey) || cold.selectedRegions.includes(regionShort))) matches++;
            if (cold.types.includes('selectedMorphs') && cold.selectedMorphs && cold.selectedMorphs.length) {
                const mDanShuang = cold.selectedMorphs.filter(m => m === 'heDan' || m === 'heShuang');
                const mDaXiao = cold.selectedMorphs.filter(m => m === 'heDa' || m === 'heXiao');
                const mWeiDaXiao = cold.selectedMorphs.filter(m => m === 'weiDa' || m === 'weiXiao');
                let morphMatch = false;
                if (mDanShuang.length && ((mDanShuang.includes('heDan') && isHeDan(winNum)) || (mDanShuang.includes('heShuang') && isHeShuang(winNum)))) morphMatch = true;
                if (mDaXiao.length && ((mDaXiao.includes('heDa') && isHeDa(winNum)) || (mDaXiao.includes('heXiao') && isHeXiao(winNum)))) morphMatch = true;
                if (mWeiDaXiao.length && ((mWeiDaXiao.includes('weiDa') && isWeiDa(winNum)) || (mWeiDaXiao.includes('weiXiao') && isWeiXiao(winNum)))) morphMatch = true;
                if (morphMatch) matches++;
            }
            if (cold.types.includes('selectedHeNumbers') && cold.selectedHeNumbers && cold.selectedHeNumbers.includes(getNumHe(winNum))) matches++;
            if (cold.types.includes('selectedHeTails') && cold.selectedHeTails && cold.selectedHeTails.includes(getNumHeTail(winNum))) matches++;
            if (cold.types.includes('selectedHeads') && cold.selectedHeads && cold.selectedHeads.length) {
                const h = Math.floor(winNum / 10);
                if (cold.selectedHeads.includes(h) || cold.selectedHeads.includes(String(h)) || cold.selectedHeads.includes(`${h}头`)) matches++;
            }
            if (cold.types.includes('selectedTails') && cold.selectedTails && cold.selectedTails.length) {
                const t = winNum % 10;
                if (cold.selectedTails.includes(t) || cold.selectedTails.includes(String(t)) || cold.selectedTails.includes(`${t}尾`)) matches++;
            }
            if (cold.types.includes('omissionRange') && rollingColdSets.omissionRange && rollingColdSets.omissionRange.includes(numStr)) matches++;
            if (cold.types.includes('omissionZodiacRange') && rollingColdSets.omissionZodiacRange && rollingColdSets.omissionZodiacRange.includes(winZ)) matches++;
            if (cold.types.includes('pingOmissionRange') && rollingColdSets.pingOmissionRange && rollingColdSets.pingOmissionRange.includes(numStr)) matches++;
            if (cold.types.includes('pingOmissionZodiacRange') && rollingColdSets.pingOmissionZodiacRange && rollingColdSets.pingOmissionZodiacRange.includes(winZ)) matches++;
            if (cold.types.includes('inputNumbers')) {
                const t = cold.inputTerms || { numbers: cold.selectedNumbers || [] };
                if (
                    t.numbers.includes(numStr) ||
                    t.zodiacs.includes(winZ) ||
                    (t.wuxings && t.wuxings.includes(wuxingKey)) ||
                    (t.wuxingDs && t.wuxingDs.includes(wuxingDsKey)) ||
                    t.tails.includes(winNum % 10) ||
                    t.heads.includes(Math.floor(winNum / 10)) ||
                    t.waves.includes(color) ||
                    t.segments.includes(Math.ceil(winNum / 7)) ||
                    (t.regions && t.regions.includes(regionShort)) ||
                    (t.morphs && t.morphs.some(m => {
                        if (m === 'heDan') return isHeDan(winNum);
                        if (m === 'heShuang') return isHeShuang(winNum);
                        if (m === 'heDa') return isHeDa(winNum);
                        if (m === 'heXiao') return isHeXiao(winNum);
                        if (m === 'weiDa') return isWeiDa(winNum);
                        if (m === 'weiXiao') return isWeiXiao(winNum);
                        return false;
                    })) ||
                    (t.heNumbers && t.heNumbers.includes(getNumHe(winNum))) ||
                    (t.heTails && t.heTails.includes(getNumHeTail(winNum))) ||
                    (rollingColdSets.inputOmissionRangeNumbers && rollingColdSets.inputOmissionRangeNumbers.includes(numStr)) ||
                    (rollingColdSets.inputOmissionZodiacRangeZodiacs && rollingColdSets.inputOmissionZodiacRangeZodiacs.includes(winZ)) ||
                    (rollingColdSets.inputPingOmissionRangeNumbers && rollingColdSets.inputPingOmissionRangeNumbers.includes(numStr)) ||
                    (rollingColdSets.inputPingOmissionZodiacRangeZodiacs && rollingColdSets.inputPingOmissionZodiacRangeZodiacs.includes(winZ)) ||
                    (rollingColdSets.inputHotNumberRangeNumbers && rollingColdSets.inputHotNumberRangeNumbers.includes(numStr)) ||
                    (rollingColdSets.inputAllHotNumberRangeNumbers && rollingColdSets.inputAllHotNumberRangeNumbers.includes(numStr)) ||
                    (rollingColdSets.inputHotZodiacRangeZodiacs && rollingColdSets.inputHotZodiacRangeZodiacs.includes(winZ)) ||
                    (rollingColdSets.inputAllHotZodiacRangeZodiacs && rollingColdSets.inputAllHotZodiacRangeZodiacs.includes(winZ))
                ) matches++;
            }
            if (cold.types.includes('wave') && rollingColdSets.wave.includes(color)) matches++;
            if (cold.types.includes('halfwave') && rollingColdSets.halfwave.includes(halfWaveKey)) matches++;
            if (cold.types.includes('jiaYe') && rollingColdSets.jiaYe.includes(jiaYe)) matches++;
            if (cold.types.includes('head') && rollingColdSets.head.includes(headKey)) matches++;
            if (cold.types.includes('tail') && rollingColdSets.tail.includes(tailKey)) matches++;
            if (cold.types.includes('wuxing') && rollingColdSets.wuxing.includes(segment)) matches++;
            if (cold.types.includes('wuxingCold') && rollingColdSets.wuxingCold && rollingColdSets.wuxingCold.includes(wuxingKey)) matches++;
            if (cold.types.includes('halfHead') && rollingColdSets.halfHead.includes(halfHeadKey)) matches++;
            if (cold.types.includes('region') && rollingColdSets.region && rollingColdSets.region.includes(regionKey)) matches++;
            return matches;
        }

        function calculateColdSets(types, omissionSourceData = state.historyData, counts = {}, hotColdSourceData = omissionSourceData) {
            const defaultCounts = { zodiacs: 3, numbers: 10, hotNumbers: 10, coldNumbers: 10, allHotNumbers: 10, allColdNumbers: 10, region: 1, ...counts };
            const sets = {};
            if (types.includes('numbers')) sets.numbers = getCold10Numbers(omissionSourceData, defaultCounts.numbers);
            if (types.includes('zodiacs')) sets.zodiacs = getCold3Zodiacs(omissionSourceData, defaultCounts.zodiacs);
            if (types.includes('hotNumbers')) sets.hotNumbers = getHot10Numbers(hotColdSourceData, defaultCounts.hotNumbers);
            if (types.includes('coldNumbers')) sets.coldNumbers = getCold10NumbersByFrequency(hotColdSourceData, defaultCounts.coldNumbers);
            if (types.includes('hotZodiacs')) sets.hotZodiacs = getHot3Zodiacs(hotColdSourceData, counts.hotZodiacs || 3);
            if (types.includes('coldZodiacs')) sets.coldZodiacs = getCold3ZodiacsByFrequency(hotColdSourceData, counts.coldZodiacs || 3);
            if (types.includes('allHotNumbers')) sets.allHotNumbers = getAllHot10Numbers(hotColdSourceData, defaultCounts.allHotNumbers);
            if (types.includes('allColdNumbers')) sets.allColdNumbers = getAllCold10Numbers(hotColdSourceData, defaultCounts.allColdNumbers);
            if (types.includes('allHotZodiacs')) sets.allHotZodiacs = getAllHot3Zodiacs(hotColdSourceData, counts.allHotZodiacs || 3);
            if (types.includes('allColdZodiacs')) sets.allColdZodiacs = getAllCold3Zodiacs(hotColdSourceData, counts.allColdZodiacs || 3);
            if (types.includes('wave')) sets.wave = getColdWave(omissionSourceData);
            if (types.includes('halfwave')) sets.halfwave = getColdHalfWave(omissionSourceData, counts.halfwave || 1);
            if (types.includes('jiaYe')) sets.jiaYe = getColdJiaYe(omissionSourceData);
            if (types.includes('head')) sets.head = getColdHeadGroup(omissionSourceData, counts.head || 1);
            if (types.includes('tail')) sets.tail = getColdTail2(omissionSourceData, counts.tail || 2);
            if (types.includes('wuxing')) sets.wuxing = getColdSegment(omissionSourceData, counts.wuxing || 1);
            if (types.includes('wuxingCold')) sets.wuxingCold = getColdWuxing(omissionSourceData, counts.wuxingCold || 1);
            if (types.includes('halfHead')) sets.halfHead = getColdHalfHead(omissionSourceData, counts.halfHead || 1);
            if (types.includes('region')) sets.region = getColdRegion(omissionSourceData, counts.region || 1);
            const resolveRangeItems = (rangeKey, getter, source) => {
                const segs = counts[`${rangeKey}Segments`];
                if (segs && segs.length > 0) {
                    const itemSet = new Set();
                    segs.forEach(seg => {
                        const s = seg.start !== undefined ? seg.start : 1;
                        const defaultEnd = (DUAL_RANGE_CONFIGS[rangeKey]?.max) || (rangeKey.includes('Zodiac') ? 3 : 10);
                        const e = seg.end !== undefined ? seg.end : defaultEnd;
                        getter(source, s, e).forEach(item => itemSet.add(item));
                    });
                    return Array.from(itemSet);
                } else {
                    const s = counts[`${rangeKey}Start`] !== undefined ? counts[`${rangeKey}Start`] : 1;
                    const defaultEnd = (DUAL_RANGE_CONFIGS[rangeKey]?.max) || (rangeKey.includes('Zodiac') ? 3 : 10);
                    const e = counts[`${rangeKey}End`] !== undefined ? counts[`${rangeKey}End`] : defaultEnd;
                    return getter(source, s, e);
                }
            };

            if (types.includes('omissionRange')) {
                sets.omissionRange = resolveRangeItems('omissionRange', getColdOmissionRangeNumbers, omissionSourceData);
            }
            if (types.includes('omissionZodiacRange')) {
                sets.omissionZodiacRange = resolveRangeItems('omissionZodiacRange', getColdOmissionRangeZodiacs, omissionSourceData);
            }
            if (types.includes('pingOmissionRange')) {
                sets.pingOmissionRange = resolveRangeItems('pingOmissionRange', getPingOmissionRangeNumbers, omissionSourceData);
            }
            if (types.includes('pingOmissionZodiacRange')) {
                sets.pingOmissionZodiacRange = resolveRangeItems('pingOmissionZodiacRange', getPingOmissionRangeZodiacs, omissionSourceData);
            }
            if (types.includes('hotNumberRange')) {
                sets.hotNumberRange = resolveRangeItems('hotNumberRange', getHotNumberRange, hotColdSourceData);
            }
            if (types.includes('allHotNumberRange')) {
                sets.allHotNumberRange = resolveRangeItems('allHotNumberRange', getAllHotNumberRange, hotColdSourceData);
            }
            if (types.includes('hotZodiacRange')) {
                sets.hotZodiacRange = resolveRangeItems('hotZodiacRange', getHotZodiacRange, hotColdSourceData);
            }
            if (types.includes('allHotZodiacRange')) {
                sets.allHotZodiacRange = resolveRangeItems('allHotZodiacRange', getAllHotZodiacRange, hotColdSourceData);
            }
            if (types.includes('inputNumbers') && counts.inputTerms) {
                if (counts.inputTerms.omissionRanges) {
                    sets.inputOmissionRangeNumbers = [];
                    counts.inputTerms.omissionRanges.forEach(r => {
                        sets.inputOmissionRangeNumbers.push(...getColdOmissionRangeNumbers(omissionSourceData, r.start, r.end));
                    });
                }
                if (counts.inputTerms.pingOmissionRanges) {
                    sets.inputPingOmissionRangeNumbers = [];
                    counts.inputTerms.pingOmissionRanges.forEach(r => {
                        sets.inputPingOmissionRangeNumbers.push(...getPingOmissionRangeNumbers(omissionSourceData, r.start, r.end));
                    });
                }
                if (counts.inputTerms.pingOmissionZodiacRanges) {
                    sets.inputPingOmissionZodiacRangeZodiacs = [];
                    counts.inputTerms.pingOmissionZodiacRanges.forEach(r => {
                        sets.inputPingOmissionZodiacRangeZodiacs.push(...getPingOmissionRangeZodiacs(omissionSourceData, r.start, r.end));
                    });
                }
                if (counts.inputTerms.omissionZodiacRanges) {
                    sets.inputOmissionZodiacRangeZodiacs = [];
                    counts.inputTerms.omissionZodiacRanges.forEach(r => {
                        sets.inputOmissionZodiacRangeZodiacs.push(...getColdOmissionRangeZodiacs(omissionSourceData, r.start, r.end));
                    });
                }
                if (counts.inputTerms.hotNumberRanges) {
                    sets.inputHotNumberRangeNumbers = [];
                    counts.inputTerms.hotNumberRanges.forEach(r => {
                        sets.inputHotNumberRangeNumbers.push(...getHotNumberRange(hotColdSourceData, r.start, r.end));
                    });
                }
                if (counts.inputTerms.allHotNumberRanges) {
                    sets.inputAllHotNumberRangeNumbers = [];
                    counts.inputTerms.allHotNumberRanges.forEach(r => {
                        sets.inputAllHotNumberRangeNumbers.push(...getAllHotNumberRange(hotColdSourceData, r.start, r.end));
                    });
                }
                if (counts.inputTerms.hotZodiacRanges) {
                    sets.inputHotZodiacRangeZodiacs = [];
                    counts.inputTerms.hotZodiacRanges.forEach(r => {
                        sets.inputHotZodiacRangeZodiacs.push(...getHotZodiacRange(hotColdSourceData, r.start, r.end));
                    });
                }
                if (counts.inputTerms.allHotZodiacRanges) {
                    sets.inputAllHotZodiacRangeZodiacs = [];
                    counts.inputTerms.allHotZodiacRanges.forEach(r => {
                        sets.inputAllHotZodiacRangeZodiacs.push(...getAllHotZodiacRange(hotColdSourceData, r.start, r.end));
                    });
                }
            }
            return sets;
        }

        function updateColdSummary() {
            const summary = document.getElementById('coldSelectionSummary');
            if (!state.coldSelection) {
                if (summary) summary.textContent = '请选择特码综合K线选项后点击生成';
                return;
            }

            const sets = state.coldSelection.sets;
            const allNumbers = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const numberUnion = new Set();

            const addNumber = num => numberUnion.add(num.toString().padStart(2, '0'));
            const addNumbersByFilter = filterFn => allNumbers.forEach(num => {
                if (filterFn(num)) addNumber(num);
            });

            if (sets.numbers) sets.numbers.forEach(addNumber);
            if (sets.hotNumbers) sets.hotNumbers.forEach(addNumber);
            if (sets.coldNumbers) sets.coldNumbers.forEach(addNumber);
            if (sets.allHotNumbers) sets.allHotNumbers.forEach(addNumber);
            if (sets.allColdNumbers) sets.allColdNumbers.forEach(addNumber);
            if (sets.hotNumberRange) sets.hotNumberRange.forEach(addNumber);
            if (sets.allHotNumberRange) sets.allHotNumberRange.forEach(addNumber);

            if (sets.zodiacs) sets.zodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.hotZodiacs) sets.hotZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.coldZodiacs) sets.coldZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.allHotZodiacs) sets.allHotZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.allColdZodiacs) sets.allColdZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.hotZodiacRange) sets.hotZodiacRange.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.allHotZodiacRange) sets.allHotZodiacRange.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.selectZodiacs) sets.selectZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.selectedWaves) sets.selectedWaves.forEach(wave => addNumbersByFilter(num => getColor(num) === wave));
            if (sets.selectedWuxings) sets.selectedWuxings.forEach(wx => addNumbersByFilter(num => getWuxingKey(num) === wx));
            if (sets.selectedWuxingDs) sets.selectedWuxingDs.forEach(wxds => addNumbersByFilter(num => getWuxingDsKey(num) === wxds));
            if (sets.selectedRegions) sets.selectedRegions.forEach(reg => addNumbersByFilter(num => getRegionKey(parseInt(num, 10)) === reg || getRegionShortKey(parseInt(num, 10)) === reg));
            if (sets.selectedMorphs) {
                sets.selectedMorphs.forEach(m => {
                    if (m === 'heDan') addNumbersByFilter(num => isHeDan(num));
                    if (m === 'heShuang') addNumbersByFilter(num => isHeShuang(num));
                    if (m === 'heDa') addNumbersByFilter(num => isHeDa(num));
                    if (m === 'heXiao') addNumbersByFilter(num => isHeXiao(num));
                    if (m === 'weiDa') addNumbersByFilter(num => isWeiDa(num));
                    if (m === 'weiXiao') addNumbersByFilter(num => isWeiXiao(num));
                });
            }
            if (sets.selectedHeNumbers) {
                sets.selectedHeNumbers.forEach(h => addNumbersByFilter(num => getNumHe(num) === h));
            }
            if (sets.selectedHeTails) {
                sets.selectedHeTails.forEach(ht => addNumbersByFilter(num => getNumHeTail(num) === ht));
            }
            if (sets.selectedHeads) {
                sets.selectedHeads.forEach(h => addNumbersByFilter(num => Math.floor(parseInt(num, 10) / 10) === parseInt(h, 10)));
            }
            if (sets.selectedTails) {
                sets.selectedTails.forEach(t => addNumbersByFilter(num => parseInt(num, 10) % 10 === parseInt(t, 10)));
            }

            if (sets.wave) sets.wave.forEach(wave => addNumbersByFilter(num => getColor(num) === wave));
            if (sets.halfwave) sets.halfwave.forEach(half => addNumbersByFilter(num => getHalfWaveKey(num) === half));
            if (sets.jiaYe) sets.jiaYe.forEach(type => addNumbersByFilter(num => getJiaYe(getZodiac(parseInt(num, 10))) === type));
            if (sets.head) sets.head.forEach(head => addNumbersByFilter(num => `${Math.floor(parseInt(num, 10) / 10)}头` === head));
            if (sets.tail) sets.tail.forEach(tail => addNumbersByFilter(num => `${parseInt(num, 10) % 10}尾` === tail));
            if (sets.wuxing) sets.wuxing.forEach(segment => addNumbersByFilter(num => getSegmentKey(parseInt(num, 10)) === segment));
            if (sets.wuxingCold) sets.wuxingCold.forEach(wx => addNumbersByFilter(num => getWuxingKey(num) === wx));
            if (sets.halfHead) sets.halfHead.forEach(key => addNumbersByFilter(num => getHalfHeadKey(parseInt(num, 10)) === key));
            if (sets.region) sets.region.forEach(key => addNumbersByFilter(num => getRegionKey(parseInt(num, 10)) === key));
            if (sets.omissionRange) sets.omissionRange.forEach(addNumber);
            if (sets.omissionZodiacRange) sets.omissionZodiacRange.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.pingOmissionRange) sets.pingOmissionRange.forEach(addNumber);
            if (sets.pingOmissionZodiacRange) sets.pingOmissionZodiacRange.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            if (sets.inputTerms) {
                const it = sets.inputTerms;
                it.numbers.forEach(addNumber);
                it.zodiacs.forEach(z => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === z));
                it.tails.forEach(t => addNumbersByFilter(num => parseInt(num, 10) % 10 === t));
                it.heads.forEach(h => addNumbersByFilter(num => Math.floor(parseInt(num, 10) / 10) === h));
                it.waves.forEach(w => addNumbersByFilter(num => getColor(num) === w));
                if (it.wuxings) it.wuxings.forEach(wx => addNumbersByFilter(num => getWuxingKey(num) === wx));
                if (it.wuxingDs) it.wuxingDs.forEach(wxds => addNumbersByFilter(num => getWuxingDsKey(num) === wxds));
                it.segments.forEach(s => addNumbersByFilter(num => Math.ceil(parseInt(num, 10) / 7) === s));
                if (it.regions) it.regions.forEach(r => addNumbersByFilter(num => getRegionShortKey(parseInt(num, 10)) === r));
                if (it.morphs) it.morphs.forEach(m => {
                    if (m === 'heDan') addNumbersByFilter(num => isHeDan(num));
                    if (m === 'heShuang') addNumbersByFilter(num => isHeShuang(num));
                    if (m === 'heDa') addNumbersByFilter(num => isHeDa(num));
                    if (m === 'heXiao') addNumbersByFilter(num => isHeXiao(num));
                    if (m === 'weiDa') addNumbersByFilter(num => isWeiDa(num));
                    if (m === 'weiXiao') addNumbersByFilter(num => isWeiXiao(num));
                });
                if (it.heNumbers) it.heNumbers.forEach(h => addNumbersByFilter(num => getNumHe(num) === h));
                if (it.heTails) it.heTails.forEach(ht => addNumbersByFilter(num => getNumHeTail(num) === ht));
                if (sets.inputOmissionRangeNumbers) sets.inputOmissionRangeNumbers.forEach(addNumber);
                if (sets.inputOmissionZodiacRangeZodiacs) sets.inputOmissionZodiacRangeZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
                if (sets.inputPingOmissionRangeNumbers) sets.inputPingOmissionRangeNumbers.forEach(addNumber);
                if (sets.inputPingOmissionZodiacRangeZodiacs) sets.inputPingOmissionZodiacRangeZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
                if (sets.inputHotNumberRangeNumbers) sets.inputHotNumberRangeNumbers.forEach(addNumber);
                if (sets.inputAllHotNumberRangeNumbers) sets.inputAllHotNumberRangeNumbers.forEach(addNumber);
                if (sets.inputHotZodiacRangeZodiacs) sets.inputHotZodiacRangeZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
                if (sets.inputAllHotZodiacRangeZodiacs) sets.inputAllHotZodiacRangeZodiacs.forEach(zodiac => addNumbersByFilter(num => getZodiac(parseInt(num, 10)) === zodiac));
            }
            if (sets.setNumbers && sets.setNumbers.length) sets.setNumbers.forEach(addNumber);

            const sortedNumbers = Array.from(numberUnion).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
            const inputDesc = formatInputTerms(sets.inputTerms);
            let setLine = '';
            if (state.coldSelection && state.coldSelection.setKline) {
                const nums = state.coldSelection.setNumbers || [];
                setLine = `<div style="margin-top:4px;color:var(--warn);">扣选包含号码（${nums.length}个）: ${nums.map(n => parseInt(n, 10)).join(' ')}</div>`;
            }
            if (summary) {
                summary.innerHTML = (state.coldSelection && state.coldSelection.setKline)
                    ? (setLine || '已生成自由K线')
                    : (sortedNumbers.length
                        ? `<div>扣选包含号码（共${sortedNumbers.length}个）: ${sortedNumbers.join(' ')}</div>`
                        : '已生成自由K线')
                      + (inputDesc.length ? `<div style="margin-top:4px;">输入条件: ${inputDesc.join(' ')}</div>` : '');
            }

            // Show inline selection results next to each checked option (skip zodiac types - self-explanatory)
            const skipTypes = ['zodiacs', 'hotZodiacs', 'coldZodiacs', 'allHotZodiacs', 'allColdZodiacs', 'hotZodiacRange', 'allHotZodiacRange', 'selectZodiacs', 'selectedWaves', 'selectedWuxings', 'selectedWuxingDs', 'selectedMorphs', 'selectedHeNumbers', 'selectedHeTails', 'selectedHeheads', 'selectedHeads', 'selectedTails'];
            const displayValueMap = { red: '红波', blue: '蓝波', green: '绿波', jia: '家肖', ye: '野肖' };
            document.querySelectorAll('.cold-inline-result').forEach(el => el.remove());
            Object.keys(sets).forEach(type => {
                if (skipTypes.includes(type)) return;
                const values = sets[type];
                if (values && values.length) {
                    const cb = document.getElementById('coldOption_' + type);
                    if (!cb || !cb.checked) return;
                    const parent = cb.parentElement;
                    const result = document.createElement('span');
                    result.className = 'cold-inline-result';
                    const displayValues = values.map(v => displayValueMap[v] || v);
                    result.textContent = '→ ' + displayValues.slice(0, 5).join(' ') + (displayValues.length > 5 ? '...' : '');
                    result.style.cssText = 'font-size:9px;color:var(--warn);font-weight:600;margin-left:4px;flex-shrink:0;';
                    if (parent.tagName === 'LABEL') {
                        const wrap = document.createElement('div');
                        wrap.style.cssText = 'display:flex;gap:4px;align-items:center;flex-wrap:wrap;';
                        parent.parentElement.insertBefore(wrap, parent);
                        wrap.appendChild(parent);
                        wrap.appendChild(result);
                    } else {
                        parent.appendChild(result);
                    }
                }
            });
        }

        function parseInputTerms(text) {
            const terms = { numbers: [], zodiacs: [], wuxings: [], wuxingDs: [], tails: [], heads: [], waves: [], segments: [], regions: [], omissionRanges: [], omissionZodiacRanges: [], pingOmissionRanges: [], pingOmissionZodiacRanges: [], hotNumberRanges: [], allHotNumberRanges: [], hotZodiacRanges: [], allHotZodiacRanges: [], morphs: [], heNumbers: [], heTails: [] };
            if (!text) return terms;
            const zodiacNames = new Set(['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪']);
            const waveMap = { '红': 'red', '蓝': 'blue', '绿': 'green', '红波': 'red', '蓝波': 'blue', '绿波': 'green' };
            const wuxingDsTokenMap = {
                '金单': '金单', '金双': '金双',
                '木单': '木单', '木双': '木双',
                '水单': '水单', '水双': '水双',
                '火单': '火单', '火双': '火双',
                '土单': '土单', '土双': '土双',
                '金行单': '金单', '金行双': '金双',
                '木行单': '木单', '木行双': '木双',
                '水行单': '水单', '水行双': '水双',
                '火行单': '火单', '火行双': '火双',
                '土行单': '土单', '土行双': '土双',
                '金单数': '金单', '金双数': '金双',
                '木单数': '木单', '木双数': '木双',
                '水单数': '水单', '水双数': '水双',
                '火单数': '火单', '火双数': '火双',
                '土单数': '土单', '土双数': '土双'
            };
            const wuxingTokenMap = { '金': '金', '木': '木', '水': '水', '火': '火', '土': '土', '金行': '金', '木行': '木', '水行': '水', '火行': '火', '土行': '土' };
            const cnNum = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7 };
            const toSeg = s => /^\d$/.test(s) ? parseInt(s, 10) : cnNum[s];
            const regionMap = {
                '一区': '1区', '二区': '2区', '三区': '3区', '四区': '4区', '五区': '5区',
                '1区': '1区', '2区': '2区', '3区': '3区', '4区': '4区', '5区': '5区',
                '区1': '1区', '区2': '2区', '区3': '3区', '区4': '4区', '区5': '5区',
                '1分区': '1区', '2分区': '2区', '3分区': '3区', '4分区': '4区', '5分区': '5区',
                '一分区': '1区', '二分区': '2区', '三分区': '3区', '四分区': '4区', '五分区': '5区'
            };
            const tokens = text.split(/[*^&%$#@!~,，;；、\s\-\+|｜]+/).map(s => s.trim()).filter(Boolean);
            tokens.forEach(token => {
                if (wuxingDsTokenMap[token]) {
                    const wxds = wuxingDsTokenMap[token];
                    if (!terms.wuxingDs.includes(wxds)) terms.wuxingDs.push(wxds);
                    return;
                }
                if (waveMap[token]) { terms.waves.push(waveMap[token]); return; }
                if (wuxingTokenMap[token]) {
                    const wx = wuxingTokenMap[token];
                    if (!terms.wuxings.includes(wx)) terms.wuxings.push(wx);
                    return;
                }
                if (regionMap[token]) {
                    const r = regionMap[token];
                    if (!terms.regions.includes(r)) terms.regions.push(r);
                    return;
                }
                if (token === '合单' || token === '单合') { if (!terms.morphs.includes('heDan')) terms.morphs.push('heDan'); return; }
                if (token === '合双' || token === '双合') { if (!terms.morphs.includes('heShuang')) terms.morphs.push('heShuang'); return; }
                if (token === '合大' || token === '大合') { if (!terms.morphs.includes('heDa')) terms.morphs.push('heDa'); return; }
                if (token === '合小' || token === '小合') { if (!terms.morphs.includes('heXiao')) terms.morphs.push('heXiao'); return; }
                if (token === '尾大' || token === '大尾') { if (!terms.morphs.includes('weiDa')) terms.morphs.push('weiDa'); return; }
                if (token === '尾小' || token === '小尾') { if (!terms.morphs.includes('weiXiao')) terms.morphs.push('weiXiao'); return; }
                if (token.includes('合尾')) {
                    const htMatch = token.match(/^(?:合尾)?(\d{1,2})$/) || token.match(/^(\d{1,2})合尾$/) || token.match(/^合尾(\d{1,2})$/);
                    if (htMatch) {
                        const ht = parseInt(htMatch[1], 10) % 10;
                        if (!terms.heTails.includes(ht)) terms.heTails.push(ht);
                        return;
                    }
                }
                if (token.includes('合') && !token.includes('合尾')) {
                    const hMatch = token.match(/^(?:合)?(\d{1,2})$/) || token.match(/^(\d{1,2})合$/) || token.match(/^合(\d{1,2})$/);
                    if (hMatch) {
                        const h = parseInt(hMatch[1], 10);
                        if (h >= 1 && h <= 13) {
                            if (!terms.heNumbers.includes(h)) terms.heNumbers.push(h);
                            return;
                        }
                    }
                }
                let mHotZ = token.match(/^(?:平特热肖|平热肖|平特肖|平肖)(\d{1,2})[-~到至](\d{1,2})(?:位|肖)?$/);
                if (mHotZ) {
                    const s = Math.max(1, Math.min(12, parseInt(mHotZ[1], 10)));
                    const e = Math.max(1, Math.min(12, parseInt(mHotZ[2], 10)));
                    terms.hotZodiacRanges.push({ start: Math.min(s, e), end: Math.max(s, e) });
                    return;
                }
                let mAllHotZ = token.match(/^(?:特码热肖|特热肖|特码肖|特肖)(\d{1,2})[-~到至](\d{1,2})(?:位|肖)?$/);
                if (mAllHotZ) {
                    const s = Math.max(1, Math.min(12, parseInt(mAllHotZ[1], 10)));
                    const e = Math.max(1, Math.min(12, parseInt(mAllHotZ[2], 10)));
                    terms.allHotZodiacRanges.push({ start: Math.min(s, e), end: Math.max(s, e) });
                    return;
                }
                let mHotN = token.match(/^(?:平特热码|平热码|平特热号|平热号|平特码|平热)?(\d{1,2})[-~到至](\d{1,2})(?:位|号)?$/);
                if (mHotN && !token.startsWith('遗漏') && !token.startsWith('特')) {
                    if (token.startsWith('平') || token.startsWith('热')) {
                        const s = Math.max(1, Math.min(49, parseInt(mHotN[1], 10)));
                        const e = Math.max(1, Math.min(49, parseInt(mHotN[2], 10)));
                        terms.hotNumberRanges.push({ start: Math.min(s, e), end: Math.max(s, e) });
                        return;
                    }
                }
                let mAllHotN = token.match(/^(?:特码热码|特热码|特码热号|特热号|特码号)(\d{1,2})[-~到至](\d{1,2})(?:位|号)?$/);
                if (mAllHotN) {
                    const s = Math.max(1, Math.min(49, parseInt(mAllHotN[1], 10)));
                    const e = Math.max(1, Math.min(49, parseInt(mAllHotN[2], 10)));
                    terms.allHotNumberRanges.push({ start: Math.min(s, e), end: Math.max(s, e) });
                    return;
                }
                let mZRange = token.match(/^(?:遗漏肖|遗漏生肖|遗漏生肖区|遗漏肖段|特码遗漏肖)(\d{1,2})[-~到至](\d{1,2})(?:位|肖)?$/);
                if (mZRange) {
                    const s = Math.max(1, Math.min(12, parseInt(mZRange[1], 10)));
                    const e = Math.max(1, Math.min(12, parseInt(mZRange[2], 10)));
                    terms.omissionZodiacRanges.push({ start: Math.min(s, e), end: Math.max(s, e) });
                    return;
                }
                let mPingZRange = token.match(/^(?:平特遗漏肖|平特生肖遗漏|平特遗漏生肖|平特漏肖|平遗漏肖|平漏肖)(\d{1,2})[-~到至](\d{1,2})(?:位|肖)?$/);
                if (mPingZRange) {
                    const s = Math.max(1, Math.min(12, parseInt(mPingZRange[1], 10)));
                    const e = Math.max(1, Math.min(12, parseInt(mPingZRange[2], 10)));
                    terms.pingOmissionZodiacRanges.push({ start: Math.min(s, e), end: Math.max(s, e) });
                    return;
                }
                let mPingRange = token.match(/^(?:平特遗漏|平特遗漏区|平特遗漏码|平特漏|平遗漏|平漏)(\d{1,2})[-~到至](\d{1,2})(?:位|号)?$/);
                if (mPingRange) {
                    const s = Math.max(1, Math.min(49, parseInt(mPingRange[1], 10)));
                    const e = Math.max(1, Math.min(49, parseInt(mPingRange[2], 10)));
                    terms.pingOmissionRanges.push({ start: Math.min(s, e), end: Math.max(s, e) });
                    return;
                }
                let mRange = token.match(/^(?:遗漏|遗漏区|遗漏区域|遗漏段|特码遗漏|特码遗漏码)?(\d{1,2})[-~到至](\d{1,2})(?:位|号)?$/);
                if (mRange) {
                    const s = Math.max(1, Math.min(49, parseInt(mRange[1], 10)));
                    const e = Math.max(1, Math.min(49, parseInt(mRange[2], 10)));
                    terms.omissionRanges.push({ start: Math.min(s, e), end: Math.max(s, e) });
                    return;
                }
                let m = token.match(/^([一二三四五1-5])区$/);
                if (m) {
                    const r = `${toSeg(m[1])}区`;
                    if (!terms.regions.includes(r)) terms.regions.push(r);
                    return;
                }
                m = token.match(/^([一二三四五六七1-7])段$/);
                if (m) { const s = toSeg(m[1]); if (!terms.segments.includes(s)) terms.segments.push(s); return; }
                m = token.match(/^段([一二三四五六七1-7])$/);
                if (m) { const s = toSeg(m[1]); if (!terms.segments.includes(s)) terms.segments.push(s); return; }
                m = token.match(/^(\d{1,2})尾$/);
                if (m) { const t = parseInt(m[1], 10) % 10; if (!terms.tails.includes(t)) terms.tails.push(t); return; }
                m = token.match(/^尾(\d{1,2})$/);
                if (m) { const t = parseInt(m[1], 10) % 10; if (!terms.tails.includes(t)) terms.tails.push(t); return; }
                m = token.match(/^([0-4])头$/);
                if (m) { const h = parseInt(m[1], 10); if (!terms.heads.includes(h)) terms.heads.push(h); return; }
                m = token.match(/^头([0-4])$/);
                if (m) { const h = parseInt(m[1], 10); if (!terms.heads.includes(h)) terms.heads.push(h); return; }
                if (zodiacNames.has(token)) { if (!terms.zodiacs.includes(token)) terms.zodiacs.push(token); return; }
                if (/^\d{1,2}$/.test(token)) {
                    const n = parseInt(token, 10);
                    if (n >= 1 && n <= 49) {
                        const s = n.toString().padStart(2, '0');
                        if (!terms.numbers.includes(s)) terms.numbers.push(s);
                    }
                }
            });
            terms.waves = [...new Set(terms.waves)];
            terms.regions = [...new Set(terms.regions)];
            return terms;
        }

        function formatInputTerms(t) {
            if (!t) return [];
            const waveNames = { red: '红波', blue: '蓝波', green: '绿波' };
            const regionNames = { '1区': '一区(01-10)', '2区': '二区(11-20)', '3区': '三区(21-30)', '4区': '四区(31-40)', '5区': '五区(41-49)' };
            const parts = [];
            if (t.numbers && t.numbers.length) parts.push(...t.numbers.map(n => parseInt(n, 10)));
            if (t.zodiacs && t.zodiacs.length) parts.push(...t.zodiacs);
            if (t.tails && t.tails.length) parts.push(...t.tails.map(x => x + '尾'));
            if (t.heads && t.heads.length) parts.push(...t.heads.map(x => x + '头'));
            if (t.waves && t.waves.length) parts.push(...t.waves.map(w => waveNames[w]));
            if (t.wuxings && t.wuxings.length) parts.push(...t.wuxings.map(wx => wx + '行'));
            if (t.wuxingDs && t.wuxingDs.length) parts.push(...t.wuxingDs);
            if (t.segments && t.segments.length) parts.push(...t.segments.map(s => s + '段'));
            if (t.regions && t.regions.length) parts.push(...t.regions.map(r => regionNames[r] || r));
            if (t.morphs && t.morphs.length) {
                const morphNames = { heDan: '合单', heShuang: '合双', heDa: '合大', heXiao: '合小', weiDa: '尾大', weiXiao: '尾小' };
                parts.push(...t.morphs.map(m => morphNames[m] || m));
            }
            if (t.heNumbers && t.heNumbers.length) parts.push(...t.heNumbers.map(h => h + '合'));
            if (t.heTails && t.heTails.length) parts.push(...t.heTails.map(ht => ht + '合尾'));
            if (t.omissionRanges && t.omissionRanges.length) parts.push(...t.omissionRanges.map(r => `特码遗漏${r.start}-${r.end}`));
            if (t.omissionZodiacRanges && t.omissionZodiacRanges.length) parts.push(...t.omissionZodiacRanges.map(r => `特码漏肖${r.start}-${r.end}`));
            if (t.pingOmissionRanges && t.pingOmissionRanges.length) parts.push(...t.pingOmissionRanges.map(r => `平特遗漏${r.start}-${r.end}`));
            if (t.pingOmissionZodiacRanges && t.pingOmissionZodiacRanges.length) parts.push(...t.pingOmissionZodiacRanges.map(r => `平特漏肖${r.start}-${r.end}`));
            if (t.hotNumberRanges && t.hotNumberRanges.length) parts.push(...t.hotNumberRanges.map(r => `平特热码${r.start}-${r.end}`));
            if (t.allHotNumberRanges && t.allHotNumberRanges.length) parts.push(...t.allHotNumberRanges.map(r => `特码热码${r.start}-${r.end}`));
            if (t.hotZodiacRanges && t.hotZodiacRanges.length) parts.push(...t.hotZodiacRanges.map(r => `平特热肖${r.start}-${r.end}`));
            if (t.allHotZodiacRanges && t.allHotZodiacRanges.length) parts.push(...t.allHotZodiacRanges.map(r => `特码热肖${r.start}-${r.end}`));
            return parts.map(String);
        }

        function calculateColdSelectionDetail() {
            const types = ['numbers', 'zodiacs', 'hotNumbers', 'coldNumbers', 'hotZodiacs', 'coldZodiacs', 'allHotNumbers', 'allColdNumbers', 'allHotZodiacs', 'allColdZodiacs', 'hotNumberRange', 'allHotNumberRange', 'hotZodiacRange', 'allHotZodiacRange', 'wave', 'halfwave', 'jiaYe', 'head', 'tail', 'wuxing', 'wuxingCold', 'halfHead', 'region', 'omissionRange', 'omissionZodiacRange', 'pingOmissionRange', 'pingOmissionZodiacRange']
                .filter(type => document.getElementById(`coldOption_${type}`)?.checked);
            
            const inputText = document.getElementById('coldOption_inputNumbers')?.value.trim() || '';
            const inputTerms = parseInputTerms(inputText);
            const selectedNumbers = inputTerms.numbers || [];
            const hasInput = selectedNumbers.length || (inputTerms.zodiacs && inputTerms.zodiacs.length) || (inputTerms.tails && inputTerms.tails.length) || (inputTerms.heads && inputTerms.heads.length) || (inputTerms.waves && inputTerms.waves.length) || (inputTerms.wuxings && inputTerms.wuxings.length) || (inputTerms.wuxingDs && inputTerms.wuxingDs.length) || (inputTerms.segments && inputTerms.segments.length) || (inputTerms.regions && inputTerms.regions.length) || (inputTerms.omissionRanges && inputTerms.omissionRanges.length) || (inputTerms.omissionZodiacRanges && inputTerms.omissionZodiacRanges.length) || (inputTerms.pingOmissionRanges && inputTerms.pingOmissionRanges.length) || (inputTerms.pingOmissionZodiacRanges && inputTerms.pingOmissionZodiacRanges.length) || (inputTerms.hotNumberRanges && inputTerms.hotNumberRanges.length) || (inputTerms.allHotNumberRanges && inputTerms.allHotNumberRanges.length) || (inputTerms.hotZodiacRanges && inputTerms.hotZodiacRanges.length) || (inputTerms.allHotZodiacRanges && inputTerms.allHotZodiacRanges.length) || (inputTerms.morphs && inputTerms.morphs.length) || (inputTerms.heNumbers && inputTerms.heNumbers.length) || (inputTerms.heTails && inputTerms.heTails.length);
            if (hasInput) types.push('inputNumbers');
            const selectedZodiacs = (CONFIG.zodiacMap[state.currentYear] || [])
                .filter(z => document.getElementById(`zodiacOption_${z}`)?.checked);
            if (selectedZodiacs.length) types.push('selectZodiacs');
            const selectedWaves = ['red', 'blue', 'green'].filter(w => document.getElementById('waveOption_' + w)?.checked);
            if (selectedWaves.length) types.push('selectedWaves');
            const selectedWuxings = ['金', '木', '水', '火', '土'].filter(wx => document.getElementById('wuxingOption_' + wx)?.checked);
            if (selectedWuxings.length) types.push('selectedWuxings');
            const selectedWuxingDs = WUXING_DS_LIST.filter(wxds => document.getElementById('wuxingDsOption_' + wxds)?.checked);
            if (selectedWuxingDs.length) types.push('selectedWuxingDs');

            const MORPH_KEYS = ['heDan', 'heShuang', 'heDa', 'heXiao', 'weiDa', 'weiXiao'];
            const selectedMorphs = MORPH_KEYS.filter(m => document.getElementById(`morphOption_${m}`)?.checked);
            if (selectedMorphs.length) types.push('selectedMorphs');

            const selectedHeNumbers = Array.from({ length: 13 }, (_, i) => i + 1)
                .filter(h => document.getElementById(`heOption_${h}`)?.checked);
            if (selectedHeNumbers.length) types.push('selectedHeNumbers');

            const selectedHeTails = Array.from({ length: 10 }, (_, i) => i)
                .filter(ht => document.getElementById(`heTailOption_${ht}`)?.checked);
            if (selectedHeTails.length) types.push('selectedHeTails');

            const selectedHeads = Array.from({ length: 5 }, (_, i) => i)
                .filter(h => document.getElementById(`headOption_${h}`)?.checked);
            if (selectedHeads.length) types.push('selectedHeads');

            const selectedTails = Array.from({ length: 10 }, (_, i) => i)
                .filter(t => document.getElementById(`tailOption_${t}`)?.checked);
            if (selectedTails.length) types.push('selectedTails');

            const hasKills = state.excludeKills && (
                (state.excludeKills.zodiacs && state.excludeKills.zodiacs.length) ||
                (state.excludeKills.tails && state.excludeKills.tails.length) ||
                (state.excludeKills.waves && state.excludeKills.waves.length) ||
                state.excludeKills.coldTop5 ||
                (state.excludeKills.excludedSingles && state.excludeKills.excludedSingles.length)
            );

            if (!types.length) {
                if (hasKills) {
                    types.push('base49');
                } else {
                    return {
                        types: [],
                        optionSets: [],
                        candidateNumbers: [],
                        finalNumbers: [],
                        excludedNumbers: [],
                        counts: {},
                        selectedZodiacs: [],
                        selectedWaves: [],
                        selectedWuxings: [],
                        selectedWuxingDs: [],
                        selectedMorphs: [],
                        selectedHeNumbers: [],
                        selectedHeTails: [],
                        selectedHeads: [],
                        selectedTails: [],
                        selectedNumbers: [],
                        inputTerms: {}
                    };
                }
            }

            const coldSourceData = getSelectedColdSourceData();
            const hotColdSourceData = getSelectedHotColdSourceData();
            const counts = {
                zodiacs: parseInt(document.getElementById('coldOption_zodiacs_count')?.value || '3'),
                numbers: parseInt(document.getElementById('coldOption_numbers_count')?.value || '10'),
                hotNumbers: parseInt(document.getElementById('coldOption_hotNumbers_count')?.value || '10'),
                coldNumbers: parseInt(document.getElementById('coldOption_coldNumbers_count')?.value || '10'),
                allHotNumbers: parseInt(document.getElementById('coldOption_allHotNumbers_count')?.value || '10'),
                allColdNumbers: parseInt(document.getElementById('coldOption_allColdNumbers_count')?.value || '10'),
                hotZodiacs: parseInt(document.getElementById('coldOption_hotZodiacs_count')?.value || '3'),
                coldZodiacs: parseInt(document.getElementById('coldOption_coldZodiacs_count')?.value || '3'),
                allHotZodiacs: parseInt(document.getElementById('coldOption_allHotZodiacs_count')?.value || '3'),
                allColdZodiacs: parseInt(document.getElementById('coldOption_allColdZodiacs_count')?.value || '3'),
                halfwave: parseInt(document.getElementById('coldOption_halfwave_count')?.value || '1'),
                head: parseInt(document.getElementById('coldOption_head_count')?.value || '1'),
                tail: parseInt(document.getElementById('coldOption_tail_count')?.value || '2'),
                wuxing: parseInt(document.getElementById('coldOption_wuxing_count')?.value || '1'),
                wuxingCold: parseInt(document.getElementById('coldOption_wuxingCold_count')?.value || '1'),
                halfHead: parseInt(document.getElementById('coldOption_halfHead_count')?.value || '1'),
                region: parseInt(document.getElementById('coldOption_region_count')?.value || '1'),
                omissionRangeStart: parseInt(document.getElementById('coldOption_omissionRange_start')?.value || '1', 10),
                omissionRangeEnd: parseInt(document.getElementById('coldOption_omissionRange_end')?.value || '10', 10),
                omissionRangeSegments: (getRangeSegments('omissionRange').length > 0) ? getRangeSegments('omissionRange').map(s => ({ ...s })) : null,
                omissionZodiacRangeStart: parseInt(document.getElementById('coldOption_omissionZodiacRange_start')?.value || '1', 10),
                omissionZodiacRangeEnd: parseInt(document.getElementById('coldOption_omissionZodiacRange_end')?.value || '3', 10),
                omissionZodiacRangeSegments: (getRangeSegments('omissionZodiacRange').length > 0) ? getRangeSegments('omissionZodiacRange').map(s => ({ ...s })) : null,
                pingOmissionRangeStart: parseInt(document.getElementById('coldOption_pingOmissionRange_start')?.value || '1', 10),
                pingOmissionRangeEnd: parseInt(document.getElementById('coldOption_pingOmissionRange_end')?.value || '10', 10),
                pingOmissionRangeSegments: (getRangeSegments('pingOmissionRange').length > 0) ? getRangeSegments('pingOmissionRange').map(s => ({ ...s })) : null,
                pingOmissionZodiacRangeStart: parseInt(document.getElementById('coldOption_pingOmissionZodiacRange_start')?.value || '1', 10),
                pingOmissionZodiacRangeEnd: parseInt(document.getElementById('coldOption_pingOmissionZodiacRange_end')?.value || '3', 10),
                pingOmissionZodiacRangeSegments: (getRangeSegments('pingOmissionZodiacRange').length > 0) ? getRangeSegments('pingOmissionZodiacRange').map(s => ({ ...s })) : null,
                hotNumberRangeStart: parseInt(document.getElementById('coldOption_hotNumberRange_start')?.value || '1', 10),
                hotNumberRangeEnd: parseInt(document.getElementById('coldOption_hotNumberRange_end')?.value || '10', 10),
                hotNumberRangeSegments: (getRangeSegments('hotNumberRange').length > 0) ? getRangeSegments('hotNumberRange').map(s => ({ ...s })) : null,
                allHotNumberRangeStart: parseInt(document.getElementById('coldOption_allHotNumberRange_start')?.value || '1', 10),
                allHotNumberRangeEnd: parseInt(document.getElementById('coldOption_allHotNumberRange_end')?.value || '10', 10),
                allHotNumberRangeSegments: (getRangeSegments('allHotNumberRange').length > 0) ? getRangeSegments('allHotNumberRange').map(s => ({ ...s })) : null,
                hotZodiacRangeStart: parseInt(document.getElementById('coldOption_hotZodiacRange_start')?.value || '1', 10),
                hotZodiacRangeEnd: parseInt(document.getElementById('coldOption_hotZodiacRange_end')?.value || '3', 10),
                hotZodiacRangeSegments: (getRangeSegments('hotZodiacRange').length > 0) ? getRangeSegments('hotZodiacRange').map(s => ({ ...s })) : null,
                allHotZodiacRangeStart: parseInt(document.getElementById('coldOption_allHotZodiacRange_start')?.value || '1', 10),
                allHotZodiacRangeEnd: parseInt(document.getElementById('coldOption_allHotZodiacRange_end')?.value || '3', 10),
                allHotZodiacRangeSegments: (getRangeSegments('allHotZodiacRange').length > 0) ? getRangeSegments('allHotZodiacRange').map(s => ({ ...s })) : null,
                inputTerms
            };

            const sets = calculateColdSets(types, coldSourceData, counts, hotColdSourceData);
            if (types.includes('base49')) sets.base49 = true;
            if (selectedZodiacs.length) sets.selectZodiacs = selectedZodiacs;
            if (selectedWaves.length) sets.selectedWaves = selectedWaves;
            if (selectedWuxings.length) sets.selectedWuxings = selectedWuxings;
            if (selectedWuxingDs.length) sets.selectedWuxingDs = selectedWuxingDs;
            if (selectedMorphs.length) sets.selectedMorphs = selectedMorphs;
            if (selectedHeNumbers.length) sets.selectedHeNumbers = selectedHeNumbers;
            if (selectedHeTails.length) sets.selectedHeTails = selectedHeTails;
            if (selectedHeads.length) sets.selectedHeads = selectedHeads;
            if (selectedTails.length) sets.selectedTails = selectedTails;
            if (selectedNumbers.length) sets.inputNumbers = selectedNumbers;
            if (hasInput) sets.inputTerms = inputTerms;

            const optionSets = getColdOptionNumberSets(sets);
            const mode = state.filterCalcMode || state.setMode || 'all';
            const { candidateNumbers, finalNumbers, excludedNumbers } = applySetModeAndExcludeKills(
                optionSets,
                mode,
                state.excludeKills,
                coldSourceData
            );

            return {
                types,
                optionSets,
                candidateNumbers,
                finalNumbers,
                excludedNumbers,
                counts,
                selectedZodiacs,
                selectedWaves,
                selectedWuxings,
                selectedWuxingDs,
                selectedMorphs,
                selectedHeNumbers,
                selectedHeTails,
                selectedHeads,
                selectedTails,
                selectedNumbers,
                inputTerms
            };
        }

        function generateColdKline() {
            const detail = calculateColdSelectionDetail();
            const { types, finalNumbers, counts, selectedZodiacs, selectedWaves, selectedWuxings, selectedWuxingDs, selectedMorphs, selectedHeNumbers, selectedHeTails, selectedHeads, selectedTails, selectedNumbers, inputTerms } = detail;
            
            if (!types.length) {
                if (typeof showToast === 'function') showToast('⚠️ 请先勾选至少一个特码综合K线选项', 3000);
                else alert('请先选择至少一个特码综合K线选项');
                return;
            }
            if (!finalNumbers.length) {
                if (typeof showToast === 'function') showToast('⚠️ 当前多维运算或排除过滤后没有可用号码，请调整条件或清空排除项', 3500);
                else alert('当前多维运算或排除过滤后没有可用号码，请调整条件或清空排除项');
                return;
            }
            
            const mode = state.filterCalcMode || state.setMode || 'all';
            const excludeKillsCopy = JSON.parse(JSON.stringify(state.excludeKills || {}));
            state.coldSelection = {
                types: ['setKline'],
                setKline: true,
                setMode: mode,
                filterCalcMode: mode,
                excludeKills: excludeKillsCopy,
                setNumbers: finalNumbers,
                setTypes: types,
                setCounts: counts,
                sets: { setNumbers: finalNumbers },
                counts,
                selectedZodiacs,
                selectedWaves,
                selectedWuxings,
                selectedWuxingDs,
                selectedMorphs,
                selectedHeNumbers,
                selectedHeTails,
                selectedHeads,
                selectedTails,
                selectedNumbers,
                inputTerms
            };
            state.currentMode = 'cold_custom';
            const trendModeSel = document.getElementById('trendModeSel');
            if (trendModeSel) trendModeSel.value = 'cold_custom';
            document.querySelectorAll('#modeQuickBar button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === 'cold_custom');
            });
            const infoMode = document.getElementById('info-mode');
            if (infoMode) infoMode.textContent = '特码综合K线';
            const followWrap = document.getElementById('followWrap');
            if (followWrap) followWrap.style.display = 'none';
            const coldCard = document.getElementById('coldCard');
            if (coldCard) coldCard.style.display = 'block';
            updateColdSummary();
            recalcData();
            if (typeof showToast === 'function') {
                showToast(`✅ 特码综合K线已成功生成（精选 ${finalNumbers.length} 码）`, 2500);
            }
        }

        function updateLiveSelectionPreview() {
            const detail = calculateColdSelectionDetail();
            const { finalNumbers, candidateNumbers, excludedNumbers } = detail;

            const countEl = document.getElementById('liveSelectedCount');
            const detailEl = document.getElementById('liveExcludedDetail');
            const gridEl = document.getElementById('liveBallsGrid');
            if (!gridEl) return;

            const hitRatePct = ((finalNumbers.length / 49) * 100).toFixed(1);
            if (countEl) {
                countEl.textContent = `🎯 精选 ${finalNumbers.length} 码 (${hitRatePct}%)`;
            }
            if (detailEl) {
                detailEl.textContent = `已排除杀号: ${excludedNumbers.length} 码 | 原始候选: ${candidateNumbers.length} 码 | 理论覆盖率: ${hitRatePct}%`;
            }

            if (!candidateNumbers.length && !finalNumbers.length && !excludedNumbers.length) {
                gridEl.innerHTML = '<span style="font-size: 11px; color: var(--text-secondary); padding: 8px 0;">勾选下方条件即时生成号码球明细...</span>';
                return;
            }

            const allBalls = Array.from(new Set([...finalNumbers, ...excludedNumbers])).sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

            gridEl.innerHTML = allBalls.map(num => {
                const wave = getColor(num);
                const zodiac = getZodiac(parseInt(num, 10));
                const isExcluded = excludedNumbers.includes(num);

                return `
                    <div class="preview-ball-item ${wave} ${isExcluded ? 'excluded-single' : ''}" 
                         onclick="toggleSingleBallExclude('${num}')"
                         title="${num} (${zodiac}/${wave === 'red' ? '红' : wave === 'blue' ? '蓝' : '绿'}) - 点击${isExcluded ? '恢复' : '排除'}">
                        <span>${num}</span>
                        <span class="ball-zodiac-tag">${zodiac}</span>
                    </div>
                `;
            }).join('');
        }

        function setFilterCalcMode(mode) {
            state.filterCalcMode = mode;
            state.setMode = mode;
            const tabs = document.querySelectorAll('.filter-mode-tab');
            tabs.forEach(tab => {
                tab.classList.toggle('active', tab.getAttribute('data-mode') === mode);
            });
            const descMap = {
                all: '包含任一选中条件（并集）',
                and: '严格同时满足所有选中条件（交集）',
                same: '至少满足 2 项及以上条件（重合）',
                diff: '仅满足单一条件独有（差集）'
            };
            const descEl = document.getElementById('filterModeDesc');
            if (descEl) descEl.textContent = descMap[mode] || '';
            updateSetModeButton();
            updateLiveSelectionPreview();
            if (state.currentMode === 'cold_custom') {
                generateColdKline();
            }
        }

        function toggleKillZodiac(zodiac) {
            if (!state.excludeKills.zodiacs) state.excludeKills.zodiacs = [];
            const idx = state.excludeKills.zodiacs.indexOf(zodiac);
            if (idx >= 0) state.excludeKills.zodiacs.splice(idx, 1);
            else state.excludeKills.zodiacs.push(zodiac);
            updateKillChipsUI();
            updateLiveSelectionPreview();
            if (state.currentMode === 'cold_custom') generateColdKline();
        }

        function toggleKillTail(tail) {
            if (!state.excludeKills.tails) state.excludeKills.tails = [];
            const idx = state.excludeKills.tails.indexOf(tail);
            if (idx >= 0) state.excludeKills.tails.splice(idx, 1);
            else state.excludeKills.tails.push(tail);
            updateKillChipsUI();
            updateLiveSelectionPreview();
            if (state.currentMode === 'cold_custom') generateColdKline();
        }

        function toggleKillWave(wave) {
            if (!state.excludeKills.waves) state.excludeKills.waves = [];
            const idx = state.excludeKills.waves.indexOf(wave);
            if (idx >= 0) state.excludeKills.waves.splice(idx, 1);
            else state.excludeKills.waves.push(wave);
            updateKillChipsUI();
            updateLiveSelectionPreview();
            if (state.currentMode === 'cold_custom') generateColdKline();
        }

        function toggleKillColdTop5() {
            state.excludeKills.coldTop5 = !state.excludeKills.coldTop5;
            updateKillChipsUI();
            updateLiveSelectionPreview();
            if (state.currentMode === 'cold_custom') generateColdKline();
        }

        function clearAllKills() {
            state.excludeKills = {
                zodiacs: [],
                tails: [],
                waves: [],
                coldTop5: false,
                manualNumbers: [],
                excludedSingles: []
            };
            updateKillChipsUI();
            updateLiveSelectionPreview();
            if (state.currentMode === 'cold_custom') generateColdKline();
        }

        function toggleSingleBallExclude(num) {
            if (!state.excludeKills.excludedSingles) state.excludeKills.excludedSingles = [];
            const idx = state.excludeKills.excludedSingles.indexOf(num);
            if (idx >= 0) state.excludeKills.excludedSingles.splice(idx, 1);
            else state.excludeKills.excludedSingles.push(num);
            updateLiveSelectionPreview();
            if (state.currentMode === 'cold_custom') generateColdKline();
        }

        function copySelectedNumbers() {
            const detail = calculateColdSelectionDetail();
            const { finalNumbers } = detail;
            if (!finalNumbers || !finalNumbers.length) {
                return alert('当前没有选中的精选号码');
            }
            const text = finalNumbers.join(' ');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    alert(`✅ 已复制 ${finalNumbers.length} 个精选号码到剪贴板:\n${text}`);
                }).catch(() => {
                    prompt('请手动复制精选号码：', text);
                });
            } else {
                prompt('请手动复制精选号码：', text);
            }
        }

        function updateKillChipsUI() {
            const zChips = document.querySelectorAll('#killZodiacGroup .kill-chip');
            zChips.forEach(chip => {
                const z = chip.textContent.trim();
                chip.classList.toggle('active', !!(state.excludeKills.zodiacs && state.excludeKills.zodiacs.includes(z)));
            });

            const tChips = document.querySelectorAll('#killTailGroup .kill-chip');
            tChips.forEach(chip => {
                const t = parseInt(chip.textContent);
                chip.classList.toggle('active', !!(state.excludeKills.tails && state.excludeKills.tails.includes(t)));
            });

            ['red', 'blue', 'green'].forEach(w => {
                const el = document.getElementById('killWave_' + w);
                if (el) el.classList.toggle('active', !!(state.excludeKills.waves && state.excludeKills.waves.includes(w)));
            });

            const coldEl = document.getElementById('killColdTop5');
            if (coldEl) coldEl.classList.toggle('active', !!state.excludeKills.coldTop5);
        }

        function toggleShowSignals(show) {
            state.showSignals = show;
            draw();
        }

        function initFilterCalculatorListeners() {
            const coldCard = document.getElementById('coldCard');
            if (!coldCard) return;
            coldCard.addEventListener('change', (e) => {
                if (e.target.closest('#userStrategySel')) return;
                updateLiveSelectionPreview();
            });
            const inputNumEl = document.getElementById('coldOption_inputNumbers');
            if (inputNumEl) {
                inputNumEl.addEventListener('input', () => {
                    updateLiveSelectionPreview();
                });
            }
        }

        function computeDataSignals(data) {
            if (!data || data.length < 2) return;
            let winStreak = 0;
            let lossStreak = 0;

            let maxObservedLoss = 0;
            let tempLoss = 0;
            data.forEach(d => {
                const step = d.step !== undefined ? d.step : (d.displayScore !== undefined ? 0 : 0);
                const isWin = step > 0 || d.followHit === true || d.isCurrentHot === true;
                if (isWin) { tempLoss = 0; }
                else { tempLoss++; if (tempLoss > maxObservedLoss) maxObservedLoss = tempLoss; }
            });
            const freezeThreshold = Math.max(5, Math.floor(maxObservedLoss * 0.75));

            data.forEach((d, i) => {
                d.chartSignal = null;
                let isWin = false;
                if (d.step !== undefined) isWin = d.step > 0;
                else if (typeof d.followHit === 'boolean') isWin = d.followHit;
                else if (typeof d.isCurrentHot === 'boolean') isWin = d.isCurrentHot;
                else if (i > 0) isWin = d.displayScore > data[i - 1].displayScore;

                if (isWin) {
                    if (lossStreak >= 4) {
                        d.chartSignal = {
                            type: 'reversal',
                            icon: '🚀',
                            name: '触底强反弹',
                            desc: `连续 ${lossStreak} 期落空后本期转折反弹命中！`
                        };
                    }
                    winStreak++;
                    lossStreak = 0;
                } else {
                    if (winStreak >= 3) {
                        d.chartSignal = {
                            type: 'peak',
                            icon: '⚠️',
                            name: '见顶回落',
                            desc: `连续 ${winStreak} 期命中后高位遇阻回落`
                        };
                    }
                    lossStreak++;
                    winStreak = 0;
                    if (lossStreak >= freezeThreshold && !d.chartSignal) {
                        d.chartSignal = {
                            type: 'extreme_cold',
                            icon: '❄️',
                            name: '极值冷点',
                            desc: `已连续 ${lossStreak} 期落空未出(深度冰点)`
                        };
                    }
                }

                if (state.maWindow > 0 && i >= 1) {
                    const prev = data[i - 1];
                    if (prev && prev.displayMa != null && d.displayMa != null) {
                        if (prev.displayScore <= prev.displayMa && d.displayScore > d.displayMa && !d.chartSignal) {
                            d.chartSignal = {
                                type: 'golden_cross',
                                icon: '⚡',
                                name: '金叉突破',
                                desc: `走势线上穿 MA${state.maWindow} 均线强势突破`
                            };
                        } else if (prev.displayScore >= prev.displayMa && d.displayScore < d.displayMa && !d.chartSignal) {
                            d.chartSignal = {
                                type: 'death_cross',
                                icon: '🔻',
                                name: '死叉跌破',
                                desc: `走势线下穿 MA${state.maWindow} 均线破位`
                            };
                        }
                    }
                }
            });
        }

        function getColdOptionNumberSets(sets) {
            const allNumbers = Array.from({ length: 49 }, (_, i) => (i + 1).toString().padStart(2, '0'));
            const out = [];
            const add = (values, filterFn) => { if (values && values.length) out.push(allNumbers.filter(filterFn)); };
            add(sets.numbers, num => sets.numbers.includes(num));
            add(sets.hotNumbers, num => sets.hotNumbers.includes(num));
            add(sets.coldNumbers, num => sets.coldNumbers.includes(num));
            add(sets.allHotNumbers, num => sets.allHotNumbers.includes(num));
            add(sets.allColdNumbers, num => sets.allColdNumbers.includes(num));
            add(sets.hotNumberRange, num => sets.hotNumberRange.includes(num));
            add(sets.allHotNumberRange, num => sets.allHotNumberRange.includes(num));
            add(sets.zodiacs, num => sets.zodiacs.includes(getZodiac(parseInt(num, 10))));
            add(sets.hotZodiacs, num => sets.hotZodiacs.includes(getZodiac(parseInt(num, 10))));
            add(sets.coldZodiacs, num => sets.coldZodiacs.includes(getZodiac(parseInt(num, 10))));
            add(sets.allHotZodiacs, num => sets.allHotZodiacs.includes(getZodiac(parseInt(num, 10))));
            add(sets.allColdZodiacs, num => sets.allColdZodiacs.includes(getZodiac(parseInt(num, 10))));
            add(sets.hotZodiacRange, num => sets.hotZodiacRange.includes(getZodiac(parseInt(num, 10))));
            add(sets.allHotZodiacRange, num => sets.allHotZodiacRange.includes(getZodiac(parseInt(num, 10))));
            add(sets.selectZodiacs, num => sets.selectZodiacs.includes(getZodiac(parseInt(num, 10))));
            add(sets.selectedWaves, num => sets.selectedWaves.includes(getColor(num)));
            add(sets.selectedWuxings, num => sets.selectedWuxings.includes(getWuxingKey(num)));
            add(sets.selectedWuxingDs, num => sets.selectedWuxingDs.includes(getWuxingDsKey(num)));
            add(sets.selectedRegions, num => sets.selectedRegions.includes(getRegionKey(parseInt(num, 10))) || sets.selectedRegions.includes(getRegionShortKey(parseInt(num, 10))));
            add(sets.omissionRange, num => sets.omissionRange.includes(num));
            add(sets.omissionZodiacRange, num => sets.omissionZodiacRange.includes(getZodiac(parseInt(num, 10))));
            add(sets.pingOmissionRange, num => sets.pingOmissionRange.includes(num));
            add(sets.pingOmissionZodiacRange, num => sets.pingOmissionZodiacRange.includes(getZodiac(parseInt(num, 10))));
            add(sets.wave, num => sets.wave.includes(getColor(num)));
            add(sets.halfwave, num => sets.halfwave.includes(getHalfWaveKey(num)));
            add(sets.jiaYe, num => sets.jiaYe.includes(getJiaYe(getZodiac(parseInt(num, 10)))));
            add(sets.head, num => sets.head.includes(`${Math.floor(parseInt(num, 10) / 10)}头`));
            add(sets.tail, num => sets.tail.includes(`${parseInt(num, 10) % 10}尾`));
            add(sets.wuxing, num => sets.wuxing.includes(getSegmentKey(parseInt(num, 10))));
            add(sets.wuxingCold, num => sets.wuxingCold.includes(getWuxingKey(num)));
            add(sets.halfHead, num => sets.halfHead.includes(getHalfHeadKey(parseInt(num, 10))));
            add(sets.region, num => sets.region.includes(getRegionKey(parseInt(num, 10))));
            if (sets.selectedMorphs && sets.selectedMorphs.length) {
                const mDanShuang = sets.selectedMorphs.filter(m => m === 'heDan' || m === 'heShuang');
                if (mDanShuang.length) {
                    out.push(allNumbers.filter(n => (mDanShuang.includes('heDan') && isHeDan(n)) || (mDanShuang.includes('heShuang') && isHeShuang(n))));
                }
                const mDaXiao = sets.selectedMorphs.filter(m => m === 'heDa' || m === 'heXiao');
                if (mDaXiao.length) {
                    out.push(allNumbers.filter(n => (mDaXiao.includes('heDa') && isHeDa(n)) || (mDaXiao.includes('heXiao') && isHeXiao(n))));
                }
                const mWeiDaXiao = sets.selectedMorphs.filter(m => m === 'weiDa' || m === 'weiXiao');
                if (mWeiDaXiao.length) {
                    out.push(allNumbers.filter(n => (mWeiDaXiao.includes('weiDa') && isWeiDa(n)) || (mWeiDaXiao.includes('weiXiao') && isWeiXiao(n))));
                }
            }
            if (sets.selectedHeNumbers && sets.selectedHeNumbers.length) {
                out.push(allNumbers.filter(n => sets.selectedHeNumbers.includes(getNumHe(n))));
            }
            if (sets.selectedHeTails && sets.selectedHeTails.length) {
                out.push(allNumbers.filter(n => sets.selectedHeTails.includes(getNumHeTail(n))));
            }
            if (sets.selectedHeads && sets.selectedHeads.length) {
                out.push(allNumbers.filter(n => {
                    const h = Math.floor(parseInt(n, 10) / 10);
                    return sets.selectedHeads.includes(h) || sets.selectedHeads.includes(String(h)) || sets.selectedHeads.includes(`${h}头`);
                }));
            }
            if (sets.selectedTails && sets.selectedTails.length) {
                out.push(allNumbers.filter(n => {
                    const t = parseInt(n, 10) % 10;
                    return sets.selectedTails.includes(t) || sets.selectedTails.includes(String(t)) || sets.selectedTails.includes(`${t}尾`);
                }));
            }
            if (sets.base49) out.push(allNumbers.slice());
            if (sets.inputNumbers && sets.inputNumbers.length) out.push(sets.inputNumbers.slice());
            if (sets.inputOmissionRangeNumbers && sets.inputOmissionRangeNumbers.length) out.push(sets.inputOmissionRangeNumbers.slice());
            if (sets.inputPingOmissionRangeNumbers && sets.inputPingOmissionRangeNumbers.length) out.push(sets.inputPingOmissionRangeNumbers.slice());
            if (sets.inputPingOmissionZodiacRangeZodiacs && sets.inputPingOmissionZodiacRangeZodiacs.length) out.push(allNumbers.filter(n => sets.inputPingOmissionZodiacRangeZodiacs.includes(getZodiac(parseInt(n, 10)))));
            if (sets.inputOmissionZodiacRangeZodiacs && sets.inputOmissionZodiacRangeZodiacs.length) out.push(allNumbers.filter(n => sets.inputOmissionZodiacRangeZodiacs.includes(getZodiac(parseInt(n, 10)))));
            if (sets.inputHotNumberRangeNumbers && sets.inputHotNumberRangeNumbers.length) out.push(sets.inputHotNumberRangeNumbers.slice());
            if (sets.inputAllHotNumberRangeNumbers && sets.inputAllHotNumberRangeNumbers.length) out.push(sets.inputAllHotNumberRangeNumbers.slice());
            if (sets.inputHotZodiacRangeZodiacs && sets.inputHotZodiacRangeZodiacs.length) out.push(allNumbers.filter(n => sets.inputHotZodiacRangeZodiacs.includes(getZodiac(parseInt(n, 10)))));
            if (sets.inputAllHotZodiacRangeZodiacs && sets.inputAllHotZodiacRangeZodiacs.length) out.push(allNumbers.filter(n => sets.inputAllHotZodiacRangeZodiacs.includes(getZodiac(parseInt(n, 10)))));
            if (sets.inputTerms) {
                const it = sets.inputTerms;
                if (it.numbers && it.numbers.length) out.push(it.numbers.slice());
                if (it.zodiacs && it.zodiacs.length) out.push(allNumbers.filter(n => it.zodiacs.includes(getZodiac(parseInt(n, 10)))));
                if (it.tails && it.tails.length) out.push(allNumbers.filter(n => it.tails.includes(parseInt(n, 10) % 10)));
                if (it.heads && it.heads.length) out.push(allNumbers.filter(n => it.heads.includes(Math.floor(parseInt(n, 10) / 10))));
                if (it.waves && it.waves.length) out.push(allNumbers.filter(n => it.waves.includes(getColor(n))));
                if (it.wuxings && it.wuxings.length) out.push(allNumbers.filter(n => it.wuxings.includes(getWuxingKey(n))));
                if (it.wuxingDs && it.wuxingDs.length) out.push(allNumbers.filter(n => it.wuxingDs.includes(getWuxingDsKey(n))));
                if (it.segments && it.segments.length) out.push(allNumbers.filter(n => it.segments.includes(Math.ceil(parseInt(n, 10) / 7))));
                if (it.regions && it.regions.length) out.push(allNumbers.filter(n => it.regions.includes(getRegionShortKey(parseInt(n, 10)))));
                if (it.morphs && it.morphs.length) {
                    const mDanShuang = it.morphs.filter(m => m === 'heDan' || m === 'heShuang');
                    if (mDanShuang.length) out.push(allNumbers.filter(n => (mDanShuang.includes('heDan') && isHeDan(n)) || (mDanShuang.includes('heShuang') && isHeShuang(n))));
                    const mDaXiao = it.morphs.filter(m => m === 'heDa' || m === 'heXiao');
                    if (mDaXiao.length) out.push(allNumbers.filter(n => (mDaXiao.includes('heDa') && isHeDa(n)) || (mDaXiao.includes('heXiao') && isHeXiao(n))));
                    const mWeiDaXiao = it.morphs.filter(m => m === 'weiDa' || m === 'weiXiao');
                    if (mWeiDaXiao.length) out.push(allNumbers.filter(n => (mWeiDaXiao.includes('weiDa') && isWeiDa(n)) || (mWeiDaXiao.includes('weiXiao') && isWeiXiao(n))));
                }
                if (it.heNumbers && it.heNumbers.length) {
                    out.push(allNumbers.filter(n => it.heNumbers.includes(getNumHe(n))));
                }
                if (it.heTails && it.heTails.length) {
                    out.push(allNumbers.filter(n => it.heTails.includes(getNumHeTail(n))));
                }
            }
            return out;
        }

        function applySetModeAndExcludeKills(optionSets, setMode, excludeKills, coldSourceData) {
            const cntMap = {};
            optionSets.forEach(set => set.forEach(n => {
                cntMap[n] = (cntMap[n] || 0) + 1;
            }));
            const totalSets = optionSets.length;
            let candidateNumbers = [];
            if (setMode === 'and') {
                if (totalSets > 0) {
                    candidateNumbers = Object.entries(cntMap).filter(([, c]) => c === totalSets).map(([n]) => n);
                } else {
                    candidateNumbers = [];
                }
            } else if (setMode === 'same') {
                candidateNumbers = Object.entries(cntMap).filter(([, c]) => c >= 2).map(([n]) => n);
            } else if (setMode === 'diff') {
                candidateNumbers = Object.entries(cntMap).filter(([, c]) => c === 1).map(([n]) => n);
            } else {
                candidateNumbers = Object.keys(cntMap);
            }
            candidateNumbers.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

            const kills = excludeKills || {};
            let top5ColdNumbers = [];
            if (kills.coldTop5 && coldSourceData && coldSourceData.numberSnapshot) {
                top5ColdNumbers = Object.entries(coldSourceData.numberSnapshot)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([n]) => n.toString().padStart(2, '0'));
            }

            const excludedNumbers = [];
            const finalNumbers = [];

            candidateNumbers.forEach(num => {
                const numInt = parseInt(num, 10);
                const z = getZodiac(numInt);
                const tail = numInt % 10;
                const wave = getColor(num);

                const isKilled = 
                    (kills.zodiacs && kills.zodiacs.includes(z)) ||
                    (kills.tails && kills.tails.includes(tail)) ||
                    (kills.waves && kills.waves.includes(wave)) ||
                    (kills.coldTop5 && top5ColdNumbers.includes(num)) ||
                    (kills.excludedSingles && kills.excludedSingles.includes(num));

                if (isKilled) {
                    excludedNumbers.push(num);
                } else {
                    finalNumbers.push(num);
                }
            });

            return {
                candidateNumbers,
                finalNumbers,
                excludedNumbers
            };
        }

        const SET_MODE_LABELS = { all: '并集所有号码', and: '严格交集号码', same: '共有重合号码', diff: '独有特征号码' };
        const SET_MODE_ORDER = ['all', 'and', 'same', 'diff'];

        function cycleSetMode() {
            const idx = SET_MODE_ORDER.indexOf(state.setMode);
            state.setMode = SET_MODE_ORDER[(idx + 1) % SET_MODE_ORDER.length];
            updateSetModeButton();
        }
        function updateSetModeButton() {
            const btn = document.getElementById('setModeBtn');
            if (btn) btn.textContent = '📊 号码集: ' + (SET_MODE_LABELS[state.setMode] || '所有号码') + '（点按切换）';
        }

        function resetColdSelection() {
            ['numbers', 'zodiacs', 'hotNumbers', 'coldNumbers', 'hotZodiacs', 'coldZodiacs', 'allHotNumbers', 'allColdNumbers', 'allHotZodiacs', 'allColdZodiacs', 'hotNumberRange', 'allHotNumberRange', 'hotZodiacRange', 'allHotZodiacRange', 'wave', 'halfwave', 'jiaYe', 'head', 'tail', 'wuxing', 'wuxingCold', 'halfHead', 'region', 'omissionRange', 'omissionZodiacRange', 'pingOmissionRange', 'pingOmissionZodiacRange'].forEach(type => {
                const el = document.getElementById(`coldOption_${type}`);
                if (el) el.checked = false;
                const countEl = document.getElementById(`coldOption_${type}_count`);
                if (countEl) countEl.value = '10';
                if (countEl && (type === 'wuxingCold' || type === 'wuxing' || type === 'halfwave' || type === 'head' || type === 'halfHead' || type === 'region')) countEl.value = '1';
                if (countEl && type === 'tail') countEl.value = '2';
                if (countEl && (type === 'zodiacs' || type === 'hotZodiacs' || type === 'coldZodiacs' || type === 'allHotZodiacs' || type === 'allColdZodiacs')) countEl.value = '3';
            });
            const resetRanges = [
                { start: 'coldOption_omissionRange_start', end: 'coldOption_omissionRange_end', sVal: '1', eVal: '10' },
                { start: 'coldOption_omissionZodiacRange_start', end: 'coldOption_omissionZodiacRange_end', sVal: '1', eVal: '3' },
                { start: 'coldOption_pingOmissionRange_start', end: 'coldOption_pingOmissionRange_end', sVal: '1', eVal: '10' },
                { start: 'coldOption_pingOmissionZodiacRange_start', end: 'coldOption_pingOmissionZodiacRange_end', sVal: '1', eVal: '3' },
                { start: 'coldOption_hotNumberRange_start', end: 'coldOption_hotNumberRange_end', sVal: '1', eVal: '10' },
                { start: 'coldOption_allHotNumberRange_start', end: 'coldOption_allHotNumberRange_end', sVal: '1', eVal: '10' },
                { start: 'coldOption_hotZodiacRange_start', end: 'coldOption_hotZodiacRange_end', sVal: '1', eVal: '3' },
                { start: 'coldOption_allHotZodiacRange_start', end: 'coldOption_allHotZodiacRange_end', sVal: '1', eVal: '3' }
            ];
            resetRanges.forEach(r => {
                const sEl = document.getElementById(r.start);
                if (sEl) sEl.value = r.sVal;
                const eEl = document.getElementById(r.end);
                if (eEl) eEl.value = r.eVal;
            });
            CONFIG.zodiacMap[state.currentYear].forEach(z => {
                const el = document.getElementById(`zodiacOption_${z}`);
                if (el) el.checked = false;
            });
            ['red', 'blue', 'green'].forEach(w => {
                const el = document.getElementById('waveOption_' + w);
                if (el) el.checked = false;
            });
            ['金', '木', '水', '火', '土'].forEach(wx => {
                const el = document.getElementById('wuxingOption_' + wx);
                if (el) el.checked = false;
            });
            WUXING_DS_LIST.forEach(wxds => {
                const el = document.getElementById('wuxingDsOption_' + wxds);
                if (el) el.checked = false;
            });
            ['heDan', 'heShuang', 'heDa', 'heXiao', 'weiDa', 'weiXiao'].forEach(m => {
                const el = document.getElementById(`morphOption_${m}`);
                if (el) el.checked = false;
            });
            for (let i = 1; i <= 13; i++) {
                const el = document.getElementById(`heOption_${i}`);
                if (el) el.checked = false;
            }
            for (let i = 0; i <= 9; i++) {
                const el = document.getElementById(`heTailOption_${i}`);
                if (el) el.checked = false;
            }
            for (let i = 0; i <= 4; i++) {
                const el = document.getElementById(`headOption_${i}`);
                if (el) el.checked = false;
            }
            for (let i = 0; i <= 9; i++) {
                const el = document.getElementById(`tailOption_${i}`);
                if (el) el.checked = false;
            }
            document.getElementById('coldOption_inputNumbers').value = '';
            state.coldSelection = null;
            state.omissionRangeSegments = [];
            if (state.rangeSegments) {
                Object.keys(state.rangeSegments).forEach(k => { state.rangeSegments[k] = []; });
            }
            renderAllRangeSegments();
            clearAllKills();
            setFilterCalcMode('all');
            const summaryEl = document.getElementById('coldSelectionSummary');
            if (summaryEl) summaryEl.textContent = '请选择自由K线选项后点击生成';
            updateAllDualSliders();
        }
        function toggleColdSection(section, selectAll) {
            const omissionIds = ['numbers', 'zodiacs', 'wave', 'halfwave', 'jiaYe', 'head', 'tail', 'wuxing', 'wuxingCold', 'halfHead', 'omissionRange', 'omissionZodiacRange', 'pingOmissionRange', 'pingOmissionZodiacRange'];
            const waveIds = ['red', 'blue', 'green'];
            const hotcoldIds = ['hotNumbers', 'coldNumbers', 'hotZodiacs', 'coldZodiacs', 'allHotNumbers', 'allColdNumbers', 'allHotZodiacs', 'allColdZodiacs', 'hotNumberRange', 'allHotNumberRange', 'hotZodiacRange', 'allHotZodiacRange'];
            if (section === 'wave') {
                waveIds.forEach(w => {
                    const el = document.getElementById('waveOption_' + w);
                    if (el) el.checked = selectAll;
                });
            } else if (section === 'wuxing') {
                ['金', '木', '水', '火', '土'].forEach(wx => {
                    const el = document.getElementById('wuxingOption_' + wx);
                    if (el) el.checked = selectAll;
                });
            } else if (section === 'wuxingDs') {
                WUXING_DS_LIST.forEach(wxds => {
                    const el = document.getElementById('wuxingDsOption_' + wxds);
                    if (el) el.checked = selectAll;
                });
            } else if (section === 'wuxingDsDan') {
                WUXING_DS_LIST.forEach(wxds => {
                    const el = document.getElementById('wuxingDsOption_' + wxds);
                    if (el) {
                        if (wxds.endsWith('单')) el.checked = selectAll;
                        else el.checked = false;
                    }
                });
            } else if (section === 'wuxingDsShuang') {
                WUXING_DS_LIST.forEach(wxds => {
                    const el = document.getElementById('wuxingDsOption_' + wxds);
                    if (el) {
                        if (wxds.endsWith('双')) el.checked = selectAll;
                        else el.checked = false;
                    }
                });
            } else if (section === 'zodiac') {
                const zodiacs = CONFIG.zodiacMap[state.currentYear] || [];
                zodiacs.forEach(z => {
                    const el = document.getElementById('zodiacOption_' + z);
                    if (el) el.checked = selectAll;
                });
            } else if (section === 'morph') {
                ['heDan', 'heShuang', 'heDa', 'heXiao', 'weiDa', 'weiXiao'].forEach(m => {
                    const el = document.getElementById('morphOption_' + m);
                    if (el) el.checked = selectAll;
                });
            } else if (section === 'he') {
                for (let i = 1; i <= 13; i++) {
                    const el = document.getElementById('heOption_' + i);
                    if (el) el.checked = selectAll;
                }
            } else if (section === 'heTail') {
                for (let i = 0; i <= 9; i++) {
                    const el = document.getElementById('heTailOption_' + i);
                    if (el) el.checked = selectAll;
                }
            } else if (section === 'headSelect') {
                for (let i = 0; i <= 4; i++) {
                    const el = document.getElementById('headOption_' + i);
                    if (el) el.checked = selectAll;
                }
            } else if (section === 'tailSelect') {
                for (let i = 0; i <= 9; i++) {
                    const el = document.getElementById('tailOption_' + i);
                    if (el) el.checked = selectAll;
                }
            } else {
                const ids = section === 'omission' ? omissionIds : hotcoldIds;
                ids.forEach(type => {
                    const el = document.getElementById(`coldOption_${type}`);
                    if (el) el.checked = selectAll;
                });
                if (!selectAll) {
                    if (section === 'omission') {
                        clearRangeSegments('omissionRange');
                        clearRangeSegments('omissionZodiacRange');
                        clearRangeSegments('pingOmissionRange');
                        clearRangeSegments('pingOmissionZodiacRange');
                    } else if (section === 'hotcold') {
                        clearRangeSegments('hotNumberRange');
                        clearRangeSegments('allHotNumberRange');
                        clearRangeSegments('hotZodiacRange');
                        clearRangeSegments('allHotZodiacRange');
                    }
                }
            }
            if (typeof updateLiveSelectionPreview === 'function') {
                updateLiveSelectionPreview();
            }
        }

        function clearColdInput() {
            document.getElementById('coldOption_inputNumbers').value = '';
            if (typeof updateLiveSelectionPreview === 'function') {
                updateLiveSelectionPreview();
            }
        }

        // ==================== 快捷区间 & 量化策略预设 & 滑动条交互 ====================
        const DUAL_RANGE_CONFIGS = {
            omissionRange: { max: 49, unit: '码', leftLabel: '多', rightLabel: '少' },
            omissionZodiacRange: { max: 12, unit: '肖', leftLabel: '多', rightLabel: '少' },
            pingOmissionRange: { max: 49, unit: '码', leftLabel: '多', rightLabel: '少' },
            pingOmissionZodiacRange: { max: 12, unit: '肖', leftLabel: '多', rightLabel: '少' },
            hotNumberRange: { max: 49, unit: '码', leftLabel: '热', rightLabel: '冷' },
            allHotNumberRange: { max: 49, unit: '码', leftLabel: '热', rightLabel: '冷' },
            hotZodiacRange: { max: 12, unit: '肖', leftLabel: '热', rightLabel: '冷' },
            allHotZodiacRange: { max: 12, unit: '肖', leftLabel: '热', rightLabel: '冷' }
        };

        let coldKlineDebounceTimer = null;
        let coldPreviewDebounceTimer = null;

        function requestColdKlineUpdate(immediate = false) {
            if (state.currentMode !== 'cold_custom') return;
            if (immediate) {
                if (coldKlineDebounceTimer) {
                    clearTimeout(coldKlineDebounceTimer);
                    coldKlineDebounceTimer = null;
                }
                generateColdKline();
                return;
            }
            if (coldKlineDebounceTimer) clearTimeout(coldKlineDebounceTimer);
            coldKlineDebounceTimer = setTimeout(() => {
                coldKlineDebounceTimer = null;
                generateColdKline();
            }, 180);
        }

        function requestLivePreviewUpdate(immediate = false) {
            if (immediate) {
                if (coldPreviewDebounceTimer) {
                    clearTimeout(coldPreviewDebounceTimer);
                    coldPreviewDebounceTimer = null;
                }
                updateLiveSelectionPreview();
                return;
            }
            if (coldPreviewDebounceTimer) return;
            coldPreviewDebounceTimer = setTimeout(() => {
                coldPreviewDebounceTimer = null;
                updateLiveSelectionPreview();
            }, 120);
        }

        function updateDualSliderUI(rangeType, maxVal, unit) {
            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: maxVal || 49, unit: unit || '码' };
            const max = cfg.max;
            const u = cfg.unit;
            const sEl = document.getElementById(`coldOption_${rangeType}_start`);
            const eEl = document.getElementById(`coldOption_${rangeType}_end`);
            const track = document.getElementById(`track_${rangeType}`);
            const badge = document.getElementById(`badge_${rangeType}`);
            const pillStart = document.getElementById(`coordPill_${rangeType}_start`);
            const pillEnd = document.getElementById(`coordPill_${rangeType}_end`);
            const sValEl = document.getElementById(`stepperVal_${rangeType}_start`);
            const eValEl = document.getElementById(`stepperVal_${rangeType}_end`);

            if (!sEl || !eEl) return;
            let sVal = parseInt(sEl.value, 10);
            let eVal = parseInt(eEl.value, 10);
            if (isNaN(sVal)) sVal = 1;
            if (isNaN(eVal)) eVal = max;
            if (sVal > eVal) {
                const temp = sVal;
                sVal = eVal;
                eVal = temp;
            }
            const minRatio = max > 1 ? (sVal - 1) / (max - 1) : 0;
            const maxRatio = max > 1 ? (eVal - 1) / (max - 1) : 1;
            const minPercent = minRatio * 100;
            const maxPercent = maxRatio * 100;

            if (track) {
                track.style.left = `${minPercent}%`;
                track.style.width = `${Math.max(0, maxPercent - minPercent)}%`;
            }

            if (sValEl) sValEl.textContent = String(sVal);
            if (eValEl) eValEl.textContent = String(eVal);

            if (pillStart) {
                if (sVal === eVal) {
                    pillStart.style.left = `calc(9px + (100% - 18px) * ${minRatio})`;
                    pillStart.textContent = String(sVal);
                    pillStart.style.display = 'block';
                    if (pillEnd) pillEnd.style.display = 'none';
                } else if (Math.abs(maxPercent - minPercent) < 7) {
                    const midRatio = (minRatio + maxRatio) / 2;
                    pillStart.style.left = `calc(9px + (100% - 18px) * ${midRatio})`;
                    pillStart.textContent = `${sVal}~${eVal}`;
                    pillStart.style.display = 'block';
                    if (pillEnd) pillEnd.style.display = 'none';
                } else {
                    pillStart.style.left = `calc(9px + (100% - 18px) * ${minRatio})`;
                    pillStart.textContent = String(sVal);
                    pillStart.style.display = 'block';
                    if (pillEnd) {
                        pillEnd.style.left = `calc(9px + (100% - 18px) * ${maxRatio})`;
                        pillEnd.textContent = String(eVal);
                        pillEnd.style.display = 'block';
                    }
                }
            }

            if (badge) {
                const count = eVal - sVal + 1;
                const segs = getRangeSegments(rangeType);
                const orient = (cfg.leftLabel && cfg.rightLabel) ? `[${cfg.leftLabel}→${cfg.rightLabel}] ` : '';
                if (segs && segs.length > 0) {
                    const omissionSourceData = getSelectedColdSourceData();
                    const hotColdSourceData = (typeof getSelectedHotColdSourceData === 'function') ? getSelectedHotColdSourceData() : omissionSourceData;
                    const itemSet = new Set();
                    segs.forEach(seg => {
                        getItemsForRangeType(rangeType, seg.start, seg.end, omissionSourceData, hotColdSourceData).forEach(it => itemSet.add(it));
                    });
                    badge.textContent = `滑块:${orient}第${sVal}~${eVal}位 | 多段(${segs.length}段)共${itemSet.size}${u}`;
                } else {
                    badge.textContent = `${orient}第 ${sVal} ~ ${eVal} 位 (共${count}${u})`;
                }
            }
        }

        function onDualSliderChange(rangeType, maxVal, unit, isStart) {
            const cb = document.getElementById(`coldOption_${rangeType}`);
            if (cb && !cb.checked) cb.checked = true;
            const sEl = document.getElementById(`coldOption_${rangeType}_start`);
            const eEl = document.getElementById(`coldOption_${rangeType}_end`);
            if (sEl && eEl) {
                let sVal = parseInt(sEl.value, 10);
                let eVal = parseInt(eEl.value, 10);
                if (isStart && sVal > eVal) {
                    eEl.value = String(sVal);
                } else if (!isStart && eVal < sVal) {
                    sEl.value = String(eVal);
                }
            }
            updateDualSliderUI(rangeType, maxVal, unit);
            requestLivePreviewUpdate(false);
            requestColdKlineUpdate(false);
        }

        function onDualSliderCommit(rangeType) {
            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: 49, unit: '码' };
            updateDualSliderUI(rangeType, cfg.max, cfg.unit);
            requestLivePreviewUpdate(true);
            requestColdKlineUpdate(true);
        }

        function updateAllDualSliders() {
            Object.keys(DUAL_RANGE_CONFIGS).forEach(key => {
                const cfg = DUAL_RANGE_CONFIGS[key];
                updateDualSliderUI(key, cfg.max, cfg.unit);
            });
        }

        function initAllDualSliders() {
            renderAllRangeSegments();
            updateAllDualSliders();
            Object.keys(DUAL_RANGE_CONFIGS).forEach(rangeType => {
                const cfg = DUAL_RANGE_CONFIGS[rangeType];
                const sEl = document.getElementById(`coldOption_${rangeType}_start`);
                const eEl = document.getElementById(`coldOption_${rangeType}_end`);
                const wrap = sEl ? sEl.closest('.dual-slider-wrap') : null;
                if (!sEl || !eEl || !wrap) return;

                let activeHandle = null;

                const getValFromX = (clientX) => {
                    const rect = wrap.getBoundingClientRect();
                    if (rect.width <= 0) return 1;
                    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
                    return Math.round(1 + ratio * (cfg.max - 1));
                };

                const updateSliderPosition = (targetVal) => {
                    const cb = document.getElementById(`coldOption_${rangeType}`);
                    if (cb && !cb.checked) cb.checked = true;

                    let sVal = parseInt(sEl.value, 10);
                    let eVal = parseInt(eEl.value, 10);

                    if (activeHandle === 'start') {
                        sVal = Math.max(1, Math.min(targetVal, eVal));
                        sEl.value = String(sVal);
                        sEl.style.zIndex = '10';
                        eEl.style.zIndex = '5';
                    } else if (activeHandle === 'end') {
                        eVal = Math.min(cfg.max, Math.max(targetVal, sVal));
                        eEl.value = String(eVal);
                        eEl.style.zIndex = '10';
                        sEl.style.zIndex = '5';
                    }
                    updateDualSliderUI(rangeType, cfg.max, cfg.unit);
                    requestLivePreviewUpdate(false);
                    requestColdKlineUpdate(false);
                };

                wrap.addEventListener('pointerdown', (e) => {
                    const sVal = parseInt(sEl.value, 10);
                    const eVal = parseInt(eEl.value, 10);
                    const targetVal = getValFromX(e.clientX);
                    const distToStart = Math.abs(targetVal - sVal);
                    const distToEnd = Math.abs(targetVal - eVal);

                    if (e.target === sEl) {
                        activeHandle = 'start';
                    } else if (e.target === eEl) {
                        activeHandle = 'end';
                    } else if (distToStart <= distToEnd) {
                        activeHandle = 'start';
                    } else {
                        activeHandle = 'end';
                    }

                    try {
                        wrap.setPointerCapture(e.pointerId);
                    } catch (err) {}

                    updateSliderPosition(targetVal);
                });

                wrap.addEventListener('pointermove', (e) => {
                    if (!activeHandle) return;
                    e.preventDefault();
                    const targetVal = getValFromX(e.clientX);
                    updateSliderPosition(targetVal);
                });

                const onPointerEnd = (e) => {
                    if (!activeHandle) return;
                    activeHandle = null;
                    try {
                        wrap.releasePointerCapture(e.pointerId);
                    } catch (err) {}
                    onDualSliderCommit(rangeType);
                };

                wrap.addEventListener('pointerup', onPointerEnd);
                wrap.addEventListener('pointercancel', onPointerEnd);

                sEl.addEventListener('change', () => onDualSliderCommit(rangeType));
                eEl.addEventListener('change', () => onDualSliderCommit(rangeType));
            });
        }

        function stepDualRange(rangeType, bound, delta) {
            const cb = document.getElementById(`coldOption_${rangeType}`);
            if (cb && !cb.checked) cb.checked = true;
            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: 49, unit: '码' };
            const sEl = document.getElementById(`coldOption_${rangeType}_start`);
            const eEl = document.getElementById(`coldOption_${rangeType}_end`);
            if (!sEl || !eEl) return;
            let sVal = parseInt(sEl.value, 10) || 1;
            let eVal = parseInt(eEl.value, 10) || cfg.max;

            if (bound === 'start') {
                sVal = Math.max(1, Math.min(cfg.max, sVal + delta));
                if (sVal > eVal) {
                    eVal = sVal;
                    eEl.value = String(eVal);
                }
                sEl.value = String(sVal);
            } else if (bound === 'end') {
                eVal = Math.max(1, Math.min(cfg.max, eVal + delta));
                if (eVal < sVal) {
                    sVal = eVal;
                    sEl.value = String(sVal);
                }
                eEl.value = String(eVal);
            }
            updateDualSliderUI(rangeType, cfg.max, cfg.unit);
            requestLivePreviewUpdate(true);
            requestColdKlineUpdate(true);
        }

        function setQuickRange(rangeType, start, end) {
            const cb = document.getElementById(`coldOption_${rangeType}`);
            if (cb) cb.checked = true;
            const sEl = document.getElementById(`coldOption_${rangeType}_start`);
            if (sEl) sEl.value = String(start);
            const eEl = document.getElementById(`coldOption_${rangeType}_end`);
            if (eEl) eEl.value = String(end);
            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: 49, unit: '码' };
            updateDualSliderUI(rangeType, cfg.max, cfg.unit);
            updateLiveSelectionPreview();
            requestColdKlineUpdate(true);
            showNotification(`已设置区间: 第${start}至第${end}位`);
        }

        const RANGE_TYPE_NAMES = {
            omissionRange: '特码遗漏',
            omissionZodiacRange: '遗漏肖',
            pingOmissionRange: '平特遗漏',
            pingOmissionZodiacRange: '平特遗漏肖',
            hotNumberRange: '平特热码',
            allHotNumberRange: '特码热码',
            hotZodiacRange: '平特热肖',
            allHotZodiacRange: '特码热肖'
        };

        function getRangeSegments(rangeType) {
            if (!state.rangeSegments) {
                state.rangeSegments = {
                    omissionRange: [],
                    omissionZodiacRange: [],
                    pingOmissionRange: [],
                    pingOmissionZodiacRange: [],
                    hotNumberRange: [],
                    allHotNumberRange: [],
                    hotZodiacRange: [],
                    allHotZodiacRange: []
                };
            }
            if (!state.rangeSegments[rangeType]) {
                state.rangeSegments[rangeType] = [];
            }
            if (rangeType === 'omissionRange' && state.omissionRangeSegments && state.omissionRangeSegments.length > 0 && state.rangeSegments.omissionRange.length === 0) {
                state.rangeSegments.omissionRange = state.omissionRangeSegments;
            }
            return state.rangeSegments[rangeType];
        }

        function getItemsForRangeType(rangeType, start, end, omissionSourceData, hotColdSourceData) {
            const omSrc = omissionSourceData || getSelectedColdSourceData();
            const hcSrc = hotColdSourceData || ((typeof getSelectedHotColdSourceData === 'function') ? getSelectedHotColdSourceData() : omSrc);
            if (rangeType === 'omissionRange') {
                return getColdOmissionRangeNumbers(omSrc, start, end);
            } else if (rangeType === 'omissionZodiacRange') {
                return getColdOmissionRangeZodiacs(omSrc, start, end);
            } else if (rangeType === 'pingOmissionRange') {
                return getPingOmissionRangeNumbers(omSrc, start, end);
            } else if (rangeType === 'pingOmissionZodiacRange') {
                return getPingOmissionRangeZodiacs(omSrc, start, end);
            } else if (rangeType === 'hotNumberRange') {
                return getHotNumberRange(hcSrc, start, end);
            } else if (rangeType === 'allHotNumberRange') {
                return getAllHotNumberRange(hcSrc, start, end);
            } else if (rangeType === 'hotZodiacRange') {
                return getHotZodiacRange(hcSrc, start, end);
            } else if (rangeType === 'allHotZodiacRange') {
                return getAllHotZodiacRange(hcSrc, start, end);
            }
            return [];
        }

        function addRangeSegment(rangeType) {
            const cb = document.getElementById(`coldOption_${rangeType}`);
            if (cb && !cb.checked) cb.checked = true;
            const sEl = document.getElementById(`coldOption_${rangeType}_start`);
            const eEl = document.getElementById(`coldOption_${rangeType}_end`);
            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: 49, unit: '码' };
            const u = cfg.unit;
            const rName = RANGE_TYPE_NAMES[rangeType] || '区间';
            if (!sEl || !eEl) return;
            const s = Math.min(parseInt(sEl.value, 10) || 1, parseInt(eEl.value, 10) || cfg.max);
            const e = Math.max(parseInt(sEl.value, 10) || 1, parseInt(eEl.value, 10) || cfg.max);

            const segments = getRangeSegments(rangeType);
            const exists = segments.some(seg => seg.start === s && seg.end === e);
            if (exists) {
                showNotification(`[${rName}] 分段 [第${s}~${e}位] 已在多段选区中`);
                return;
            }

            segments.push({ start: s, end: e });
            segments.sort((a, b) => a.start - b.start || a.end - b.end);

            if (rangeType === 'omissionRange') {
                state.omissionRangeSegments = segments;
            }

            renderRangeSegments(rangeType);
            updateDualSliderUI(rangeType, cfg.max, u);
            updateLiveSelectionPreview();
            requestColdKlineUpdate(true);
            showNotification(`已添加[${rName}]分段: 第${s}至第${e}位 (共${e - s + 1}${u})`);
        }

        function removeRangeSegment(rangeType, index) {
            const segments = getRangeSegments(rangeType);
            if (!segments) return;
            segments.splice(index, 1);
            if (rangeType === 'omissionRange') {
                state.omissionRangeSegments = segments;
            }
            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: 49, unit: '码' };
            renderRangeSegments(rangeType);
            updateDualSliderUI(rangeType, cfg.max, cfg.unit);
            updateLiveSelectionPreview();
            requestColdKlineUpdate(true);
        }

        function clearRangeSegments(rangeType) {
            const segments = getRangeSegments(rangeType);
            segments.length = 0;
            if (rangeType === 'omissionRange') {
                state.omissionRangeSegments = [];
            }
            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: 49, unit: '码' };
            const rName = RANGE_TYPE_NAMES[rangeType] || '区间';
            renderRangeSegments(rangeType);
            updateDualSliderUI(rangeType, cfg.max, cfg.unit);
            updateLiveSelectionPreview();
            requestColdKlineUpdate(true);
            showNotification(`已清空[${rName}]所有多段选区，恢复单段模式`);
        }

        function loadRangeSegment(rangeType, start, end) {
            const sEl = document.getElementById(`coldOption_${rangeType}_start`);
            const eEl = document.getElementById(`coldOption_${rangeType}_end`);
            if (sEl) sEl.value = String(start);
            if (eEl) eEl.value = String(end);
            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: 49, unit: '码' };
            updateDualSliderUI(rangeType, cfg.max, cfg.unit);
            const rName = RANGE_TYPE_NAMES[rangeType] || '区间';
            showNotification(`已载入[${rName}]分段: 第${start}至第${end}位`);
        }

        function renderRangeSegments(rangeType) {
            const container = document.getElementById(`segments_container_${rangeType}`);
            const chipsEl = document.getElementById(`chips_${rangeType}`);
            if (!container || !chipsEl) return;

            const segments = getRangeSegments(rangeType);
            if (!segments || segments.length === 0) {
                container.style.display = 'none';
                chipsEl.innerHTML = '';
                return;
            }

            const cfg = DUAL_RANGE_CONFIGS[rangeType] || { max: 49, unit: '码' };
            const u = cfg.unit;

            container.style.display = 'block';
            chipsEl.innerHTML = segments.map((seg, idx) => {
                const count = Math.max(0, seg.end - seg.start + 1);
                return `<span class="segment-chip" title="点击载入滑块，点击✕删除" onclick="loadRangeSegment('${rangeType}', ${seg.start}, ${seg.end})">` +
                    `<span>第 ${seg.start}~${seg.end}位 (${count}${u})</span>` +
                    `<span class="chip-del-btn" onclick="event.stopPropagation(); removeRangeSegment('${rangeType}', ${idx});" title="移除此段">✕</span>` +
                `</span>`;
            }).join('');
        }

        function renderAllRangeSegments() {
            ['omissionRange', 'omissionZodiacRange', 'pingOmissionRange', 'pingOmissionZodiacRange', 'hotNumberRange', 'allHotNumberRange', 'hotZodiacRange', 'allHotZodiacRange'].forEach(rk => {
                renderRangeSegments(rk);
            });
        }

        // Backwards compatibility wrappers
        function addOmissionRangeSegment() { addRangeSegment('omissionRange'); }
        function removeOmissionRangeSegment(idx) { removeRangeSegment('omissionRange', idx); }
        function clearOmissionRangeSegments() { clearRangeSegments('omissionRange'); }
        function loadOmissionRangeSegment(s, e) { loadRangeSegment('omissionRange', s, e); }
        function renderOmissionRangeSegments() { renderRangeSegments('omissionRange'); }

        function applyStrategyPreset(presetKey) {
            resetColdSelection();
            if (presetKey === 'hot_combo' || presetKey === 'hotCore10') {
                setQuickRange('hotNumberRange', 1, 10);
                setQuickRange('hotZodiacRange', 1, 3);
            } else if (presetKey === 'cold_sniper' || presetKey === 'extremeOmission') {
                setQuickRange('omissionRange', 15, 49);
                setQuickRange('omissionZodiacRange', 1, 3);
            } else if (presetKey === 'warm_middle') {
                setQuickRange('hotNumberRange', 11, 30);
                setQuickRange('hotZodiacRange', 4, 8);
            } else if (presetKey === 'hotZodiac3') {
                setQuickRange('hotZodiacRange', 1, 3);
            } else if (presetKey === 'balancedMix') {
                setQuickRange('hotZodiacRange', 1, 3);
                const w = document.getElementById('waveOption_red');
                if (w) w.checked = true;
            } else if (presetKey === 'coldRebound') {
                setQuickRange('omissionZodiacRange', 1, 3);
            }
            generateColdKline();
            showNotification('已应用量化策略并生成K线');
        }

        const USER_STRATEGIES_STORAGE_KEY = 'liuhe_user_strategies';

        function getUserStrategies() {
            try {
                const raw = localStorage.getItem(USER_STRATEGIES_STORAGE_KEY);
                return raw ? JSON.parse(raw) : {};
            } catch (e) {
                return {};
            }
        }

        function saveUserStrategies(strategies) {
            localStorage.setItem(USER_STRATEGIES_STORAGE_KEY, JSON.stringify(strategies));
        }

        function initUserStrategies() {
            const sel = document.getElementById('userStrategySel') || document.getElementById('userStrategySelect');
            if (!sel) return;
            const strategies = getUserStrategies();
            const names = Object.keys(strategies);
            sel.innerHTML = '<option value="">📂 我的自定策略...</option>' +
                names.map(name => `<option value="${name}">${name}</option>`).join('');
        }

        function saveCurrentStrategyPrompt() {
            const name = prompt('请输入自定义方案名称 (如: 我的平特热肖+红波组合):');
            if (!name || !name.trim()) return;
            const trimmedName = name.trim();
            
            const config = {
                checkedOptions: {},
                selectCounts: {},
                ranges: {},
                rangeSegments: {
                    omissionRange: getRangeSegments('omissionRange').map(s => ({ ...s })),
                    omissionZodiacRange: getRangeSegments('omissionZodiacRange').map(s => ({ ...s })),
                    pingOmissionRange: getRangeSegments('pingOmissionRange').map(s => ({ ...s })),
                    pingOmissionZodiacRange: getRangeSegments('pingOmissionZodiacRange').map(s => ({ ...s })),
                    hotNumberRange: getRangeSegments('hotNumberRange').map(s => ({ ...s })),
                    allHotNumberRange: getRangeSegments('allHotNumberRange').map(s => ({ ...s })),
                    hotZodiacRange: getRangeSegments('hotZodiacRange').map(s => ({ ...s })),
                    allHotZodiacRange: getRangeSegments('allHotZodiacRange').map(s => ({ ...s }))
                },
                omissionRangeSegments: getRangeSegments('omissionRange').map(s => ({ ...s })),
                zodiacs: [],
                waves: [],
                inputNumbers: document.getElementById('coldOption_inputNumbers')?.value || '',
                calcWindow: document.getElementById('coldCalcWindowSel')?.value || 'auto',
                filterCalcMode: state.filterCalcMode || 'all',
                excludeKills: JSON.parse(JSON.stringify(state.excludeKills || {}))
            };
            
            const types = ['numbers', 'zodiacs', 'hotNumbers', 'coldNumbers', 'hotZodiacs', 'coldZodiacs', 'allHotNumbers', 'allColdNumbers', 'allHotZodiacs', 'allColdZodiacs', 'hotNumberRange', 'allHotNumberRange', 'hotZodiacRange', 'allHotZodiacRange', 'wave', 'halfwave', 'jiaYe', 'head', 'tail', 'wuxing', 'wuxingCold', 'halfHead', 'region', 'omissionRange', 'omissionZodiacRange', 'pingOmissionRange', 'pingOmissionZodiacRange'];
            types.forEach(t => {
                const cb = document.getElementById(`coldOption_${t}`);
                if (cb && cb.checked) config.checkedOptions[t] = true;
                const count = document.getElementById(`coldOption_${t}_count`);
                if (count) config.selectCounts[t] = count.value;
            });

            const rangeKeys = ['omissionRange', 'omissionZodiacRange', 'pingOmissionRange', 'pingOmissionZodiacRange', 'hotNumberRange', 'allHotNumberRange', 'hotZodiacRange', 'allHotZodiacRange'];
            rangeKeys.forEach(rk => {
                config.ranges[rk] = {
                    start: document.getElementById(`coldOption_${rk}_start`)?.value || '1',
                    end: document.getElementById(`coldOption_${rk}_end`)?.value || '10'
                };
            });

            const zodiacs = CONFIG.zodiacMap[state.currentYear] || [];
            zodiacs.forEach(z => {
                if (document.getElementById(`zodiacOption_${z}`)?.checked) config.zodiacs.push(z);
            });

            ['red', 'blue', 'green'].forEach(w => {
                if (document.getElementById('waveOption_' + w)?.checked) config.waves.push(w);
            });

            config.wuxings = [];
            ['金', '木', '水', '火', '土'].forEach(wx => {
                if (document.getElementById('wuxingOption_' + wx)?.checked) config.wuxings.push(wx);
            });

            config.wuxingDs = [];
            WUXING_DS_LIST.forEach(wxds => {
                if (document.getElementById('wuxingDsOption_' + wxds)?.checked) config.wuxingDs.push(wxds);
            });

            config.morphs = [];
            ['heDan', 'heShuang', 'heDa', 'heXiao', 'weiDa', 'weiXiao'].forEach(m => {
                if (document.getElementById(`morphOption_${m}`)?.checked) config.morphs.push(m);
            });
            config.heNumbers = [];
            for (let i = 1; i <= 13; i++) {
                if (document.getElementById(`heOption_${i}`)?.checked) config.heNumbers.push(i);
            }
            config.heTails = [];
            for (let i = 0; i <= 9; i++) {
                if (document.getElementById(`heTailOption_${i}`)?.checked) config.heTails.push(i);
            }
            config.heads = [];
            for (let i = 0; i <= 4; i++) {
                if (document.getElementById(`headOption_${i}`)?.checked) config.heads.push(i);
            }
            config.tails = [];
            for (let i = 0; i <= 9; i++) {
                if (document.getElementById(`tailOption_${i}`)?.checked) config.tails.push(i);
            }

            const strategies = getUserStrategies();
            strategies[trimmedName] = config;
            saveUserStrategies(strategies);
            initUserStrategies();
            
            const sel = document.getElementById('userStrategySel') || document.getElementById('userStrategySelect');
            if (sel) sel.value = trimmedName;
            showNotification(`方案 "${trimmedName}" 保存成功！`);
        }

        function loadSelectedUserStrategy(name) {
            if (!name) return;
            const strategies = getUserStrategies();
            const config = strategies[name];
            if (!config) return;
            
            resetColdSelection();
            
            if (config.checkedOptions) {
                Object.keys(config.checkedOptions).forEach(t => {
                    const cb = document.getElementById(`coldOption_${t}`);
                    if (cb) cb.checked = true;
                });
            }
            if (config.selectCounts) {
                Object.keys(config.selectCounts).forEach(t => {
                    const count = document.getElementById(`coldOption_${t}_count`);
                    if (count) count.value = config.selectCounts[t];
                });
            }
            if (config.ranges) {
                Object.keys(config.ranges).forEach(rk => {
                    const sEl = document.getElementById(`coldOption_${rk}_start`);
                    const eEl = document.getElementById(`coldOption_${rk}_end`);
                    if (sEl && config.ranges[rk].start) sEl.value = config.ranges[rk].start;
                    if (eEl && config.ranges[rk].end) eEl.value = config.ranges[rk].end;
                });
            }
            if (config.rangeSegments) {
                Object.keys(config.rangeSegments).forEach(rk => {
                    if (Array.isArray(config.rangeSegments[rk])) {
                        const segs = getRangeSegments(rk);
                        segs.length = 0;
                        config.rangeSegments[rk].forEach(s => segs.push({ ...s }));
                        if (rk === 'omissionRange') state.omissionRangeSegments = segs;
                        renderRangeSegments(rk);
                    }
                });
            } else if (config.omissionRangeSegments && Array.isArray(config.omissionRangeSegments)) {
                const segs = getRangeSegments('omissionRange');
                segs.length = 0;
                config.omissionRangeSegments.forEach(s => segs.push({ ...s }));
                state.omissionRangeSegments = segs;
                renderRangeSegments('omissionRange');
            }
            if (config.zodiacs && Array.isArray(config.zodiacs)) {
                config.zodiacs.forEach(z => {
                    const el = document.getElementById(`zodiacOption_${z}`);
                    if (el) el.checked = true;
                });
            }
            if (config.waves && Array.isArray(config.waves)) {
                config.waves.forEach(w => {
                    const el = document.getElementById('waveOption_' + w);
                    if (el) el.checked = true;
                });
            }
            if (config.wuxings && Array.isArray(config.wuxings)) {
                config.wuxings.forEach(wx => {
                    const el = document.getElementById(`wuxingOption_${wx}`);
                    if (el) el.checked = true;
                });
            }
            if (config.wuxingDs && Array.isArray(config.wuxingDs)) {
                config.wuxingDs.forEach(wxds => {
                    const el = document.getElementById(`wuxingDsOption_${wxds}`);
                    if (el) el.checked = true;
                });
            }
            if (config.morphs && Array.isArray(config.morphs)) {
                config.morphs.forEach(m => {
                    const el = document.getElementById(`morphOption_${m}`);
                    if (el) el.checked = true;
                });
            }
            if (config.heNumbers && Array.isArray(config.heNumbers)) {
                config.heNumbers.forEach(h => {
                    const el = document.getElementById(`heOption_${h}`);
                    if (el) el.checked = true;
                });
            }
            if (config.heTails && Array.isArray(config.heTails)) {
                config.heTails.forEach(ht => {
                    const el = document.getElementById(`heTailOption_${ht}`);
                    if (el) el.checked = true;
                });
            }
            if (config.heads && Array.isArray(config.heads)) {
                config.heads.forEach(h => {
                    const el = document.getElementById(`headOption_${h}`);
                    if (el) el.checked = true;
                });
            }
            if (config.tails && Array.isArray(config.tails)) {
                config.tails.forEach(t => {
                    const el = document.getElementById(`tailOption_${t}`);
                    if (el) el.checked = true;
                });
            }
            if (config.inputNumbers) {
                const inp = document.getElementById('coldOption_inputNumbers');
                if (inp) inp.value = config.inputNumbers;
            }
            if (config.filterCalcMode) {
                setFilterCalcMode(config.filterCalcMode);
            }
            if (config.excludeKills) {
                state.excludeKills = JSON.parse(JSON.stringify(config.excludeKills));
                updateKillChipsUI();
            }
            if (config.calcWindow) {
                const sel = document.getElementById('coldCalcWindowSel');
                if (sel) sel.value = config.calcWindow;
                state.coldCalcWindow = config.calcWindow;
                updateColdCalcWindowUI();
            }
            updateAllDualSliders();
            generateColdKline();
            showNotification(`已载入方案: ${name}`);
        }

        function deleteSelectedUserStrategy() {
            const sel = document.getElementById('userStrategySel') || document.getElementById('userStrategySelect');
            if (!sel || !sel.value) return alert('请先选择要删除的方案');
            const name = sel.value;
            if (!confirm(`确定要删除方案 "${name}" 吗？`)) return;
            const strategies = getUserStrategies();
            delete strategies[name];
            saveUserStrategies(strategies);
            initUserStrategies();
            showNotification(`方案 "${name}" 已删除`);
        }

        // ==================== 自由K线量化指标回测计算 ====================
        function calculateKlineQuantMetrics(data) {
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

        function updateKlineMetricsDisplay() {
            const box = document.getElementById('klineMetricsBox');
            if (!box) return;
            
            const isColdCustom = state.currentMode === 'cold_custom';
            if (!isColdCustom && !state.coldSelection) {
                box.style.display = 'none';
                return;
            }
            box.style.display = 'block';

            const metrics = calculateKlineQuantMetrics(state.historyData);
            
            // Support both element ID variants
            const periodEl = document.getElementById('metricPeriodCount');
            const hitRateEl = document.getElementById('metricHitRate') || document.getElementById('kline-metric-winrate');
            const hitCountsEl = document.getElementById('metricHitCounts') || document.getElementById('kline-metric-winrate-sub');
            const maxStreakEl = document.getElementById('metricMaxStreak') || document.getElementById('kline-metric-streak');
            const curStreakEl = document.getElementById('metricCurrentStreak') || document.getElementById('kline-metric-cur-streak');
            const avgCycleEl = document.getElementById('metricAvgCycle') || document.getElementById('kline-metric-cycle');
            const roiEl = document.getElementById('metricROI') || document.getElementById('kline-metric-roi');
            const profitDetailEl = document.getElementById('metricProfitDetail');

            const setNumCount = (state.coldSelection && state.coldSelection.setNumbers) ? state.coldSelection.setNumbers.length : 0;
            const theoreticalWr = setNumCount > 0 ? ((setNumCount / 49) * 100).toFixed(1) : ((metrics.winRate > 0 ? (setNumCount || 10) / 49 * 100 : 20.4)).toFixed(1);

            if (periodEl) {
                periodEl.textContent = `共 ${metrics.total} 期回测`;
            }
            if (hitRateEl) {
                hitRateEl.textContent = `${metrics.winRate.toFixed(1)}%`;
                hitRateEl.style.color = metrics.winRate >= parseFloat(theoreticalWr) ? 'var(--up)' : 'var(--down)';
            }
            if (hitCountsEl) {
                hitCountsEl.textContent = `${metrics.hits}/${metrics.total} (理论 ${theoreticalWr}%)`;
            }
            if (maxStreakEl) {
                maxStreakEl.innerHTML = `<span style="color:var(--up);">+${metrics.maxWinStreak}</span> / <span style="color:var(--down);">-${metrics.maxLossStreak}</span>`;
            }
            if (curStreakEl) {
                if (metrics.currentStreak.type === 'win') {
                    curStreakEl.innerHTML = `当前: <b style="color:var(--up);">${metrics.currentStreak.count}连中 🔥</b>`;
                } else if (metrics.currentStreak.type === 'loss') {
                    curStreakEl.innerHTML = `当前: <b style="color:var(--down);">${metrics.currentStreak.count}连落 ❄️</b>`;
                } else {
                    curStreakEl.textContent = '当前: --';
                }
            }
            if (avgCycleEl) {
                avgCycleEl.textContent = `${metrics.avgCycle} 期`;
            }
            if (roiEl) {
                const roiVal = parseFloat(metrics.roi);
                roiEl.textContent = `${roiVal > 0 ? '+' : ''}${metrics.roi}%`;
                roiEl.style.color = roiVal >= 0 ? 'var(--up)' : 'var(--down)';
            }
            if (profitDetailEl) {
                profitDetailEl.textContent = `净指数: ${metrics.scoreSum >= 0 ? '+' : ''}${metrics.scoreSum}`;
            }
        }

        function updatePagination() {
            const total = state.historyData.length;
            const size = state.pageState.pageSize === 'all' ? total : state.pageState.pageSize;
            state.pageState.totalPage = Math.ceil(total / size) || 1;
        }

        function changePage(action) {
            if (action === 'first') state.pageState.currPage = 0;
            else if (action === 'prev') state.pageState.currPage = Math.max(0, state.pageState.currPage - 1);
            else if (action === 'next') state.pageState.currPage = Math.min(state.pageState.totalPage - 1, state.pageState.currPage + 1);
            else if (action === 'last') state.pageState.currPage = state.pageState.totalPage - 1;

            const total = state.historyData.length;
            const size = state.pageState.pageSize === 'all' ? total : parseInt(state.pageState.pageSize);
            
            const revPage = (state.pageState.totalPage - 1) - state.pageState.currPage; 
            
            let end = total - revPage * size;
            let start = Math.max(0, end - size);
            
            if (end <= 0) {
                end = 0;
                start = 0;
            }

            state.visibleData = state.historyData.slice(start, end);

            document.getElementById('pageInfo').textContent = `${start + 1}-${Math.min(end, total)}/共${total}期`;

            state.viewState.x = 0;
            
            updateDynamicHotCold();

            draw();
            if (state.visibleData.length > 0) {
                const latestVisible = state.visibleData[state.visibleData.length - 1];
                updateInfoPanel(latestVisible, true);
                syncChartHeader();
            }
        }

        function syncChartHeader() {
            const container = state.canvas ? state.canvas.parentElement : null;
            const header = container ? container.querySelector('.chart-header') : null;
            if (!state.canvas || !header) return;
            const currentTop = parseFloat(state.canvas.style.top) || 0;
            if (Math.abs(header.offsetHeight - currentTop) > 1) {
                resizeCanvas();
                draw();
            }
        }

        async function changePageSize(val) {
            state.pageState.pageSize = val === 'all' ? 'all' : parseInt(val);
            const requiredCount = state.pageState.pageSize === 'all' ? Infinity : state.pageState.pageSize;
            await ensureCrossYearData(requiredCount);
            // 期数选择同时决定冷热/遗漏统计窗口，切换后必须重建整套派生数据。
            // recalcData 内部会更新分页并定位到最新一页。
            recalcData();
        }

        function updatePeriodSelectors() {
            const s = document.getElementById('rangeStart');
            const e = document.getElementById('rangeEnd');
            s.innerHTML = '';
            e.innerHTML = '';

            state.historyData.forEach(d => {
                const opt = new Option(d.expect, d.expect);
                s.add(opt.cloneNode(true));
                e.add(opt);
            });

            if (state.historyData.length > 0) {
                s.value = state.historyData[0].expect;
                e.value = state.historyData[state.historyData.length - 1].expect;
            }
        }

        function calcIntervalStats() {
            const s = parseInt(document.getElementById('rangeStart').value);
            const e = parseInt(document.getElementById('rangeEnd').value);

            if (s > e) {
                alert('开始期号不能大于结束期号');
                return;
            }

            const rangeData = state.historyData.filter(d => {
                const exp = parseInt(d.expect);
                return exp >= s && exp <= e;
            });

            if (rangeData.length === 0) {
                document.getElementById('intervalResult').innerHTML = '<div style="color:var(--down);text-align:center;">无数据</div>';
                return;
            }

            const stats = {};
            CONFIG.zodiacMap[state.currentYear].forEach(z => stats[z] = 0);
            rangeData.forEach(d => stats[d.win]++);

            const sorted = Object.entries(stats).map(([k, v]) => ({ k, v, r: v / rangeData.length }))
                .sort((a, b) => b.v - a.v);

            document.getElementById('intervalResult').innerHTML = `
            <div style="margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid var(--border);color:var(--text-secondary);font-size:11px;">
                统计 ${rangeData.length} 期数据
            </div>
            ${sorted.map(x => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
                    <span style="font-weight:600;">${x.k}</span>
                    <span><b style="color:${x.v > rangeData.length / 12 ? 'var(--up)' : 'var(--text-secondary)'}">${x.v}</b> 
                    <span style="font-size:10px;color:var(--text-secondary);">(${Math.round(x.r * 100)}%)</span></span>
                </div>
            `).join('')}
        `;
        }

        function switchTrendMode(mode) {
            state.currentMode = mode;
            try {
                localStorage.setItem('aomen_selected_mode', mode);
            } catch (e) {}
            const labels = {
                zodiac: '特肖模式',
                oddeven: '单双模式',
                bigsmall: '大小模式',
                color: '波色模式',
                zodiac_hotcold: '特肖冷热',
                number_hotcold: '特码冷热',
                cold_custom: '特码综合K线',
                pingxiao_follow: '平特肖K线',
                special_zodiac_follow: '前期定特K线',
                pingtail_follow: '平特尾K线',
                pingnum_absent: '平特断号K线'
            };
            document.getElementById('info-mode').textContent = labels[mode] || '特码综合K线';
            document.getElementById('trendModeSel').value = mode;
            document.querySelectorAll('#modeQuickBar button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === mode);
            });
            const followWrap = document.getElementById('followWrap');
            if (followWrap) followWrap.style.display = mode === 'pingxiao_follow' ? 'block' : 'none';
            const tailWrap = document.getElementById('followTailWrap');
            if (tailWrap) tailWrap.style.display = mode === 'pingtail_follow' ? 'block' : 'none';
            const numAbsentWrap = document.getElementById('followNumAbsentWrap');
            if (numAbsentWrap) numAbsentWrap.style.display = mode === 'pingnum_absent' ? 'block' : 'none';
            const coldCard = document.getElementById('coldCard');
            if (coldCard) {
                const currentCat = state.activeSidebarCategory || 'all';
                const showInCat = (currentCat === 'all' || currentCat === 'stats');
                coldCard.style.display = (mode === 'cold_custom' && showInCat) ? 'block' : 'none';
            }
            if (mode === 'pingxiao_follow') {
                const posWrap = document.getElementById('followPosWrap');
                const zodWrap = document.getElementById('followZodiacWrap');
                const multiWrap = document.getElementById('followMultiWrap');
                const missNumWrap = document.getElementById('followMissNumWrap');
                if (posWrap) posWrap.style.display = state.followMode === 'position' ? 'block' : 'none';
                if (zodWrap) zodWrap.style.display = state.followMode === 'zodiac' ? 'block' : 'none';
                if (multiWrap) multiWrap.style.display = state.followMode === 'multi' ? 'block' : 'none';
                if (missNumWrap) missNumWrap.style.display = state.followMode === 'missnum' ? 'block' : 'none';
                updateFollowMissNumHint();
            }
            if (mode === 'pingtail_follow') {
                syncTailWraps();
            }
            recalcData();
        }

        function changeFollowPos(val) {
            state.followPosition = parseInt(val, 10) - 1;
            recalcData();
        }

        function changeFollowMode(val) {
            state.followMode = val;
            const posWrap = document.getElementById('followPosWrap');
            const zodWrap = document.getElementById('followZodiacWrap');
            const multiWrap = document.getElementById('followMultiWrap');
            const missNumWrap = document.getElementById('followMissNumWrap');
            if (posWrap) posWrap.style.display = val === 'position' ? 'block' : 'none';
            if (zodWrap) zodWrap.style.display = val === 'zodiac' ? 'block' : 'none';
            if (multiWrap) multiWrap.style.display = val === 'multi' ? 'block' : 'none';
            if (missNumWrap) missNumWrap.style.display = val === 'missnum' ? 'block' : 'none';
            if (val === 'missnum') updateFollowMissNumHint();
            recalcData();
        }

        function changeFollowZodiac(val) {
            state.followZodiac = val;
            recalcData();
        }

        function updateFollowZodiacOptions() {
            const sel = document.getElementById('followZodiacSel');
            if (!sel) return;
            const zodiacs = CONFIG.zodiacMap[state.currentYear] || [];
            const current = state.followZodiac;
            sel.innerHTML = zodiacs.map(z => `<option value="${z}">${z}</option>`).join('');
            if (zodiacs.includes(current)) {
                sel.value = current;
            } else {
                state.followZodiac = zodiacs[0] || null;
            }
            updateFollowMultiOptions();
            updateFollowMissNumOptions();
        }

        function updateFollowMultiOptions() {
            const wrap = document.getElementById('followMultiZodiacs');
            if (!wrap) return;
            const zodiacs = CONFIG.zodiacMap[state.currentYear] || [];
            let selected = (state.followMultiZodiacs || []).filter(z => zodiacs.includes(z));
            if (selected.length < 2 && zodiacs.length >= 2) {
                selected = zodiacs.slice(0, 2);
            }
            state.followMultiZodiacs = selected;
            wrap.innerHTML = zodiacs.map(z =>
                `<label style="display:flex;align-items:center;gap:5px;cursor:pointer;"><input type="checkbox" id="followMultiZodiac_${z}" onchange="toggleFollowMultiZodiac('${z}')" ${selected.includes(z) ? 'checked' : ''}> ${z}</label>`
            ).join('');
            updateFollowMultiHint();
        }

        function updateFollowMultiHint() {
            const hint = document.getElementById('followMultiHint');
            if (!hint) return;
            const n = (state.followMultiZodiacs || []).length;
            hint.textContent = n >= 2 && n <= 5
                ? `已选 ${n} 个生肖，全部开出+1、否则-1`
                : n < 2 ? '连肖至少选择2个生肖' : '连肖最多选择5个生肖';
        }

        function toggleFollowMultiZodiac(z) {
            const arr = [...(state.followMultiZodiacs || [])];
            const idx = arr.indexOf(z);
            const cb = document.getElementById('followMultiZodiac_' + z);
            if (idx >= 0) {
                if (arr.length <= 2) {
                    if (cb) cb.checked = true;
                    updateFollowMultiHint();
                    return;
                }
                arr.splice(idx, 1);
            } else {
                if (arr.length >= 5) {
                    if (cb) cb.checked = false;
                    updateFollowMultiHint();
                    return;
                }
                arr.push(z);
            }
            state.followMultiZodiacs = arr;
            updateFollowMultiHint();
            recalcData();
        }

        function updateFollowMissNumHint() {
            const hint = document.getElementById('followMissNumHint');
            if (!hint) return;
            const ranks = (state.followMissRanks || []).slice().sort((a, b) => a - b);
            hint.textContent = ranks.length >= 1
                ? `已选 ${ranks.length} 个名次：第${ranks.join('、第')}名，所属生肖全部开出+1、否则-1（排名每期变动）`
                : '请至少选择1个名次（最多5个）';
        }

        function updateFollowMissNumOptions() {
            const wrap = document.getElementById('followMissNumRanks');
            if (!wrap) return;
            const selected = new Set(state.followMissRanks || []);
            wrap.innerHTML = Array.from({ length: 15 }, (_, i) => i + 1).map(r =>
                `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;min-width:0;"><input type="checkbox" id="followMissNumRank_${r}" onchange="toggleFollowMissNumRank(${r})" ${selected.has(r) ? 'checked' : ''}> <span>第${r}名</span></label>`
            ).join('');
            updateFollowMissNumHint();
        }

        function toggleFollowMissNumRank(r) {
            const arr = [...(state.followMissRanks || [])];
            const idx = arr.indexOf(r);
            const cb = document.getElementById('followMissNumRank_' + r);
            if (idx >= 0) {
                if (arr.length <= 1) {
                    if (cb) cb.checked = true;
                    updateFollowMissNumHint();
                    return;
                }
                arr.splice(idx, 1);
            } else {
                if (arr.length >= 5) {
                    if (cb) cb.checked = false;
                    updateFollowMissNumHint();
                    return;
                }
                arr.push(r);
            }
            state.followMissRanks = arr;
            updateFollowMissNumHint();
            recalcData();
        }

        function getFollowLabel() {
            if (state.followMode === 'missnum') return '跟号';
            if (state.followMode === 'multi') return '连肖';
            return '跟肖';
        }

        function getFollowShortLabel() {
            if (state.followMode === 'missnum') return '号';
            if (state.followMode === 'multi') return '连';
            return '跟';
        }

        function syncTailWraps() {
            const posWrap = document.getElementById('tailPosWrap');
            const singleWrap = document.getElementById('tailSingleWrap');
            const multiWrap = document.getElementById('tailMultiWrap');
            const missWrap = document.getElementById('tailMissWrap');
            if (posWrap) posWrap.style.display = state.tailMode === 'position' ? 'block' : 'none';
            if (singleWrap) singleWrap.style.display = state.tailMode === 'single' ? 'block' : 'none';
            if (multiWrap) multiWrap.style.display = state.tailMode === 'multi' ? 'block' : 'none';
            if (missWrap) missWrap.style.display = state.tailMode === 'missrank' ? 'block' : 'none';
        }

        function changeTailMode(val) {
            state.tailMode = val;
            syncTailWraps();
            recalcData();
        }

        function changeTailPos(val) {
            state.tailPosition = parseInt(val, 10) - 1;
            recalcData();
        }

        function changeTailSingle(val) {
            state.tailValue = parseInt(val, 10);
            recalcData();
        }

        function updateTailOptions() {
            const singleSel = document.getElementById('tailSingleSel');
            if (singleSel) {
                singleSel.innerHTML = Array.from({ length: 10 }, (_, i) => `<option value="${i}">${i}尾</option>`).join('');
                singleSel.value = state.tailValue;
            }
            const multiWrap = document.getElementById('tailMultiList');
            if (multiWrap) {
                multiWrap.innerHTML = Array.from({ length: 10 }, (_, i) =>
                    `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;min-width:0;"><input type="checkbox" id="tailMulti_${i}" onchange="toggleTailMulti(${i})" ${state.tailMultiTails.includes(i) ? 'checked' : ''}> <span>${i}尾</span></label>`
                ).join('');
            }
            updateTailMultiHint();
            const missWrap = document.getElementById('tailMissRanks');
            if (missWrap) {
                missWrap.innerHTML = Array.from({ length: 10 }, (_, i) => i + 1).map(r =>
                    `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;min-width:0;"><input type="checkbox" id="tailMissRank_${r}" onchange="toggleTailMissRank(${r})" ${state.tailMissRanks.includes(r) ? 'checked' : ''}> <span>第${r}名</span></label>`
                ).join('');
            }
            updateTailMissHint();
        }

        function updateTailMultiHint() {
            const hint = document.getElementById('tailMultiHint');
            if (!hint) return;
            const n = (state.tailMultiTails || []).length;
            hint.textContent = n >= 2 && n <= 5
                ? `已选 ${n} 个尾，全部开出+1、否则-1`
                : n < 2 ? '连尾至少选择2个尾' : '连尾最多选择5个尾';
        }

        function toggleTailMulti(t) {
            const arr = [...(state.tailMultiTails || [])];
            const idx = arr.indexOf(t);
            const cb = document.getElementById('tailMulti_' + t);
            if (idx >= 0) {
                if (arr.length <= 2) {
                    if (cb) cb.checked = true;
                    updateTailMultiHint();
                    return;
                }
                arr.splice(idx, 1);
            } else {
                if (arr.length >= 5) {
                    if (cb) cb.checked = false;
                    updateTailMultiHint();
                    return;
                }
                arr.push(t);
            }
            state.tailMultiTails = arr;
            updateTailMultiHint();
            recalcData();
        }

        function updateTailMissHint() {
            const hint = document.getElementById('tailMissHint');
            if (!hint) return;
            const ranks = (state.tailMissRanks || []).slice().sort((a, b) => a - b);
            hint.textContent = ranks.length >= 1
                ? `已选 ${ranks.length} 个名次：第${ranks.join('、第')}名，尾数全部开出+1、否则-1（排名每期变动）`
                : '请至少选择1个名次（最多5个）';
        }

        function toggleTailMissRank(r) {
            const arr = [...(state.tailMissRanks || [])];
            const idx = arr.indexOf(r);
            const cb = document.getElementById('tailMissRank_' + r);
            if (idx >= 0) {
                if (arr.length <= 1) {
                    if (cb) cb.checked = true;
                    updateTailMissHint();
                    return;
                }
                arr.splice(idx, 1);
            } else {
                if (arr.length >= 5) {
                    if (cb) cb.checked = false;
                    updateTailMissHint();
                    return;
                }
                arr.push(r);
            }
            state.tailMissRanks = arr;
            updateTailMissHint();
            recalcData();
        }

        function updateFollowNumAbsentOptions() {
            const wrap = document.getElementById('followNumAbsentList');
            if (!wrap) return;
            const selected = new Set(state.followNumAbsent || []);
            wrap.innerHTML = Array.from({ length: 49 }, (_, i) => {
                const num = (i + 1).toString().padStart(2, '0');
                return `<label style="display:flex;align-items:center;justify-content:center;gap:3px;cursor:pointer;font-size:11px;min-width:0;"><input type="checkbox" id="followNumAbsent_${num}" onchange="toggleFollowNumAbsent('${num}')" ${selected.has(num) ? 'checked' : ''}> <span>${i + 1}</span></label>`;
            }).join('');
            updateFollowNumAbsentHint();
        }

        function updateFollowNumAbsentHint() {
            const hint = document.getElementById('followNumAbsentHint');
            if (!hint) return;
            const n = (state.followNumAbsent || []).length;
            hint.textContent = n >= 5 && n <= 12
                ? `已选 ${n} 个号码，全部不出+1、有任一开出-1`
                : n < 5 ? '至少选择5个号码' : '最多选择12个号码';
        }

        function toggleFollowNumAbsent(num) {
            const arr = [...(state.followNumAbsent || [])];
            const idx = arr.indexOf(num);
            const cb = document.getElementById('followNumAbsent_' + num);
            if (idx >= 0) {
                if (arr.length <= 5) {
                    if (cb) cb.checked = true;
                    updateFollowNumAbsentHint();
                    return;
                }
                arr.splice(idx, 1);
            } else {
                if (arr.length >= 12) {
                    if (cb) cb.checked = false;
                    updateFollowNumAbsentHint();
                    return;
                }
                arr.push(num);
            }
            state.followNumAbsent = arr;
            updateFollowNumAbsentHint();
            recalcData();
        }

        function toggleFollowPanel(id) {
            const panel = document.getElementById(id);
            if (!panel) return;
            const collapsed = panel.classList.toggle('collapsed');
            const arrow = document.getElementById(id + 'Arrow');
            if (arrow) arrow.textContent = collapsed ? '▸' : '▾';
        }

        function toggleAdvanced(id) {
            const el = document.getElementById(id);
            if (!el) return;
            const show = el.style.display === 'none';
            el.style.display = show ? 'block' : 'none';
            const arrow = document.getElementById(id + 'Arrow');
            if (arrow) arrow.textContent = show ? '▾' : '▸';
        }

        function updateFollowPanelSummaries() {
            const followSummary = document.getElementById('followWrapSummary');
            if (followSummary) {
                let s = '';
                if (state.followMode === 'zodiac') s = `跟肖: ${state.followZodiac || '-'}`;
                else if (state.followMode === 'position') s = `位次: 第${state.followPosition + 1}号`;
                else if (state.followMode === 'multi') s = `连肖: ${(state.followMultiZodiacs || []).join('、')}`;
                else if (state.followMode === 'missnum') {
                    const ranks = (state.followMissRanks || []).slice().sort((a, b) => a - b);
                    s = `名次: 第${ranks.join('、第')}名`;
                }
                followSummary.textContent = s;
            }
            const tailSummary = document.getElementById('followTailWrapSummary');
            if (tailSummary) {
                let s = '';
                if (state.tailMode === 'single') s = `跟尾: ${state.tailValue}尾`;
                else if (state.tailMode === 'position') s = `位次: 第${state.tailPosition + 1}号`;
                else if (state.tailMode === 'multi') s = `连尾: ${(state.tailMultiTails || []).slice().sort((a, b) => a - b).map(t => t + '尾').join('、')}`;
                else if (state.tailMode === 'missrank') {
                    const ranks = (state.tailMissRanks || []).slice().sort((a, b) => a - b);
                    s = `名次: 第${ranks.join('、第')}名`;
                }
                tailSummary.textContent = s;
            }
            const absentSummary = document.getElementById('followNumAbsentWrapSummary');
            if (absentSummary) {
                absentSummary.textContent = `已选 ${(state.followNumAbsent || []).length} 号`;
            }
        }

        const MODE_ITEMS = [
            ['zodiac', '特肖遗漏'],
            ['oddeven', '单双'],
            ['bigsmall', '大小'],
            ['color', '波色'],
            ['zodiac_hotcold', '特肖冷热'],
            ['number_hotcold', '特码冷热'],
            ['cold_custom', '特码自由'],
            ['pingxiao_follow', '平特肖'],
            ['special_zodiac_follow', '前期定特'],
            ['pingtail_follow', '平特尾'],
            ['pingnum_absent', '平特断号']
        ];

        function buildModeQuickBar() {
            const bar = document.getElementById('modeQuickBar');
            if (!bar) return;
            bar.innerHTML = MODE_ITEMS.map(([mode, label]) =>
                `<button data-mode="${mode}" onclick="switchTrendMode('${mode}')">${label}</button>`
            ).join('');
            document.querySelectorAll('#modeQuickBar button').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.mode === state.currentMode);
            });
        }

        function changeMaWindow(val) {
            state.maWindow = parseInt(val, 10) || 0;
            updateChartLegend();
            draw();
        }

        function sortTable(key) {
            if (!state.tableSort) state.tableSort = { key: null, dir: 1 };
            if (state.tableSort.key === key) {
                state.tableSort.dir *= -1;
            } else {
                state.tableSort = { key, dir: 1 };
            }
            document.querySelectorAll('.table-section th[data-sort]').forEach(th => {
                const arrow = th.querySelector('.sort-arrow');
                if (arrow) {
                    arrow.textContent = th.dataset.sort === state.tableSort.key
                        ? (state.tableSort.dir > 0 ? '▲' : '▼')
                        : '';
                }
            });
            if (state.lastRenderedData) renderTable(state.lastRenderedData);
        }

        // ==================== 浅色主题 ====================
        function isLightTheme() {
            return document.body.classList.contains('light-theme');
        }
        function initTheme() {
            let saved = 'dark';
            try { saved = localStorage.getItem('lh_theme') || 'dark'; } catch (e) {}
            applyTheme(saved === 'light');
        }
        function applyTheme(light) {
            document.body.classList.toggle('light-theme', light);
            try { localStorage.setItem('lh_theme', light ? 'light' : 'dark'); } catch (e) {}
            const btn = document.getElementById('themeToggle');
            if (btn) btn.textContent = light ? '☀️' : '🌙';
            draw();
        }
        function toggleTheme() {
            applyTheme(!isLightTheme());
        }
        function themeGrid(alpha) {
            return isLightTheme() ? `rgba(25, 40, 60, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        }
        function themeText(alpha) {
            return isLightTheme() ? `rgba(20, 30, 45, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        }

        // ==================== 多曲线叠加 ====================
        function buildOverlayOptions() {
            const zodiacWrap = document.getElementById('overlayZodiacWrap');
            if (zodiacWrap) {
                const selected = new Set(state.overlay.items || []);
                const zodiacs = CONFIG.zodiacMap[state.currentYear] || [];
                zodiacWrap.innerHTML = zodiacs.map(z =>
                    `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;"><input type="checkbox" id="overlayZodiac_${z}" onchange="toggleOverlayItem('${z}')" ${selected.has(z) ? 'checked' : ''}> ${z}</label>`
                ).join('');
            }
            const tailWrap = document.getElementById('overlayTailWrap');
            if (tailWrap) {
                const selected = new Set(state.overlay.items || []);
                tailWrap.innerHTML = Array.from({ length: 10 }, (_, i) =>
                    `<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;"><input type="checkbox" id="overlayTail_${i}" onchange="toggleOverlayItem('${i}')" ${selected.has(String(i)) ? 'checked' : ''}> ${i}尾</label>`
                ).join('');
            }
            const coldList = document.getElementById('overlayColdList');
            if (coldList) {
                const sets = state.overlay.coldSets || [];
                const palette = ['#ff9800', '#e040fb', '#00c4ff'];
                coldList.innerHTML = sets.map((set, i) => `
                    <div style="display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:6px;padding:5px 8px;font-size:10px;">
                        <span style="color:${palette[i % 3]};font-weight:700;flex-shrink:0;">条件${i + 1}</span>
                        <span style="flex:1;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(set.types || []).join('、')}</span>
                        <button onclick="removeColdOverlay(${i})" style="padding:2px 6px;font-size:10px;flex-shrink:0;">✕</button>
                    </div>
                `).join('') || '<div style="font-size:10px;color:var(--text-secondary);">暂无，去特码综合K线卡片添加</div>';
            }
            const legendList = document.getElementById('overlayLegendList');
            if (legendList) {
                const items = state.overlay.type === 'cold'
                    ? (state.overlay.coldSets || []).map((_, i) => 'cold_' + i)
                    : (state.overlay.items || []).slice(0, 3);
                const minItems = state.overlay.type === 'cold' ? 1 : 2;
                const palette = ['#ff9800', '#e040fb', '#00c4ff'];
                if (items.length >= minItems) {
                    legendList.style.display = 'flex';
                    legendList.innerHTML = items.map((item, i) => {
                        const hidden = !!(state.overlay.hidden && state.overlay.hidden[item]);
                        const label = state.overlay.type === 'zodiac' ? item
                            : state.overlay.type === 'tail' ? parseInt(item, 10) + '尾'
                            : state.overlay.type === 'cold' ? '条件' + (i + 1)
                            : parseInt(item, 10);
                        return `<div style="display:flex;align-items:center;gap:6px;font-size:10px;${hidden ? 'opacity:0.45;' : ''}">
                            <span style="width:10px;height:10px;border-radius:2px;background:${palette[i % 3]};display:inline-block;flex-shrink:0;"></span>
                            <span style="flex:1;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${label}</span>
                            <button onclick="toggleOverlayVisibility('${item}')" style="padding:2px 8px;font-size:10px;flex-shrink:0;">${hidden ? '显示' : '隐藏'}</button>
                        </div>`;
                    }).join('');
                } else {
                    legendList.style.display = 'none';
                    legendList.innerHTML = '';
                }
            }
            syncOverlayTypeWrap();
            updateOverlayHint();
            renderOverlayComparison();
        }
        function syncOverlayTypeWrap() {
            const type = state.overlay.type;
            const z = document.getElementById('overlayZodiacWrap');
            const t = document.getElementById('overlayTailWrap');
            const n = document.getElementById('overlayNumberWrap');
            const c = document.getElementById('overlayColdWrap');
            if (z) z.style.display = type === 'zodiac' ? 'grid' : 'none';
            if (t) t.style.display = type === 'tail' ? 'grid' : 'none';
            if (n) n.style.display = type === 'number' ? 'block' : 'none';
            if (c) c.style.display = type === 'cold' ? 'block' : 'none';
        }
        function changeOverlayType(val) {
            state.overlay.type = val;
            state.overlay.items = val === 'cold'
                ? (state.overlay.coldSets || []).map((_, i) => 'cold_' + i)
                : [];
            const input = document.getElementById('overlayNumbersInput');
            if (input) input.value = '';
            buildOverlayOptions();
            recalcData();
        }
        function toggleOverlayItem(item) {
            const arr = [...(state.overlay.items || [])];
            const idx = arr.indexOf(item);
            const cb = document.getElementById('overlayZodiac_' + item) || document.getElementById('overlayTail_' + item);
            if (idx >= 0) {
                if (arr.length <= 2) { if (cb) cb.checked = true; updateOverlayHint(); return; }
                arr.splice(idx, 1);
            } else {
                if (arr.length >= 3) { if (cb) cb.checked = false; updateOverlayHint(); return; }
                arr.push(item);
            }
            state.overlay.items = arr;
            updateOverlayHint();
            recalcData();
        }
        function applyOverlayNumbers() {
            const input = document.getElementById('overlayNumbersInput');
            if (!input) return;
            const nums = input.value.split(/[,，、;\s]+/).map(s => parseInt(s, 10))
                .filter(n => !isNaN(n) && n >= 1 && n <= 49)
                .slice(0, 3)
                .map(n => n.toString().padStart(2, '0'));
            state.overlay.items = nums;
            input.value = nums.join(',');
            updateOverlayHint();
            recalcData();
        }
        function toggleOverlayEnabled(checked) {
            state.overlay.enabled = !!checked;
            updateOverlayHint();
            recalcData();
        }
        function toggleOverlayVisibility(item) {
            if (!state.overlay.hidden) state.overlay.hidden = {};
            state.overlay.hidden[item] = !state.overlay.hidden[item];
            buildOverlayOptions();
            draw();
        }
        function addColdToOverlay() {
            if (!state.coldSelection || !state.coldSelection.types.length) {
                return alert('请先在特码综合K线模式生成条件，再加入叠加');
            }
            if (!state.overlay.coldSets) state.overlay.coldSets = [];
            if (state.overlay.coldSets.length >= 3) {
                return alert('最多叠加3条特码综合K线');
            }
            const types = state.coldSelection.setKline
                ? [...(state.coldSelection.setTypes || [])]
                : [...state.coldSelection.types];
            const set = {
                types,
                counts: { ...(state.coldSelection.counts || {}) },
                selectedZodiacs: [...(state.coldSelection.selectedZodiacs || [])],
                selectedWaves: [...(state.coldSelection.selectedWaves || [])],
                selectedWuxings: [...(state.coldSelection.selectedWuxings || [])],
                selectedWuxingDs: [...(state.coldSelection.selectedWuxingDs || [])],
                selectedMorphs: [...(state.coldSelection.selectedMorphs || [])],
                selectedHeNumbers: [...(state.coldSelection.selectedHeNumbers || [])],
                selectedHeTails: [...(state.coldSelection.selectedHeTails || [])],
                selectedHeads: [...(state.coldSelection.selectedHeads || [])],
                selectedTails: [...(state.coldSelection.selectedTails || [])],
                inputTerms: state.coldSelection.inputTerms ? JSON.parse(JSON.stringify(state.coldSelection.inputTerms)) : null,
                selectedNumbers: [...(state.coldSelection.selectedNumbers || [])]
            };
            state.overlay.coldSets.push(set);
            state.overlay.type = 'cold';
            state.overlay.items = state.overlay.coldSets.map((_, i) => 'cold_' + i);
            buildOverlayOptions();
            recalcData();
            showNotification('已加入叠加，共 ' + state.overlay.coldSets.length + ' 条');
        }
        function removeColdOverlay(i) {
            if (!state.overlay.coldSets) return;
            state.overlay.coldSets.splice(i, 1);
            state.overlay.items = state.overlay.coldSets.map((_, idx) => 'cold_' + idx);
            buildOverlayOptions();
            recalcData();
        }
        function updateOverlayHint() {
            const hint = document.getElementById('overlayHint');
            if (!hint) return;
            if (state.overlay.type === 'cold') {
                const n = (state.overlay.coldSets || []).length;
                hint.textContent = n > 0
                    ? '已加入 ' + n + ' 条条件线，勾选「在图上叠加显示」即可显示'
                    : '到特码综合K线卡片生成条件后点「加入叠加」';
                return;
            }
            const n = (state.overlay.items || []).length;
            if (n < 2) {
                hint.textContent = '请选择2~3项（当前' + n + '项）';
            } else {
                hint.textContent = '已选' + n + '项：' + state.overlay.items.map(i =>
                    state.overlay.type === 'zodiac' ? i : (state.overlay.type === 'tail' ? i + '尾' : parseInt(i, 10))
                ).join('、');
            }
        }

        // ==================== 多方案量化对比表格渲染 ====================
        function renderOverlayComparison() {
            const wrap = document.getElementById('overlayComparisonWrap');
            const list = document.getElementById('overlayComparisonList');
            if (!wrap || !list) return;

            const isCold = state.overlay.type === 'cold';
            const items = isCold
                ? (state.overlay.coldSets || []).map((_, i) => 'cold_' + i)
                : (state.overlay.items || []).slice(0, 3);
            const minItems = isCold ? 1 : 2;

            if (!state.overlay.enabled || items.length < minItems) {
                wrap.style.display = 'none';
                list.innerHTML = '';
                return;
            }

            wrap.style.display = 'block';
            const palette = ['#ff9800', '#e040fb', '#00c4ff'];
            const totalPeriods = state.historyData.length;

            const cardsHtml = items.map((item, i) => {
                const hidden = !!(state.overlay.hidden && state.overlay.hidden[item]);
                let label = item;
                if (state.overlay.type === 'zodiac') label = item + '肖';
                else if (state.overlay.type === 'tail') label = parseInt(item, 10) + '尾';
                else if (state.overlay.type === 'cold') {
                    const setObj = state.overlay.coldSets[i];
                    const typeStr = setObj ? (setObj.types || []).join('、') : '';
                    label = `方案${i + 1} (${typeStr || '自定义'})`;
                } else {
                    label = parseInt(item, 10) + '号';
                }

                let hits = 0;
                let maxWin = 0;
                let maxLoss = 0;
                let curWin = 0;
                let curLoss = 0;
                let prevScore = 0;
                const recentResults = [];

                state.historyData.forEach((d, idx) => {
                    const score = (d.overlayScores && d.overlayScores[item] !== undefined) ? d.overlayScores[item] : 0;
                    const diff = idx === 0 ? score : score - prevScore;
                    const isHit = diff > 0;
                    prevScore = score;

                    if (isHit) {
                        hits++;
                        curWin++;
                        curLoss = 0;
                        if (curWin > maxWin) maxWin = curWin;
                    } else {
                        curLoss++;
                        curWin = 0;
                        if (curLoss > maxLoss) maxLoss = curLoss;
                    }

                    if (idx >= totalPeriods - 8) {
                        recentResults.push(isHit ? 'W' : 'L');
                    }
                });

                const winRate = totalPeriods > 0 ? ((hits / totalPeriods) * 100).toFixed(1) : '0.0';
                const finalScore = state.historyData.length ? ((state.historyData[state.historyData.length - 1].overlayScores || {})[item] || 0) : 0;

                const badgesHtml = recentResults.map(r =>
                    r === 'W'
                        ? '<span style="display:inline-block;width:14px;height:14px;line-height:14px;text-align:center;font-size:8px;font-weight:bold;background:rgba(255,23,68,0.2);color:var(--up);border-radius:2px;">中</span>'
                        : '<span style="display:inline-block;width:14px;height:14px;line-height:14px;text-align:center;font-size:8px;font-weight:bold;background:rgba(0,230,118,0.1);color:var(--down);border-radius:2px;">落</span>'
                ).join('');

                return `
                    <div style="background:rgba(255,255,255,0.03);border:1px solid ${palette[i % 3]};border-radius:6px;padding:6px 8px;font-size:10px;${hidden ? 'opacity:0.4;' : ''}">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                            <div style="display:flex;align-items:center;gap:4px;">
                                <span style="width:8px;height:8px;border-radius:2px;background:${palette[i % 3]};display:inline-block;"></span>
                                <span style="font-weight:700;color:${palette[i % 3]};">${label}</span>
                            </div>
                            <span style="font-weight:700;color:${finalScore >= 0 ? 'var(--up)' : 'var(--down)'};">指数: ${finalScore >= 0 ? '+' : ''}${finalScore}</span>
                        </div>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;color:var(--text-secondary);font-size:9px;margin-bottom:4px;">
                            <div>胜率: <b style="color:var(--text-primary);">${winRate}%</b> (${hits}/${totalPeriods})</div>
                            <div>连中/连落: <span style="color:var(--up);">+${maxWin}</span> / <span style="color:var(--down);">-${maxLoss}</span></div>
                        </div>
                        <div style="display:flex;align-items:center;gap:2px;">
                            <span style="font-size:9px;color:var(--text-secondary);margin-right:2px;">近8期:</span>
                            ${badgesHtml}
                        </div>
                    </div>
                `;
            }).join('');

            list.innerHTML = cardsHtml;
        }

        // ==================== 号码冷热矩阵 ====================
        function setMatrixMode(mode) {
            state.matrixMode = mode === 'special' ? 'special' : 'pingte';
            const pingteBtn = document.getElementById('matrixModePingte');
            const specialBtn = document.getElementById('matrixModeSpecial');
            const active = (btn, on) => {
                if (!btn) return;
                btn.style.background = on ? 'var(--accent)' : 'transparent';
                btn.style.color = on ? '#000' : 'var(--text-secondary)';
                btn.style.fontWeight = on ? '700' : '400';
            };
            active(pingteBtn, state.matrixMode === 'pingte');
            active(specialBtn, state.matrixMode === 'special');
            renderHotColdMatrix();
        }
        function renderHotColdMatrix() {
            const grid = document.getElementById('matrixGrid');
            if (!grid) return;
            const matrixWinSel = document.getElementById('matrixWindow');
            const selVal = matrixWinSel ? matrixWinSel.value : 'auto';
            const pageSizeSel = document.getElementById('pageSizeSel');
            const currentAutoCount = pageSizeSel ? (pageSizeSel.value === 'all' ? '全部' : pageSizeSel.value) : '50';
            if (matrixWinSel) {
                const autoOpt = matrixWinSel.querySelector('option[value="auto"]');
                if (autoOpt) autoOpt.textContent = `🔗 跟随主图期数 (当前${currentAutoCount}期)`;
            }
            let N = 50;
            const totalLen = state.historyData ? state.historyData.length : 0;
            if (selVal === 'auto') {
                const loadCount = getSelectedLoadCount();
                N = loadCount === Infinity ? totalLen : Math.min(loadCount, totalLen);
            } else if (selVal === 'all') {
                N = totalLen;
            } else {
                N = parseInt(selVal, 10) || 50;
            }
            const data = (state.historyData || []).slice(-N);
            const counts = {};
            for (let n = 1; n <= 49; n++) counts[n] = 0;
            data.forEach(d => {
                if (state.matrixMode === 'special') {
                    const num = d.winNum;
                    if (num >= 1 && num <= 49) counts[num]++;
                    return;
                }
                (d.codes || []).forEach(c => {
                    const num = parseInt(c.num, 10);
                    if (num >= 1 && num <= 49) counts[num]++;
                });
            });
            const allData = state.historyData;
            const lastSeen = {};
            for (let n = 1; n <= 49; n++) lastSeen[n] = -1;
            allData.forEach((d, i) => {
                if (state.matrixMode === 'special') {
                    if (d.winNum >= 1 && d.winNum <= 49) lastSeen[d.winNum] = i;
                } else {
                    (d.codes || []).forEach(c => {
                        const num = parseInt(c.num, 10);
                        if (num >= 1 && num <= 49) lastSeen[num] = i;
                    });
                }
            });
            const max = Math.max(...Object.values(counts), 1);
            grid.innerHTML = Array.from({ length: 49 }, (_, i) => {
                const n = i + 1;
                const ratio = counts[n] / max;
                const r = Math.round(28 + ratio * 220);
                const g = Math.round(28 + (1 - ratio) * 195);
                const b = 52;
                const om = totalLen > 0 ? totalLen - 1 - lastSeen[n] : 0;
                const ring = om >= 20 ? 'box-shadow:inset 0 0 0 2px rgba(255,255,255,0.75);' : '';
                return `<div style="aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:5px;background:rgb(${r},${g},${b});color:#fff;font-size:11px;font-weight:600;${ring}">
                    <span>${n}</span>
                    <span style="font-size:8px;font-weight:400;opacity:0.9;line-height:1;">遗${om}</span>
                </div>`;
            }).join('');
        }

        // ==================== 策略回测 ====================
        function calcBacktestStats(slice) {
            let wins = 0, loss = 0, flat = 0, sum = 0, curUp = 0, maxUp = 0, curDown = 0, maxDown = 0;
            slice.forEach(d => {
                const s = d.step || 0;
                sum += s;
                if (s > 0) { wins++; curUp++; curDown = 0; maxUp = Math.max(maxUp, curUp); }
                else if (s < 0) { loss++; curDown++; curUp = 0; maxDown = Math.max(maxDown, curDown); }
                else { flat++; curUp = 0; curDown = 0; }
            });
            const valid = slice.length - flat;
            return {
                wins, loss, flat, sum, maxUp, maxDown,
                winRate: valid > 0 ? wins / valid * 100 : 0
            };
        }
        function runBacktest() {
            const result = document.getElementById('backtestResult');
            if (!result) return;
            const data = state.historyData;
            if (data.length < 2) {
                result.innerHTML = '数据不足，请先加载数据';
                return;
            }
            const windows = [
                { label: '近20期', n: 20 },
                { label: '近50期', n: 50 },
                { label: '近100期', n: 100 },
                { label: '全部', n: data.length }
            ];
            const rows = windows.map(w => ({ label: w.label, n: w.n, ...calcBacktestStats(data.slice(-w.n)) }));
            const best = rows.reduce((a, b) => (b.winRate > a.winRate ? b : a));
            const conclusion = best.winRate >= 60 ? '表现优秀，可继续关注' : best.winRate >= 45 ? '表现一般，观察为主' : '表现偏弱，谨慎使用';
            result.innerHTML = rows.map(r => `
                <div style="display:flex;justify-content:space-between;gap:6px;${r === best ? 'color:var(--accent);font-weight:700;' : ''}">
                    <span style="min-width:44px;">${r.label}</span>
                    <span>胜率 ${r.winRate.toFixed(1)}%</span>
                    <span>${r.wins}胜/${r.loss}负</span>
                    <span>累计${r.sum > 0 ? '+' : ''}${r.sum}</span>
                    <span>涨${r.maxUp}/跌${r.maxDown}</span>
                </div>
            `).join('') + `
                <div style="margin-top:6px;border-top:1px solid var(--border);padding-top:6px;color:var(--text-primary);">
                    最佳：${best.label}（胜率 ${best.winRate.toFixed(1)}%）· ${conclusion}
                </div>
            `;
        }

        // ==================== 10期倍投追号计算器 ====================
        let currentBetPlanData = null;

        function onBetCalcInputChange() {
            const numCount = parseInt(document.getElementById('betCalcNumCount')?.value, 10) || 0;
            const odds = parseFloat(document.getElementById('betCalcOdds')?.value) || 0;
            const profit = parseFloat(document.getElementById('betCalcProfit')?.value) || 0;
            const mode = document.getElementById('betCalcMode')?.value || 'accum';
            const isAccum = (mode === 'accum');

            const numTag = document.getElementById('betCalcNumTag');
            if (numTag) numTag.textContent = numCount > 0 ? `${numCount} 个号` : '--';

            const oddsTag = document.getElementById('betCalcOddsTag');
            if (oddsTag) oddsTag.textContent = odds > 0 ? `${odds} 倍` : '--';

            const profitTag = document.getElementById('betCalcProfitTag');
            if (profitTag) {
                if (profit > 0) {
                    profitTag.textContent = isAccum ? `每期累加 +${profit} 元` : `固定 +${profit} 元/期`;
                } else {
                    profitTag.textContent = '--';
                }
            }

            updateBetCalcTagActiveStates(numCount, odds, profit);
        }

        function updateBetCalcTagActiveStates(numCount, odds, profit) {
            // 更新号码快捷按钮 active 状态
            document.querySelectorAll('#betCalcCard .bet-calc-form-group:nth-of-type(1) .bet-calc-tag-btn').forEach(btn => {
                const text = btn.textContent || '';
                const match = text.match(/^(\d+)码/);
                if (match && parseInt(match[1], 10) === numCount) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            // 更新赔率快捷按钮 active 状态
            document.querySelectorAll('#betCalcCard .bet-calc-form-group:nth-of-type(2) .bet-calc-tag-btn').forEach(btn => {
                const val = parseFloat(btn.textContent || '');
                if (!isNaN(val) && Math.abs(val - odds) < 0.01) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
            // 更新期望盈利快捷按钮 active 状态
            document.querySelectorAll('#betCalcCard .bet-calc-form-group:nth-of-type(3) .bet-calc-tag-btn').forEach(btn => {
                const val = parseFloat(btn.textContent || '');
                if (!isNaN(val) && Math.abs(val - profit) < 0.1) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }

        function setBetCalcNum(num) {
            const input = document.getElementById('betCalcNumCount');
            if (input) {
                input.value = num;
                onBetCalcInputChange();
                calculateBetPlan();
            }
        }

        function setBetCalcOdds(odds) {
            const input = document.getElementById('betCalcOdds');
            if (input) {
                input.value = odds;
                onBetCalcInputChange();
                calculateBetPlan();
            }
        }

        function setBetCalcProfit(profit) {
            const input = document.getElementById('betCalcProfit');
            if (input) {
                input.value = profit;
                onBetCalcInputChange();
                calculateBetPlan();
            }
        }

        function syncCurrentSelectedCount() {
            try {
                let count = 0;
                if (typeof calculateColdSelectionDetail === 'function') {
                    const detail = calculateColdSelectionDetail();
                    if (detail && detail.finalNumbers && detail.finalNumbers.length > 0) {
                        count = detail.finalNumbers.length;
                    }
                }
                if (count > 0) {
                    setBetCalcNum(count);
                    showToast(`🎯 已同步当前特码选出的 ${count} 个号码！`);
                } else {
                    showToast(`⚠️ 当前尚未选出精选号码，请先在特码K线中配置选号因子`);
                }
            } catch (e) {
                showToast(`⚠️ 同步选号失败: ${e.message}`);
            }
        }

        function resetBetCalc() {
            const numInput = document.getElementById('betCalcNumCount');
            const oddsInput = document.getElementById('betCalcOdds');
            const profitInput = document.getElementById('betCalcProfit');
            const modeSel = document.getElementById('betCalcMode');
            const roundSel = document.getElementById('betCalcRound');

            if (numInput) numInput.value = 10;
            if (oddsInput) oddsInput.value = 47;
            if (profitInput) profitInput.value = 100;
            if (modeSel) modeSel.value = 'accum';
            if (roundSel) roundSel.value = 'ceil';

            onBetCalcInputChange();
            calculateBetPlan();
            showToast('🔄 计算器已重置为默认值（累加模式）');
        }

        function calculateBetPlan() {
            const resultWrap = document.getElementById('betCalcResultWrap');
            if (!resultWrap) return;

            const numCount = parseInt(document.getElementById('betCalcNumCount')?.value, 10);
            const odds = parseFloat(document.getElementById('betCalcOdds')?.value);
            const targetProfit = parseFloat(document.getElementById('betCalcProfit')?.value);
            const mode = document.getElementById('betCalcMode')?.value || 'accum';
            const roundMode = document.getElementById('betCalcRound')?.value || 'ceil';

            onBetCalcInputChange();

            // 参数合法性验证
            if (isNaN(numCount) || numCount < 1 || numCount > 48) {
                resultWrap.innerHTML = `
                    <div class="bet-calc-error-box">
                        ⚠️ 请输入有效的投注号码个数（1 ~ 48 个号码）
                    </div>
                `;
                currentBetPlanData = null;
                return;
            }

            if (isNaN(odds) || odds <= 0) {
                resultWrap.innerHTML = `
                    <div class="bet-calc-error-box">
                        ⚠️ 请输入有效的开奖赔率（必须大于 0，如 48.5）
                    </div>
                `;
                currentBetPlanData = null;
                return;
            }

            if (isNaN(targetProfit) || targetProfit <= 0) {
                resultWrap.innerHTML = `
                    <div class="bet-calc-error-box">
                        ⚠️ 请输入期望每期盈利金额（必须大于 0，如 100）
                    </div>
                `;
                currentBetPlanData = null;
                return;
            }

            // 核心数学可行性验证：赔率必须大于单注号码数
            if (odds <= numCount) {
                resultWrap.innerHTML = `
                    <div class="bet-calc-error-box">
                        <strong>❌ 无法实现盈利计划</strong><br>
                        开奖赔率 (<strong>${odds}</strong>) 必须大于投注号码个数 (<strong>${numCount}</strong>)！<br>
                        <span style="font-size:10px;color:var(--text-secondary);display:block;margin-top:3px;">
                            当赔率 ≤ 号码数时，单注中奖奖金无法覆盖当期单码总投注成本，任何倍投方式均必定亏损。请减少投注号码数或提高赔率。
                        </span>
                    </div>
                `;
                currentBetPlanData = null;
                return;
            }

            const periods = 10;
            const isAccum = (mode === 'accum');
            const isCeil = (roundMode !== 'decimal');
            let cumulativeInvest = 0;
            const plan = [];

            for (let k = 1; k <= periods; k++) {
                // 累加净利模式：第k期中奖净利润要求达到 k × targetProfit
                const target = isAccum ? (targetProfit * k) : targetProfit;
                // 核心不等式: perBet * (odds - numCount) >= cumulativeInvest + target
                const exactBet = (cumulativeInvest + target) / (odds - numCount);
                let perBet = isCeil ? Math.ceil(exactBet) : Math.round(exactBet * 100) / 100;
                if (isCeil && perBet < 1) perBet = 1;
                if (!isCeil && perBet < 0.01) perBet = 0.01;

                const currentCost = Math.round(perBet * numCount * 100) / 100;
                cumulativeInvest = Math.round((cumulativeInvest + currentCost) * 100) / 100;
                const winPrize = Math.round(perBet * odds * 100) / 100;
                const netProfit = Math.round((winPrize - cumulativeInvest) * 100) / 100;
                const roi = cumulativeInvest > 0 ? Math.round((netProfit / cumulativeInvest) * 1000) / 10 : 0;

                plan.push({
                    period: k,
                    perBet,
                    currentCost,
                    cumulativeInvest,
                    winPrize,
                    netProfit,
                    roi,
                    target
                });
            }

            currentBetPlanData = {
                numCount,
                odds,
                targetProfit,
                mode,
                roundMode,
                periods,
                plan,
                totalInvest: cumulativeInvest,
                startBet: plan[0].perBet,
                startCost: plan[0].currentCost,
                peakBet: plan[periods - 1].perBet,
                peakCost: plan[periods - 1].currentCost,
                minProfit: Math.min(...plan.map(p => p.netProfit)),
                maxProfit: Math.max(...plan.map(p => p.netProfit)),
                avgProfit: Math.round((plan.reduce((acc, cur) => acc + cur.netProfit, 0) / periods) * 10) / 10
            };

            // 渲染卡片内展示
            renderBetCalcCardResult(currentBetPlanData, resultWrap);

            // 如果全景弹窗处于打开状态，同步更新弹窗视图
            const modal = document.getElementById('betCalcModal');
            if (modal && modal.style.display !== 'none') {
                renderBetCalcModalContent(currentBetPlanData);
            }
        }

        function renderBetCalcCardResult(data, container) {
            const { numCount, odds, targetProfit, mode, plan, totalInvest, startBet, startCost, peakCost, periods } = data;
            const isAccum = (mode === 'accum');
            const modeName = isAccum ? '按期累加递增' : '固定净赢';

            let html = `
                <!-- 关键指标网格 -->
                <div class="bet-calc-grid-stats">
                    <div class="bet-calc-stat-item" style="border-color: rgba(0,212,255,0.3);">
                        <span class="bet-calc-stat-title">10期总本金储备</span>
                        <span class="bet-calc-stat-val" style="color:var(--accent);">¥ ${totalInvest.toLocaleString()}</span>
                    </div>
                    <div class="bet-calc-stat-item" style="border-color: rgba(0,230,118,0.3);">
                        <span class="bet-calc-stat-title">第10期累加净利</span>
                        <span class="bet-calc-stat-val" style="color:var(--up);">+¥ ${plan[periods - 1].netProfit.toLocaleString()}</span>
                    </div>
                    <div class="bet-calc-stat-item">
                        <span class="bet-calc-stat-title">首期起步 (单码/总投)</span>
                        <span class="bet-calc-stat-val">¥${startBet} / ¥${startCost}</span>
                    </div>
                    <div class="bet-calc-stat-item">
                        <span class="bet-calc-stat-title">第10期单期总投</span>
                        <span class="bet-calc-stat-val" style="color:#ffd600;">¥ ${peakCost.toLocaleString()}</span>
                    </div>
                </div>

                <!-- 10期数据表格（清晰展示累加目标与中奖净利） -->
                <div class="bet-calc-table-wrap">
                    <table class="bet-calc-table">
                        <thead>
                            <tr>
                                <th>期数</th>
                                <th>每号(元)</th>
                                <th>当期总投</th>
                                <th>累计总投</th>
                                <th>${isAccum ? '累加目标' : '期望目标'}</th>
                                <th>中奖净利</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            plan.forEach(row => {
                html += `
                    <tr>
                        <td class="col-period">第${row.period}期</td>
                        <td class="col-bet">${row.perBet}</td>
                        <td class="col-cost">¥${row.currentCost}</td>
                        <td style="color:var(--text-secondary);">¥${row.cumulativeInvest.toLocaleString()}</td>
                        <td style="color:#81c784; font-size:11px;">¥${row.target.toLocaleString()}</td>
                        <td class="col-profit">+¥${row.netProfit.toLocaleString()}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>

                <!-- 策略与累加规则提示 -->
                <div class="bet-calc-tip-box">
                    💡 <strong>累加净利保障：</strong>${isAccum ? `每期净利严格按期累加递增（第1期≥${plan[0].target}元、第2期≥${plan[1].target}元...第10期≥${plan[periods - 1].target}元）。` : `每期保底净赚≥${targetProfit}元。`}
                    任一期中奖均可<strong>全额覆盖之前所有期累计本金</strong>并落袋当前期的累加净利；<strong>中奖后务必立即重置为第1期重新起投</strong>！
                    ${totalInvest > 20000 ? '<br><span style="color:#ff5252;">⚠️ 注意：后几期倍投金额较大，请根据个人资金储备理性执行。</span>' : ''}
                </div>
            `;

            container.innerHTML = html;
        }

        function openBetCalcModal() {
            if (!currentBetPlanData) {
                calculateBetPlan();
            }
            if (!currentBetPlanData) return;

            renderBetCalcModalContent(currentBetPlanData);
            const modal = document.getElementById('betCalcModal');
            if (modal) {
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            }
        }

        function closeBetCalcModal() {
            const modal = document.getElementById('betCalcModal');
            if (modal) {
                modal.style.display = 'none';
                document.body.style.overflow = '';
            }
        }

        function renderBetCalcModalContent(data) {
            const body = document.getElementById('betCalcModalBody');
            if (!body) return;

            const { numCount, odds, targetProfit, mode, roundMode, plan, totalInvest, minProfit, maxProfit, avgProfit, periods } = data;
            const isAccum = (mode === 'accum');
            const modeName = isAccum ? '按期累加递增 (第k期净赚 k×期望金额)' : '固定每期净利 (保底净赚期望金额)';
            const roundName = roundMode === 'decimal' ? '保留2位小数' : '向上取整到整数元';

            let html = `
                <!-- 概览看板 -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:10px; margin-bottom:16px;">
                    <div style="background:var(--side); border:1px solid var(--border); border-radius:8px; padding:10px;">
                        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">10期总资金储备</div>
                        <div style="font-size:18px; font-weight:800; color:var(--accent);">¥ ${totalInvest.toLocaleString()}</div>
                        <div style="font-size:10px; color:var(--text-secondary); margin-top:2px;">防断缆总本金</div>
                    </div>
                    <div style="background:var(--side); border:1px solid var(--border); border-radius:8px; padding:10px;">
                        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">中奖累加净利区间</div>
                        <div style="font-size:18px; font-weight:800; color:var(--up);">¥${plan[0].netProfit} ~ ¥${plan[periods - 1].netProfit.toLocaleString()}</div>
                        <div style="font-size:10px; color:var(--text-secondary); margin-top:2px;">期期累加增加收益</div>
                    </div>
                    <div style="background:var(--side); border:1px solid var(--border); border-radius:8px; padding:10px;">
                        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">投注策略配置</div>
                        <div style="font-size:14px; font-weight:700; color:#e6edf3;">${numCount} 码 @ ${odds} 倍</div>
                        <div style="font-size:10px; color:var(--accent); margin-top:2px;">${isAccum ? '按期累加' : '固定净利'}+${targetProfit}元/期</div>
                    </div>
                    <div style="background:var(--side); border:1px solid var(--border); border-radius:8px; padding:10px;">
                        <div style="font-size:11px; color:var(--text-secondary); margin-bottom:4px;">取整规则</div>
                        <div style="font-size:14px; font-weight:700; color:#e6edf3;">${roundName}</div>
                        <div style="font-size:10px; color:var(--text-secondary); margin-top:2px;">首期起步 ${plan[0].perBet}元/号</div>
                    </div>
                </div>

                <!-- 完整明细大表 -->
                <div style="overflow-x:auto; border:1px solid var(--border); border-radius:8px; background:var(--side); margin-bottom:16px;">
                    <table class="bet-calc-table" style="font-size:12px;">
                        <thead>
                            <tr style="background:rgba(255,255,255,0.03);">
                                <th style="padding:10px 8px;">期数</th>
                                <th style="padding:10px 8px;">每个号金额</th>
                                <th style="padding:10px 8px;">当期总投入</th>
                                <th style="padding:10px 8px;">累计总投入</th>
                                <th style="padding:10px 8px;">中奖总金额</th>
                                <th style="padding:10px 8px;">${isAccum ? '累加目标净利' : '期望目标净利'}</th>
                                <th style="padding:10px 8px;">实际中奖净利润</th>
                                <th style="padding:10px 8px;">投资回报率(ROI)</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            plan.forEach(row => {
                html += `
                    <tr>
                        <td class="col-period" style="padding:8px; font-weight:700;">第 ${row.period} 期</td>
                        <td class="col-bet" style="padding:8px; font-size:13px;">¥ ${row.perBet}</td>
                        <td class="col-cost" style="padding:8px;">¥ ${row.currentCost.toLocaleString()}</td>
                        <td style="padding:8px; color:#c9d1d9;">¥ ${row.cumulativeInvest.toLocaleString()}</td>
                        <td style="padding:8px; color:var(--text-secondary);">¥ ${row.winPrize.toLocaleString()}</td>
                        <td style="padding:8px; color:#81c784; font-weight:600;">¥ ${row.target.toLocaleString()}</td>
                        <td class="col-profit" style="padding:8px; font-size:13px;">+¥ ${row.netProfit.toLocaleString()}</td>
                        <td style="padding:8px;">
                            <span style="display:inline-block; padding:2px 8px; border-radius:10px; font-size:10px; font-weight:700; background:rgba(0,230,118,0.12); color:var(--up);">
                                +${row.roi}%
                            </span>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>

                <!-- 各期资金与累加净利对比条 -->
                <div style="background:var(--side); border:1px solid var(--border); border-radius:8px; padding:12px; margin-bottom:12px;">
                    <div style="font-size:12px; font-weight:700; color:var(--accent); margin-bottom:10px; display:flex; justify-content:space-between;">
                        <span>📊 各期当期投入 vs 中奖累加净利润走势</span>
                        <span style="font-size:11px; color:var(--text-secondary); font-weight:normal;">柱条为当期总投占比，绿色数值为扣除历史总投入后的累加净利</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:6px;">
            `;

            const maxCost = plan[plan.length - 1].currentCost || 1;
            plan.forEach(row => {
                const pct = Math.max(3, Math.round((row.currentCost / maxCost) * 100));
                html += `
                    <div style="display:flex; align-items:center; gap:8px; font-size:11px;">
                        <span style="width:48px; color:var(--text-secondary); flex-shrink:0;">第${row.period}期</span>
                        <div style="flex:1; background:rgba(255,255,255,0.04); height:16px; border-radius:4px; overflow:hidden; position:relative;">
                            <div style="width:${pct}%; height:100%; background:linear-gradient(90deg, var(--accent), #7c4dff); border-radius:4px; transition:width 0.3s;"></div>
                        </div>
                        <span style="width:75px; text-align:right; color:#ffd600; font-variant-numeric:tabular-nums; flex-shrink:0;">投 ¥${row.currentCost.toLocaleString()}</span>
                        <span style="width:115px; text-align:right; color:var(--up); font-variant-numeric:tabular-nums; flex-shrink:0;">累加净赚 +¥${row.netProfit.toLocaleString()}</span>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>

                <!-- 说明总结 -->
                <div style="font-size:11px; color:var(--text-secondary); line-height:1.6; background:rgba(0,212,255,0.04); border:1px solid rgba(0,212,255,0.2); border-radius:8px; padding:10px;">
                    <strong>📌 累加盈利与风控准则：</strong><br>
                    1. <strong>累加净利兑现：</strong>第 $k$ 期中奖时，净利润为 $[b_k \\times 赔率 - 累计所有期总投入]$，确保完全覆盖往期挂掉的所有本金，并净赚不少于 $k \\times 期望金额$ 的累加利润；<br>
                    2. <strong>中奖立即重置：</strong>无论第几期中奖，锁定该期累加利润后，必须立即返回第1期重新起步；<br>
                    3. <strong>严控本金储备：</strong>确保总备付资金不低于10期累计总投入（¥${totalInvest.toLocaleString()}元），杜绝半途中断。
                </div>
            `;

            body.innerHTML = html;
        }

        function copyBetPlanText() {
            if (!currentBetPlanData) {
                calculateBetPlan();
            }
            if (!currentBetPlanData) return;

            const { numCount, odds, targetProfit, mode, roundMode, plan, totalInvest } = currentBetPlanData;
            const isAccum = (mode === 'accum');
            const modeName = isAccum ? '按期累加递增净利润 (第k期净赚 k×期望金额)' : '固定每期净赢利润';
            const roundName = roundMode === 'decimal' ? '保留2位小数' : '向上取整到整数元';

            const lines = [
                `【澳门六合彩 10期倍投追号盈利计划表】`,
                `----------------------------------------------------`,
                `投注号码个数：${numCount} 个号`,
                `开奖特码赔率：${odds} 倍`,
                `期望每期盈利：${targetProfit} 元 (${modeName})`,
                `金额取整模式：${roundName}`,
                `10期总资金储备需求：${totalInvest.toLocaleString()} 元`,
                `----------------------------------------------------`,
                `期数   | 单号金额 | 当期总额 | 累计总投 | 累加目标 | 实际中奖净利 | 盈利率`,
            ];

            plan.forEach(row => {
                const p = `第${row.period < 10 ? '0' + row.period : row.period}期`;
                const bet = `${row.perBet}元/号`.padEnd(8, ' ');
                const cost = `${row.currentCost}元`.padEnd(8, ' ');
                const cum = `${row.cumulativeInvest}元`.padEnd(8, ' ');
                const target = `${row.target}元`.padEnd(8, ' ');
                const profit = `+${row.netProfit}元`.padEnd(11, ' ');
                const roi = `+${row.roi}%`;
                lines.push(`${p} | ${bet} | ${cost} | ${cum} | ${target} | ${profit} | ${roi}`);
            });

            lines.push(`----------------------------------------------------`);
            lines.push(`提示：任一期中奖均全额覆盖前期待补本金，并斩获该期累加递增纯利润；中奖后请务必重置回第1期重新起投。`);
            lines.push(`生成时间：${new Date().toLocaleString()}`);

            const text = lines.join('\n');
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast('📋 10期倍投累加计划已复制到剪贴板！');
                }).catch(() => {
                    prompt('请手动复制以下计划文本：', text);
                });
            } else {
                prompt('请手动复制以下计划文本：', text);
            }
        }

        function quickOpenBetCalc() {
            // 打开侧边栏（若在移动端或收起）
            const sb = document.getElementById('sidebar');
            if (sb && sb.classList.contains('collapsed')) {
                toggleSidebar();
            } else if (sb && !sb.classList.contains('mobile-open') && window.matchMedia('(max-width: 767px)').matches) {
                openSidebar();
            }

            // 切换到计算器
            switchSidebarCategory('calc');

            // 确保卡片展开
            const card = document.getElementById('betCalcCard');
            if (card) {
                card.classList.remove('collapsed');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // 聚焦号码输入框
            setTimeout(() => {
                const input = document.getElementById('betCalcNumCount');
                if (input) input.focus();
            }, 300);
        }

        // ==================== 图例 + 近10期统计 ====================
        function updateChartLegend() {
            const el = document.getElementById('chartLegend');
            if (!el) return;
            const maText = state.maWindow > 0 ? '绿涨·红跌·黄虚线=MA' : '绿涨·红跌';
            const data = state.historyData.slice(-10);
            let wins = 0, sum = 0;
            data.forEach(d => {
                if ((d.step || 0) > 0) wins++;
                sum += d.step || 0;
            });
            const recent = data.length ? ` · 近10期 ${wins}/${data.length} · 累计${sum > 0 ? '+' : ''}${sum}` : '';
            const maxInfo = ` · 最大连涨${state.overallMaxRise || 0} · 最大连跌${state.overallMaxFall || 0}`;
            el.textContent = maText + recent + maxInfo;
        }

        function toggleSidebar() {
            const sb = document.getElementById('sidebar');
            const isPhone = window.matchMedia('(max-width: 767px)').matches;
            const isTablet = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;

            if (isPhone) {
                if (sb.classList.contains('mobile-open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            } else {
                const btn = document.getElementById('toggleBtn');
                const sidebarWidth = isTablet ? 260 : 320;
                sb.classList.toggle('collapsed');

                if (sb.classList.contains('collapsed')) {
                    btn.innerHTML = '▶';
                btn.style.color = '';
                    btn.style.left = '0';
                } else {
                    btn.innerHTML = '◀';
                btn.style.color = '';
                    btn.style.left = sidebarWidth + 'px';
                }

                setTimeout(resizeCanvas, 210);
            }
        }

        function exportCSV() {
            if (!state.historyData.length) return alert('无数据可导出');

            let csv = '期号,开奖时间,特肖,号码,趋势指数,MA5\n';
            state.historyData.forEach(d => {
                csv += `${d.expect},${d.time},${d.win},${d.winNum},${d.score},${d.ma5.toFixed(2)}\n`;
            });

            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `六合分析_${state.currentYear}.csv`;
            a.click();
        }

        function toggleFullscreenChart() {
            const chartSection = document.getElementById('chartSection');
            const btn = document.getElementById('fullscreenBtn');

            if (chartSection.classList.contains('chart-fullscreen')) {
                chartSection.classList.remove('chart-fullscreen');
                btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>`;
                if (document.exitFullscreen) document.exitFullscreen();
            } else {
                chartSection.classList.add('chart-fullscreen');
                btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>`;
                if (chartSection.requestFullscreen) {
                    chartSection.requestFullscreen().catch(err => {
                        console.log('Fullscreen request failed:', err);
                    });
                }
            }

            setTimeout(() => {
                resizeCanvas();
                draw();
            }, 100);
        }

        function zoomChart(factor) {
            const oldScale = state.viewState.scale;
            state.viewState.scale = Math.max(0.2, Math.min(20, state.viewState.scale * factor));
            
            const dpr = window.devicePixelRatio || 1;
            const centerX = (state.canvas.width / dpr) / 2;
            state.viewState.x = centerX - (centerX - state.viewState.x) * (state.viewState.scale / oldScale);
            
            draw();
        }

        function resetChartView() {
            state.viewState.scale = 1;
            state.viewState.x = 0;
            state.viewState.y = 0;
            draw();
        }

        function getColdTooltipTypes(cold) {
            if (!cold) return [];
            if (cold.setKline) return [...(cold.setTypes || []), 'setKline'];
            return cold.types || [];
        }

        function renderColdSetsForTooltip(sets, types) {
            if (!sets || !types.length) return '';
            const labels = {
                numbers: '遗漏最多10号',
                zodiacs: '遗漏最多生肖',
                hotNumbers: '平特最热10号',
                coldNumbers: '平特最冷10号',
                hotZodiacs: '平特最热肖',
                coldZodiacs: '平特最冷肖',
                allHotNumbers: '特码最热10号',
                allColdNumbers: '特码最冷10号',
                allHotZodiacs: '特码最热肖',
                allColdZodiacs: '特码最冷肖',
                selectZodiacs: '选择生肖',
                wave: '遗漏最多波色',
                halfwave: '遗漏最多半波',
                jiaYe: '遗漏最多家野',
                head: '遗漏最多头数',
                tail: '遗漏最多尾数',
                wuxing: '遗漏最多段位',
                wuxingCold: '遗漏最多五行',
                halfHead: '遗漏最多半头',
                region: '遗漏最多区域',
                omissionRange: '遗漏区域',
                omissionZodiacRange: '遗漏生肖',
                hotNumberRange: '平特热码区间',
                allHotNumberRange: '特码热码区间',
                hotZodiacRange: '平特热肖区间',
                allHotZodiacRange: '特码热肖区间',
                selectedRegions: '选择区域',
                selectedWaves: '选择波色',
                selectedWuxings: '选择五行',
                selectedWuxingDs: '五行单双',
                selectedMorphs: '合数形态',
                selectedHeNumbers: '合数选择',
                selectedHeTails: '合尾选择',
                selectedHeads: '头数选择',
                selectedTails: '尾数选择',
                inputNumbers: '输入条件',
                commonNumbers: '共同号码',
                setKline: '号码集',
                setNumbers: '号码集'
            };

            const displayValueMap = {
                red: '红波', blue: '蓝波', green: '绿波', jia: '家肖', ye: '野肖',
                heDan: '合单', heShuang: '合双', heDa: '合大', heXiao: '合小', weiDa: '尾大', weiXiao: '尾小'
            };
            const rows = types
                .filter(type => Array.isArray(sets[type]) && sets[type].length)
                .map(type => {
                    const values = sets[type];
                    let label = (type === 'setKline' || type === 'setNumbers')
                        ? `号码集（${values.length}个）`
                        : (labels[type] || type);
                    if (type === 'numbers') label = `遗漏最多${values.length}号`;
                    if (type === 'zodiacs') label = `遗漏最多${values.length}肖`;
                    if (type === 'hotNumbers') label = `平特最热${values.length}号`;
                    if (type === 'coldNumbers') label = `平特最冷${values.length}号`;
                    if (type === 'allHotNumbers') label = `特码最热${values.length}号`;
                    if (type === 'allColdNumbers') label = `特码最冷${values.length}号`;
                    if (type === 'hotZodiacs') label = `平特最热${values.length}肖`;
                    if (type === 'coldZodiacs') label = `平特最冷${values.length}肖`;
                    if (type === 'allHotZodiacs') label = `特码最热${values.length}肖`;
                    if (type === 'allColdZodiacs') label = `特码最冷${values.length}肖`;
                    if (type === 'hotNumberRange') label = `平特热码（${values.length}个）`;
                    if (type === 'allHotNumberRange') label = `特码热码（${values.length}个）`;
                    if (type === 'hotZodiacRange') label = `平特热肖（${values.length}肖）`;
                    if (type === 'allHotZodiacRange') label = `特码热肖（${values.length}肖）`;
                    if (type === 'region') label = `遗漏最多${values.length}区域`;
                    if (type === 'selectedWuxings') label = `选择五行（${values.length}项）`;
                    if (type === 'selectedWuxingDs') label = `五行单双（${values.length}项）`;
                    if (type === 'wuxingCold') label = `遗漏最多${values.length}五行`;
                    if (type === 'selectedMorphs') label = `合数形态（${values.length}项）`;
                    if (type === 'selectedHeNumbers') label = `选择合数（${values.length}项）`;
                    if (type === 'selectedHeTails') label = `选择合尾（${values.length}项）`;
                    if (type === 'selectedHeads') label = `选择头数（${values.length}项）`;
                    if (type === 'selectedTails') label = `选择尾数（${values.length}项）`;
                    const formattedValues = values.map(v => {
                        if (displayValueMap[v]) return displayValueMap[v];
                        if (type === 'selectedHeNumbers') return v + '合';
                        if (type === 'selectedHeTails') return v + '尾';
                        if (type === 'selectedHeads') return v + '头';
                        if (type === 'selectedTails') return v + '尾';
                        if (type === 'selectedWuxings' || type === 'wuxingCold') return v + '行';
                        return v;
                    });
                    return `
                        <div style="display:flex; justify-content:space-between; gap:6px; margin-top:1px; font-size:10px;">
                            <span style="color:var(--text-secondary); flex-shrink:0;">${label}</span>
                            <span style="color:var(--warn); text-align:right; word-break:break-word;">${formattedValues.join(' ')}</span>
                        </div>
                    `;
                })
                .join('');

            return rows ? `
                <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                    <div style="font-size:11px; color:var(--accent); font-weight:700; margin-bottom:4px;">本期开奖后特码综合K线数据</div>
                    ${rows}
                </div>
            ` : '';
        }

        function showKlineTooltip(data, x, y) {
            const tooltip = document.getElementById('klineTooltip');
            if (!data || !tooltip) return;

            const codes = data.codes ||[];
            const ballsHtml = codes.map((c, i) => `
                <div class="t-ball ${c.wave}">${c.num}</div>
                ${i === 5 ? '<div style="color:var(--text-secondary);margin:0 2px;">+</div>' : ''}
            `).join('');

            let trendInfo = '';
            let zodiacOmissionHtml = '';
            if (state.currentMode === 'zodiac') {
                const om = data.snapshot[data.win];
                trendInfo = om === 0 ? '<span style="color:var(--up);">★ 命中</span>' : `<span style="color:var(--text-secondary);">遗漏 ${om} 期</span>`;
                if (data.snapshot) {
                    const sortedZodiacOmissions = Object.entries(data.snapshot)
                        .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
                        .slice(0, 6);
                    zodiacOmissionHtml = `
                        <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                            <div class="tooltip-row">
                                <span class="tooltip-label">遗漏最少肖</span>
                                <span class="tooltip-value" style="font-size:10px; color:var(--text-secondary);">${sortedZodiacOmissions.map(([z, om]) => `${z}(${om})`).join(' ')}</span>
                            </div>
                        </div>
                    `;
                }
            }

            const pageSizeVal = document.getElementById('pageSizeSel').value;
            const N = pageSizeVal === 'all' ? state.historyData.length : parseInt(pageSizeVal);
            const absIdx = data.total - 1;
            const windowData = state.historyData.slice(Math.max(0, absIdx - N), absIdx);
            const numStr = data.winNum != null ? data.winNum.toString().padStart(2, '0') : '--';

            let modeSpecificHtml = '';
            const currentMode = state.currentMode;
            if (['zodiac_hotcold', 'number_hotcold'].includes(currentMode)) {
                const zCounts = {};
                const nCounts = {};
                CONFIG.zodiacMap[state.currentYear].forEach(z => zCounts[z] = 0);
                for (let i = 1; i <= 49; i++) nCounts[i] = 0;

                windowData.forEach(item => {
                    if (item.win) zCounts[item.win]++;
                    if (item.winNum) nCounts[item.winNum]++;
                });

                const sortedZ = Object.entries(zCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
                const hotZ = sortedZ.slice(0, 6).map(e => e[0]);
                const coldZ = sortedZ.slice(6).map(e => e[0]);
                const sortedN = Object.entries(nCounts).sort((a, b) => b[1] - a[1] || parseInt(a[0]) - parseInt(b[0]));
                const hotN = sortedN.slice(0, 25).map(e => parseInt(e[0]).toString().padStart(2, '0'));
                const coldN = sortedN.slice(25).map(e => parseInt(e[0]).toString().padStart(2, '0'));

                if (currentMode === 'zodiac_hotcold') {
                    const isZHot = hotZ.includes(data.win);
                    modeSpecificHtml = `
                        <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                            <div style="font-size:11px; color:var(--text-secondary); margin-bottom:8px; display:flex; justify-content:space-between;">
                                <span>基于前 <b>${windowData.length}</b> 期统计</span>
                                <span>${isZHot ? '热肖命中' : '冷肖命中'}</span>
                            </div>
                            <div class="tooltip-row">
                                <span class="tooltip-label">当前特肖</span>
                                <span class="tooltip-value" style="color:${isZHot ? 'var(--up)' : 'var(--down)'}; font-weight:700;">${data.win}</span>
                            </div>
                            <div style="font-size:10px; color:var(--text-secondary); line-height:1.4; word-break:break-word;">
                                <span style="color:var(--up);">热肖:</span> ${hotZ.join(' ')}
                            </div>
                            <div style="font-size:10px; color:var(--text-secondary); line-height:1.4; word-break:break-word; margin-top:6px;">
                                <span style="color:var(--down);">冷肖:</span> ${coldZ.join(' ')}
                            </div>
                        </div>
                    `;
                } else {
                    const isNHot = hotN.includes(numStr);
                    modeSpecificHtml = `
                        <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                            <div style="font-size:11px; color:var(--text-secondary); margin-bottom:8px; display:flex; justify-content:space-between;">
                                <span>基于前 <b>${windowData.length}</b> 期统计</span>
                                <span>${isNHot ? '热码命中' : '冷码命中'}</span>
                            </div>
                            <div class="tooltip-row">
                                <span class="tooltip-label">当前特码</span>
                                <span class="tooltip-value" style="color:${isNHot ? 'var(--up)' : 'var(--down)'}; font-weight:700;">${numStr}</span>
                            </div>
                            <div style="font-size:10px; color:var(--text-secondary); line-height:1.4; word-break:break-word;">
                                <span style="color:var(--up);">热码:</span> ${hotN.join(' ')}
                            </div>
                            <div style="font-size:10px; color:var(--text-secondary); line-height:1.4; word-break:break-word; margin-top:6px;">
                                <span style="color:var(--down);">冷码:</span> ${coldN.join(' ')}
                            </div>
                        </div>
                    `;
                }
            } else if (currentMode === 'cold_custom') {
                modeSpecificHtml = `
                    <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="tooltip-row">
                            <span class="tooltip-label">条件命中</span>
                            <span class="tooltip-value" style="color: ${data.coldMatches > 0 ? 'var(--up)' : 'var(--down)'}; font-weight:700;">${data.coldMatches || 0}/${state.coldSelection?.types.length || 0}</span>
                        </div>
                        ${renderColdSetsForTooltip(data.coldSets, getColdTooltipTypes(state.coldSelection))}
                    </div>
                `;
            } else if (currentMode === 'pingxiao_follow') {
                const isMulti = state.followMode === 'multi';
                const isMissNum = state.followMode === 'missnum';
                modeSpecificHtml = `
                    <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="tooltip-row">
                            <span class="tooltip-label">${getFollowLabel()}目标</span>
                            <span class="tooltip-value" style="color:var(--warn);font-weight:700;">${data.followZodiac || '首期待定'}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">${isMissNum ? '本期7号含所选名次号码生肖' : (isMulti ? '本期7号是否全中' : '本期7号含该肖')}</span>
                            <span class="tooltip-value" style="color:${data.followHit ? 'var(--up)' : 'var(--down)'};font-weight:700;">${data.followHit ? '✓ 全中 +1' : '✗ 未全中 -1'}</span>
                        </div>
                    </div>
                `;
            } else if (currentMode === 'special_zodiac_follow') {
                modeSpecificHtml = `
                    <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="tooltip-row">
                            <span class="tooltip-label">上期7号生肖</span>
                            <span class="tooltip-value" style="color:var(--warn);font-weight:700;">${data.followZodiac || '首期无参考'}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">本期特肖是否开出</span>
                            <span class="tooltip-value" style="color:${data.followZodiac ? (data.followHit ? 'var(--up)' : 'var(--down)') : 'var(--text-secondary)'};font-weight:700;">${data.followZodiac ? (data.followHit ? '✓ 命中 +1' : '✗ 未中 -1') : '— 0'}</span>
                        </div>
                    </div>
                `;
            } else if (currentMode === 'pingtail_follow') {
                const isMulti = state.tailMode === 'multi';
                const isMiss = state.tailMode === 'missrank';
                modeSpecificHtml = `
                    <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="tooltip-row">
                            <span class="tooltip-label">${isMulti ? '连尾目标' : (isMiss ? '跟名次目标' : '跟尾目标')}</span>
                            <span class="tooltip-value" style="color:var(--warn);font-weight:700;">${data.followZodiac || '首期待定'}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">${isMiss ? '本期7号含所选名次尾数' : (isMulti ? '本期7号是否全中' : '本期7号含该尾')}</span>
                            <span class="tooltip-value" style="color:${data.followHit ? 'var(--up)' : 'var(--down)'};font-weight:700;">${data.followHit ? '✓ 全中 +1' : '✗ 未全中 -1'}</span>
                        </div>
                    </div>
                `;
            } else if (currentMode === 'pingnum_absent') {
                modeSpecificHtml = `
                    <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="tooltip-row">
                            <span class="tooltip-label">不出号目标</span>
                            <span class="tooltip-value" style="color:var(--warn);font-weight:700;">${data.followZodiac || '首期待定'}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">本期7号是否全不出</span>
                            <span class="tooltip-value" style="color:${data.followHit ? 'var(--up)' : 'var(--down)'};font-weight:700;">${data.followHit ? '✓ 全不出 +1' : '✗ 有出 -1'}</span>
                        </div>
                    </div>
                `;
            } else if (currentMode === 'oddeven') {
                modeSpecificHtml = `
                    <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="tooltip-row">
                            <span class="tooltip-label">单双</span>
                            <span class="tooltip-value" style="color:${data.winNum % 2 === 1 ? 'var(--up)' : 'var(--down)'}; font-weight:700;">${data.winNum % 2 === 1 ? '单' : '双'}</span>
                        </div>
                    </div>
                `;
            } else if (currentMode === 'bigsmall') {
                modeSpecificHtml = `
                    <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="tooltip-row">
                            <span class="tooltip-label">大小</span>
                            <span class="tooltip-value" style="color:${data.winNum >= 25 ? 'var(--up)' : 'var(--down)'}; font-weight:700;">${data.winNum >= 25 ? '大' : '小'}</span>
                        </div>
                    </div>
                `;
            } else if (currentMode === 'color') {
                modeSpecificHtml = `
                    <div style="margin-top:4px; padding-top:4px; border-top:1px solid rgba(255,255,255,0.05);">
                        <div class="tooltip-row">
                            <span class="tooltip-label">波色</span>
                            <span class="tooltip-value" style="color:${data.currentColor === 'green' ? '#000' : data.currentColor === 'blue' ? '#448aff' : '#ff1744'}; font-weight:700;">${data.currentColor}</span>
                        </div>
                    </div>
                `;
            }

            let content = `
                <div class="tooltip-header">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-weight:800; color:var(--accent); font-size:14px;">${data.expect} 期</span>
                        <span style="font-size:10px; color:var(--text-secondary);">${data.time}</span>
                    </div>
                </div>
                <div class="tooltip-content">
                    <div class="tooltip-row">
                        <span class="tooltip-label">特开生肖</span>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span class="t-ball zodiac">${data.win}</span>
                            ${trendInfo}
                        </div>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">开奖号码</span>
                        <div class="tooltip-balls">${ballsHtml}</div>
                    </div>
                    
                    <div style="margin-top:4px; padding-top:4px; border-top:1px dashed rgba(255,255,255,0.1);">
            `;

            if (['zodiac_hotcold', 'number_hotcold'].includes(state.currentMode)) {
                content += `
                    <div class="tooltip-row">
                        <span class="tooltip-label">K线节点属性</span>
                        <span class="tooltip-value" style="color: ${data.isCurrentHot ? 'var(--up)' : 'var(--down)'};">
                            ${data.isCurrentHot ? '🔥 热 (走势+1)' : '❄️ 冷 (走势-1)'}
                        </span>
                    </div>
                `;
            }

            if (state.currentMode === 'special_zodiac_follow') {
                content += `
                    <div class="tooltip-row">
                        <span class="tooltip-label">K线节点属性</span>
                        <span class="tooltip-value" style="color: ${data.followZodiac ? (data.followHit ? 'var(--up)' : 'var(--down)') : 'var(--text-secondary)'};">
                            ${data.followZodiac ? (data.followHit ? '✓ 特肖命中 (走势+1)' : '✗ 特肖未中 (走势-1)') : '首期无参考 (走势0)'}
                        </span>
                    </div>
                `;
            }

            if (state.currentMode === 'zodiac') {
                content += zodiacOmissionHtml;
            }


            const pointStats = computeMaxRiseFall(state.historyData || [], data.total - 1);
            const currentRise = pointStats.currentRise;
            const currentFall = pointStats.currentFall;
            const isCurrentlyRising = currentRise > 0 && currentFall === 0;
            const isCurrentlyFalling = currentFall > 0 && currentRise === 0;
            const streakText = isCurrentlyRising
                ? '<span style="color:var(--up);font-weight:700;">↑ 连升 ' + currentRise + ' 次</span>'
                : isCurrentlyFalling
                ? '<span style="color:var(--down);font-weight:700;">↓ 连降 ' + currentFall + ' 次</span>'
                : '<span style="color:var(--text-secondary);">— 持平</span>';

            const { maxRiseCount, maxFallCount } = computeMaxRiseFall(state.historyData || []);
            content += `
                <div class="tooltip-row">
                    <span class="tooltip-label">当前连续</span>
                    <span class="tooltip-value">${streakText}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">最大上升次数</span>
                    <span class="tooltip-value" style="color: var(--up);">${maxRiseCount}</span>
                </div>
                <div class="tooltip-row">
                    <span class="tooltip-label">最大下降次数</span>
                    <span class="tooltip-value" style="color: var(--down);">${maxFallCount}</span>
                </div>
            `;

            if (state.currentMode === 'color' && data.colorScores) {
                content += `
                    <div class="tooltip-row">
                        <span class="tooltip-label">红波趋势</span>
                        <span class="tooltip-value" style="color: #ff1744;">${data.colorScores.red > 0 ? '+' : ''}${data.colorScores.red.toFixed(1)}</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">蓝波趋势</span>
                        <span class="tooltip-value" style="color: #448aff;">${data.colorScores.blue > 0 ? '+' : ''}${data.colorScores.blue.toFixed(1)}</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">绿波趋势</span>
                        <span class="tooltip-value" style="color: #00e676;">${data.colorScores.green > 0 ? '+' : ''}${data.colorScores.green.toFixed(1)}</span>
                    </div>
                `;
            } else {
                content += `
                    <div class="tooltip-row">
                        <span class="tooltip-label">当前趋势指数</span>
                        <span class="tooltip-value" style="color: ${data.displayScore >= 0 ? 'var(--up)' : 'var(--down)'}; font-size:16px;">
                            ${data.displayScore > 0 ? '+' : ''}${data.displayScore}
                        </span>
                    </div>
                `;
            }

            content += `</div>`;
            
            if (data.chartSignal) {
                content += `
                    <div style="margin-top:6px; padding:4px 8px; border-radius:4px;" class="signal-tooltip-tag ${data.chartSignal.type}">
                        <span>${data.chartSignal.icon}</span>
                        <span><b>【${data.chartSignal.name}】</b> ${data.chartSignal.desc}</span>
                    </div>
                `;
            }

            content += modeSpecificHtml;
            
            content += `</div>`;

            tooltip.innerHTML = content;
            tooltip.style.display = 'block';

            const chartRect = document.getElementById('chartSection').getBoundingClientRect();
            let left = x + 16;
            let top = y + 16;

            if (left + 280 > chartRect.width) left = x - 280;
            if (top + 250 > chartRect.height) top = y - 250;

            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${top}px`;
        }

        function hideKlineTooltip() {
            const tooltip = document.getElementById('klineTooltip');
            if (tooltip) tooltip.style.display = 'none';
        }

        function showLoading(show, isError = false, errorMsg = '') {
            const overlay = document.getElementById('loading-overlay');
            if (!overlay) return;
            overlay.style.display = show ? 'flex' : 'none';
            const progressEl = document.getElementById('loadingProgress');
            const errorActions = document.getElementById('loadingErrorActions');
            const spinner = overlay.querySelector('.spinner');

            if (show) {
                if (isError) {
                    if (progressEl) {
                        progressEl.textContent = errorMsg || '数据加载失败，请检查网络或切换演示数据';
                        progressEl.style.color = 'var(--down, #ff5252)';
                    }
                    if (errorActions) errorActions.style.display = 'flex';
                    if (spinner) spinner.style.display = 'none';
                } else {
                    if (progressEl) {
                        progressEl.style.color = '';
                    }
                    if (errorActions) errorActions.style.display = 'none';
                    if (spinner) spinner.style.display = 'block';
                }
            }
        }

        async function retryFetchData() {
            showLoading(true, false);
            const progressEl = document.getElementById('loadingProgress');
            if (progressEl) progressEl.textContent = '正在重新加载数据...';
            await fetchData();
        }

        function useFallbackMockData() {
            showLoading(false);
            loadMockData();
            showToast('✓ 已为您切换为本地离线演示数据', 2500);
        }

        function initMobileFeatures() {
            const isPhone = window.matchMedia('(max-width: 767px)').matches;
            const isTablet = window.matchMedia('(min-width: 768px) and (max-width: 1024px)').matches;

            if (isPhone) {
                const sidebar = document.getElementById('sidebar');
                const btn = document.getElementById('toggleBtn');
                sidebar.classList.add('collapsed');
                sidebar.classList.remove('mobile-open');
                btn.innerHTML = '☰';
                btn.style.left = '12px';
            }

            if (isPhone || isTablet) {
                initTouchGestures();
            }
        }

        function initTouchGestures() {
            const canvas = state.canvas;
            let touchStartX = 0;
            let touchStartY = 0;
            let touchStartTime = 0;
            let initialScale = 1;
            let initialDistance = 0;

            canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    touchStartX = e.touches[0].clientX;
                    touchStartY = e.touches[0].clientY;
                    touchStartTime = Date.now();
                    state.isDragging = true;
                } else if (e.touches.length === 2) {
                    initialDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    initialScale = state.viewState.scale;
                }
            }, { passive: false });

            canvas.addEventListener('touchmove', (e) => {
                e.preventDefault();
                if (e.touches.length === 1 && state.isDragging) {
                    const clientX = e.touches[0].clientX;
                    const dx = clientX - touchStartX;
                    state.viewState.x += dx;
                    touchStartX = clientX;

                    const rect = canvas.getBoundingClientRect();
                    const dpr = window.devicePixelRatio || 1;
                    const logicalWidth = canvas.width / dpr;
                    const { spacing, startX } = getChartSettings(state.visibleData.length, logicalWidth);
                    const touchX = clientX - rect.left - state.viewState.x;
                    let idx = Math.round((touchX - startX) / spacing);
                    const prevIdx = state.hoverIndex;
                    state.hoverIndex = Math.max(0, Math.min(idx, state.visibleData.length - 1));
                    if (prevIdx !== state.hoverIndex && typeof navigator !== 'undefined' && navigator.vibrate) {
                        try { navigator.vibrate(6); } catch (vErr) {}
                    }

                    draw();
                } else if (e.touches.length === 2) {
                    const currentDistance = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    const scale = (currentDistance / initialDistance) * initialScale;
                    state.viewState.scale = Math.max(0.5, Math.min(3, scale));
                    draw();
                }
            }, { passive: false });

            canvas.addEventListener('touchend', (e) => {
                if (e.touches.length === 0) {
                    state.isDragging = false;
                    const touchEndTime = Date.now();
                    const touchDuration = touchEndTime - touchStartTime;

                    if (touchDuration < 200) {
                        if (!state.lastTapTime || (touchEndTime - state.lastTapTime) > 300) {
                            state.lastTapTime = touchEndTime;
                        } else {
                            state.viewState.scale = 1;
                            state.viewState.x = 0;
                            draw();
                            hideKlineTooltip();
                            state.lastTapTime = null;
                            return;
                        }
                    }

                    if (state.hoverIndex >= 0 && state.visibleData[state.hoverIndex]) {
                        const data = state.visibleData[state.hoverIndex];
                        const canvasRect = canvas.getBoundingClientRect();
                        let tooltipX = touchStartX - canvasRect.left;
                        let tooltipY = touchStartY - canvasRect.top;

                        showKlineTooltip(data, tooltipX, tooltipY);

                        if (state.tooltipTimeout) clearTimeout(state.tooltipTimeout);
                        state.tooltipTimeout = setTimeout(() => {
                            hideKlineTooltip();
                        }, 3000);
                    }
                }
            });

            let sidebarTouchStartX = 0;
            const sidebar = document.getElementById('sidebar');

            document.addEventListener('touchstart', (e) => {
                sidebarTouchStartX = e.touches[0].clientX;
            }, { passive: true });

            document.addEventListener('touchmove', (e) => {
                const currentX = e.touches[0].clientX;
                const diff = currentX - sidebarTouchStartX;

                if (sidebarTouchStartX < 20 && diff > 50 && !sidebar.classList.contains('mobile-open')) {
                    openSidebar();
                }

                if (sidebar.classList.contains('mobile-open') && diff < -50) {
                    closeSidebar();
                }
            }, { passive: true });
        }

        function openSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const btn = document.getElementById('toggleBtn');

            sidebar.classList.remove('collapsed');
            sidebar.classList.add('mobile-open');
            overlay.classList.add('active');
            btn.innerHTML = '✕';
            btn.style.left = 'calc(85vw + 12px)';
        }

        function closeSidebar() {
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('sidebarOverlay');
            const btn = document.getElementById('toggleBtn');

            sidebar.classList.add('collapsed');
            sidebar.classList.remove('mobile-open');
            overlay.classList.remove('active');
            btn.innerHTML = '☰';
            btn.style.left = '12px';
        }

        function switchToChart() {
            document.querySelector('.chart-section').scrollIntoView({ behavior: 'smooth' });
            updateMobileNav('chart');
            hideKlineTooltip();
        }

        function switchToTable() {
            document.querySelector('.table-section').scrollIntoView({ behavior: 'smooth' });
            updateMobileNav('table');
            hideKlineTooltip();
        }

        function toggleSettings() {
            toggleSidebar();
            updateMobileNav('settings');
            hideKlineTooltip();
        }

        function updateMobileNav(active) {
            document.querySelectorAll('.mobile-nav-item').forEach(item => {
                item.classList.remove('active');
            });
            document.querySelector(`.mobile-nav-item[data-page="${active}"]`)?.classList.add('active');
        }

        let currentOmissionTab = 'zodiac';
        let omissionData = { zodiac: [], number:[] };

        function showOmissionPage() {
            if (!state.historyData || state.historyData.length === 0) {
                showLoading(true);
                fetchData().then(() => {
                    setTimeout(() => { displayOmissionPage(); }, 500);
                }).catch((err) => {
                    displayOmissionPage();
                }).finally(() => { showLoading(false); });
                return;
            }
            displayOmissionPage();
        }

        function displayOmissionPage() {
            const omissionSection = document.getElementById('omissionSection');
            const chartSection = document.getElementById('chartSection');
            const tableSection = document.querySelector('.table-section');
            const mobileNav = document.getElementById('mobileNav');

            chartSection.style.display = 'none';
            tableSection.style.display = 'none';
            omissionSection.style.display = 'flex';

            if (mobileNav) mobileNav.style.display = 'none';
            updateOmissionStats();
            closeSidebar();
        }

        function hideOmissionPage() {
            const omissionSection = document.getElementById('omissionSection');
            const chartSection = document.getElementById('chartSection');
            const tableSection = document.querySelector('.table-section');
            const mobileNav = document.getElementById('mobileNav');

            chartSection.style.display = 'block';
            tableSection.style.display = 'block';
            omissionSection.style.display = 'none';

            if (mobileNav && window.matchMedia('(max-width: 767px)').matches) {
                mobileNav.style.display = 'flex';
            }

            resizeCanvas();
            draw();

            if (window.matchMedia('(max-width: 767px)').matches) {
                updateMobileNav('chart');
            }
        }

        document.addEventListener('click', function (e) {
            const omissionSection = document.getElementById('omissionSection');
            if (omissionSection && omissionSection.style.display !== 'none') {
                if (omissionSection.contains(e.target)) {
                    const closeBtn = e.target.closest('.close-btn');
                    if (closeBtn) return;
                    const tabBtn = e.target.closest('.tab-btn');
                    if (tabBtn) return;
                }
            }
        });

        function switchToOmission() { showOmissionPage(); }

        function switchOmissionTab(tab) {
            currentOmissionTab = tab;
            const wrapper = document.getElementById('periodSelectorWrapper');
            if (wrapper) wrapper.style.display = tab === 'special' ? '' : 'none';
            document.querySelectorAll('.omission-tabs .tab-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tab) btn.classList.add('active');
            });

            document.getElementById('zodiacOmissionTable').style.display = tab === 'zodiac' ? 'block' : 'none';
            document.getElementById('numberOmissionTable').style.display = tab === 'number' ? 'block' : 'none';
            document.getElementById('colorOmissionChart').style.display = tab === 'color' ? 'block' : 'none';
            document.getElementById('sizeOmissionChart').style.display = tab === 'size' ? 'block' : 'none';
            document.getElementById('specialOmissionTable').style.display = tab === 'special' ? 'block' : 'none';

            updateOmissionStats();
        }

        function calculateOmissionStats(periods) {
            const data = state.historyData;
            if (!data || data.length === 0) return null;

            const recentData = data.slice(-periods);
            const totalPeriods = recentData.length;

            const zodiacStats = {};
            const numberStats = {};

            const zodiacs = CONFIG.zodiacMap[state.currentYear];

            zodiacs.forEach((z, idx) => {
                zodiacStats[z] = {
                    name: z,
                    currentOmission: 0,
                    maxOmission: 0,
                    totalOmission: 0,
                    count: 0,
                    omissionHistory:[],
                    numbers: [idx + 1, idx + 13, idx + 25, idx + 37].filter(n => n <= 49).map(n => n.toString().padStart(2, '0'))
                };
            });

            for (let i = 1; i <= 49; i++) {
                const numStr = i.toString().padStart(2, '0');
                try {
                    numberStats[numStr] = {
                        number: numStr,
                        zodiac: getZodiac(i),
                        color: getColor(numStr),
                        currentOmission: 0,
                        maxOmission: 0,
                        totalOmission: 0,
                        count: 0,
                        omissionHistory:[]
                    };
                } catch (e) { }
            }

            recentData.forEach((item, idx) => {
                if (!item.codes || !item.pingXiao || !item.win) return; 

                const pingXiaoList = item.pingXiao.split(' ');
                const allZodiacs = [...pingXiaoList, item.win];  
                const hitZodiacs = new Set(allZodiacs);
                const hitNumbers = new Set(item.codes.map(c => c.num));  

                zodiacs.forEach(z => {
                    if (zodiacStats[z]) {
                        if (hitZodiacs.has(z)) {
                            zodiacStats[z].currentOmission = 0;
                            zodiacStats[z].count++;
                            zodiacStats[z].omissionHistory.push({ period: item.expect, hit: true });
                        } else {
                            zodiacStats[z].currentOmission++;
                            zodiacStats[z].totalOmission++;
                            zodiacStats[z].maxOmission = Math.max(zodiacStats[z].maxOmission, zodiacStats[z].currentOmission);
                            zodiacStats[z].omissionHistory.push({ period: item.expect, hit: false });
                        }
                    }
                });

                for (let i = 1; i <= 49; i++) {
                    const numStr = i.toString().padStart(2, '0');
                    if (numberStats[numStr]) {
                        if (hitNumbers.has(numStr)) {
                            numberStats[numStr].currentOmission = 0;
                            numberStats[numStr].count++;
                            numberStats[numStr].omissionHistory.push({ period: item.expect, hit: true });
                        } else {
                            numberStats[numStr].currentOmission++;
                            numberStats[numStr].totalOmission++;
                            numberStats[numStr].maxOmission = Math.max(numberStats[numStr].maxOmission, numberStats[numStr].currentOmission);
                            numberStats[numStr].omissionHistory.push({ period: item.expect, hit: false });
                        }
                    }
                }
            });

            return {
                zodiac: Object.values(zodiacStats),
                number: Object.values(numberStats),
                totalPeriods
            };
        }

        function updateOmissionStats() {
            const periods = currentOmissionTab === 'special' && document.getElementById('omissionPeriodSel') ? parseInt(document.getElementById('omissionPeriodSel').value) : Infinity;
            const stats = calculateOmissionStats(periods);
            if (!stats) {
                const zodiacBody = document.getElementById('zodiacOmissionBody');
                const numberBody = document.getElementById('numberOmissionBody');
                const specialBody = document.getElementById('specialOmissionBody');
                if (zodiacBody) zodiacBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">正在加载数据...</td></tr>';
                if (numberBody) numberBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">正在加载数据...</td></tr>';
                if (specialBody) specialBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">正在加载数据...</td></tr>';
                
                fetchData().then(() => { updateOmissionStats(); }).catch((err) => {
                    if (zodiacBody) zodiacBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--down);">数据加载失败</td></tr>';
                    if (numberBody) numberBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: var(--down);">数据加载失败</td></tr>';
                    if (specialBody) specialBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--down);">数据加载失败</td></tr>';
                });
                return;
            }

            omissionData = stats;


            let hotCount = 0;
            let coldCount = 0;

            if (currentOmissionTab === 'special') {
                const theoreticalRate = 100 / 12; 
                stats.zodiac.forEach(item => {
                    const rate = item.count > 0 ? (item.count / stats.totalPeriods * 100) : 0;
                    if (rate >= theoreticalRate * 1.15) hotCount++; 
                    if (rate <= theoreticalRate * 0.85) coldCount++; 
                });
            } else {
                const currentData = currentOmissionTab === 'zodiac' ? stats.zodiac : stats.number;
                currentData.forEach(item => {
                    const avgOmission = item.count > 0 ? item.totalOmission / item.count : item.currentOmission;
                    if (item.currentOmission <= avgOmission * 0.5) hotCount++;
                    if (item.currentOmission >= avgOmission * 1.5) coldCount++;
                });
            }

            document.getElementById('omissionStatHot').textContent = hotCount;
            document.getElementById('omissionStatCold').textContent = coldCount;

            if (currentOmissionTab === 'zodiac') renderZodiacOmissionTable(stats.zodiac);
            else if (currentOmissionTab === 'number') renderNumberOmissionTable(stats.number);
            else if (currentOmissionTab === 'color') renderColorOmissionChart(stats);
            else if (currentOmissionTab === 'size') renderSizeOmissionChart(stats);
            else if (currentOmissionTab === 'special') renderSpecialOmissionTable(stats);
        }

        function renderColorOmissionChart(stats) {
            const recentData = state.historyData;

            if (!recentData || recentData.length === 0) {
                document.getElementById('colorChartContainer').innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">暂无数据</div>';
                return;
            }

            const colorOm = { red: 0, blue: 0, green: 0 };
            const colorMaxOm = { red: 0, blue: 0, green: 0 };

            recentData.forEach(item => {
                const lastColor = item.currentColor || getColor(item.winNum);
                ['red', 'blue', 'green'].forEach(c => {
                    if (c === lastColor) colorOm[c] = 0;
                    else {
                        colorOm[c]++;
                        colorMaxOm[c] = Math.max(colorMaxOm[c], colorOm[c]);
                    }
                });
            });

            const maxOm = Math.max(colorOm.red, colorOm.blue, colorOm.green, 10);

            document.getElementById('colorChartRedCurrent').textContent = colorOm.red;
            document.getElementById('colorChartRedMax').textContent = colorMaxOm.red;
            document.getElementById('colorChartRedBar').style.width = `${(colorOm.red / maxOm) * 100}%`;

            document.getElementById('colorChartBlueCurrent').textContent = colorOm.blue;
            document.getElementById('colorChartBlueMax').textContent = colorMaxOm.blue;
            document.getElementById('colorChartBlueBar').style.width = `${(colorOm.blue / maxOm) * 100}%`;

            document.getElementById('colorChartGreenCurrent').textContent = colorOm.green;
            document.getElementById('colorChartGreenMax').textContent = colorMaxOm.green;
            document.getElementById('colorChartGreenBar').style.width = `${(colorOm.green / maxOm) * 100}%`;

            const colorNumbersDisplay = document.getElementById('colorNumbersDisplay');
            if (colorNumbersDisplay) {
                const redNums = CONFIG.colors.red.map(n => `<span class="ball red" style="width: 20px; height: 20px; font-size: 9px;">${n}</span>`).join('');
                const blueNums = CONFIG.colors.blue.map(n => `<span class="ball blue" style="width: 20px; height: 20px; font-size: 9px;">${n}</span>`).join('');
                const greenNums = CONFIG.colors.green.map(n => `<span class="ball green" style="width: 20px; height: 20px; font-size: 9px;">${n}</span>`).join('');

                colorNumbersDisplay.innerHTML = `
                    <div style="width: 100%; margin-bottom: 8px;"><span style="color: #ff1744; font-size: 11px;">红波: </span>${redNums}</div>
                    <div style="width: 100%; margin-bottom: 8px;"><span style="color: #448aff; font-size: 11px;">蓝波: </span>${blueNums}</div>
                    <div style="width: 100%;"><span style="color: #00e676; font-size: 11px;">绿波: </span>${greenNums}</div>
                `;
            }
        }

        function renderSizeOmissionChart(stats) {
            const recentData = state.historyData;

            if (!recentData || recentData.length === 0) {
                const chartEl = document.getElementById('sizeOmissionChart');
                if (chartEl) chartEl.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 40px;">暂无数据</div>';
                return;
            }

            const sizeOm = { big: 0, small: 0 };
            const sizeMaxOm = { big: 0, small: 0 };

            recentData.forEach(item => {
                const lastSize = item.currentSize || (item.winNum >= 25 ? 'big' : 'small');
                ['big', 'small'].forEach(s => {
                    if (s === lastSize) sizeOm[s] = 0;
                    else {
                        sizeOm[s]++;
                        sizeMaxOm[s] = Math.max(sizeMaxOm[s], sizeOm[s]);
                    }
                });
            });

            const maxOm = Math.max(sizeOm.big, sizeOm.small, 10);

            const bigCurrent = document.getElementById('sizeChartBigCurrent');
            const bigMax = document.getElementById('sizeChartBigMax');
            const bigBar = document.getElementById('sizeChartBigBar');

            if (bigCurrent) bigCurrent.textContent = sizeOm.big;
            if (bigMax) bigMax.textContent = sizeMaxOm.big;
            if (bigBar) {
                bigBar.style.width = `${(sizeOm.big / maxOm) * 100}%`;
                bigBar.style.background = sizeOm.big >= 10 ? 'linear-gradient(180deg, #ff1744, #d50000)' : 'linear-gradient(180deg, #00e676, #00c853)';
            }

            const smallCurrent = document.getElementById('sizeChartSmallCurrent');
            const smallMax = document.getElementById('sizeChartSmallMax');
            const smallBar = document.getElementById('sizeChartSmallBar');

            if (smallCurrent) smallCurrent.textContent = sizeOm.small;
            if (smallMax) smallMax.textContent = sizeMaxOm.small;
            if (smallBar) {
                smallBar.style.width = `${(sizeOm.small / maxOm) * 100}%`;
                smallBar.style.background = sizeOm.small >= 10 ? 'linear-gradient(180deg, #ff1744, #d50000)' : 'linear-gradient(180deg, #00d4ff, #0091ea)';
            }

            const compareBar = document.getElementById('sizeChartCompareBar');
            const compareBarSmall = document.getElementById('sizeChartCompareBarSmall');

            const total = sizeOm.big + sizeOm.small;
            if (total > 0) {
                if (compareBar) compareBar.style.width = `${(sizeOm.big / total) * 100}%`;
                if (compareBarSmall) compareBarSmall.style.width = `${(sizeOm.small / total) * 100}%`;
            } else {
                if (compareBar) compareBar.style.width = '50%';
                if (compareBarSmall) compareBarSmall.style.width = '50%';
            }
        }

        function renderSpecialOmissionTable(stats) {
            const tbody = document.getElementById('specialOmissionBody');
            const periodSel = document.getElementById('omissionPeriodSel');
            const periods = periodSel ? parseInt(periodSel.value) : Infinity;


            if (!state.historyData || state.historyData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">暂无数据</td></tr>';
                return;
            }

            const recentData = state.historyData.slice(-periods);
            const totalPeriods = recentData.length;
            const theoreticalCount = totalPeriods / 12;

            const zodiacs = CONFIG.zodiacMap[state.currentYear];
            const specialStats = {};
            zodiacs.forEach(z => {
                specialStats[z] = { name: z, count: 0, lastAppear: null, currentOmission: 0 };
            });

            let omissionCounter = {};
            zodiacs.forEach(z => omissionCounter[z] = 0);

            for (let i = recentData.length - 1; i >= 0; i--) {
                const item = recentData[i];
                const winZodiac = item.win;

                zodiacs.forEach(z => {
                    if (z === winZodiac) {
                        specialStats[z].currentOmission = omissionCounter[z];
                        omissionCounter[z] = 0;
                    } else {
                        omissionCounter[z]++;
                    }
                });

                specialStats[winZodiac].count++;
                if (!specialStats[winZodiac].lastAppear) specialStats[winZodiac].lastAppear = item.expect;
            }

            const zodiacStats = Object.values(specialStats).map(z => {
                const rate = ((z.count / totalPeriods) * 100).toFixed(1);
                const deviation = ((z.count - theoreticalCount) / theoreticalCount * 100).toFixed(1);
                const avgCycle = z.count > 0 ? (totalPeriods / z.count).toFixed(1) : '-';

                return {
                    name: z.name, count: z.count, rate: rate,
                    theoretical: theoreticalCount.toFixed(1),
                    deviation: deviation, avgCycle: avgCycle,
                    lastAppear: z.lastAppear, currentOmission: z.currentOmission
                };
            });

            const sortedData = [...zodiacStats].sort((a, b) => b.count - a.count);

            tbody.innerHTML = sortedData.map(item => {
                const deviation = parseFloat(item.deviation);
                const isHot = deviation > 10;
                const isCold = deviation < -10;
                const rate = parseFloat(item.rate);

                const zodiacColorMap = {
                    '鼠': 'blue', '牛': 'green', '虎': 'green', '兔': 'green',
                    '龙': 'red', '蛇': 'red', '马': 'red', '羊': 'red',
                    '猴': 'blue', '鸡': 'blue', '狗': 'blue', '猪': 'blue'
                };
                const color = zodiacColorMap[item.name] || 'red';
                const colorCode = color === 'red' ? '#ff1744' : color === 'blue' ? '#448aff' : '#00e676';

                const maxRate = Math.max(...sortedData.map(s => parseFloat(s.rate)), 20);
                const barWidth = (rate / maxRate) * 100;

                return `
                <tr>
                    <td class="zodiac-cell">
                        <span style="font-size: 14px; font-weight: 700; color: ${colorCode};">${item.name}</span>
                    </td>
                    <td style="font-weight: 700; font-size: 15px;">${item.count}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="font-weight: 600; ${rate > 8.5 ? 'color: var(--up)' : rate < 7 ? 'color: var(--down)' : ''}">${item.rate}%</span>
                        </div>
                    </td>
                    <td style="color: var(--text-secondary);">${item.theoretical}</td>
                    <td style="color: ${deviation > 0 ? 'var(--up)' : deviation < 0 ? 'var(--down)' : 'var(--text-secondary)'}; font-weight: 600;">
                        ${deviation > 0 ? '+' : ''}${item.deviation}%
                    </td>
                    <td style="min-width: 100px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="flex: 1; height: 12px; background: #0d1117; border-radius: 6px; overflow: hidden;">
                                <div style="
                                    height: 100%;
                                    width: ${barWidth}%;
                                    background: ${isHot ? 'linear-gradient(90deg, #00e676, #00c853)' : isCold ? 'linear-gradient(90deg, #ff1744, #d50000)' : 'linear-gradient(90deg, #00d4ff, #0091ea)'};
                                    border-radius: 6px;
                                    transition: width 0.3s ease;
                                "></div>
                            </div>
                        </div>
                    </td>
                    <td class="status-${isHot ? 'hot' : isCold ? 'cold' : 'normal'}" style="font-weight: 600;">
                        ${isHot ? '🔥 热' : isCold ? '❄️ 冷' : '➡️ 稳'}
                    </td>
                    <td>
                        <span class="ball ${color}" style="width: 18px; height: 18px; font-size: 10px;"></span>
                    </td>
                </tr>
            `;
            }).join('');


        }

        function renderZodiacOmissionTable(data) {
            const tbody = document.getElementById('zodiacOmissionBody');

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">暂无数据</td></tr>';
                return;
            }

            const sortedData = [...data].sort((a, b) => a.currentOmission - b.currentOmission);

            tbody.innerHTML = sortedData.map(item => {
                const avgOmission = item.count > 0 ? (item.totalOmission / item.count).toFixed(1) : item.currentOmission;
                const status = getOmissionStatus(item.currentOmission, parseFloat(avgOmission));
                const barWidth = Math.min((item.currentOmission / (item.maxOmission || 1)) * 100, 100);

                const zodiacColorMap = {
                    '鼠': 'blue', '牛': 'green', '虎': 'green', '兔': 'green',
                    '龙': 'red', '蛇': 'red', '马': 'red', '羊': 'red',
                    '猴': 'blue', '鸡': 'blue', '狗': 'blue', '猪': 'blue'
                };
                const zodiacColor = zodiacColorMap[item.name] || 'red';

                return `
                <tr>
                    <td class="zodiac-cell">
                        <span style="color: ${zodiacColor === 'red' ? '#ff1744' : zodiacColor === 'blue' ? '#448aff' : '#00e676'}; font-weight: 700;">${item.name}</span>
                    </td>
                    <td class="omission-current ${status}">${item.currentOmission}</td>
                    <td style="color: var(--text-secondary);">${item.maxOmission}</td>
                    <td style="color: var(--text-secondary);">${avgOmission}</td>
                    <td>${item.count}</td>
                    <td style="min-width: 100px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="flex: 1; height: 12px; background: #0d1117; border-radius: 6px; overflow: hidden;">
                                <div style="
                                    height: 100%;
                                    width: ${barWidth}%;
                                    background: ${status === 'hot' ? 'linear-gradient(90deg, #00e676, #00c853)' : status === 'cold' ? 'linear-gradient(90deg, #ff1744, #d50000)' : 'linear-gradient(90deg, #00d4ff, #0091ea)'};
                                    border-radius: 6px;
                                    transition: width 0.3s ease;
                                "></div>
                            </div>
                            <span style="font-size: 10px; color: var(--text-secondary); min-width: 28px; text-align: right;">${barWidth.toFixed(0)}%</span>
                        </div>
                    </td>
                    <td class="status-${status}" style="font-weight: 600;">${status === 'hot' ? '🔥 热' : status === 'cold' ? '❄️ 冷' : '➡️ 稳'}</td>
                    <td class="numbers-list" style="font-size: 9px;">${item.numbers.join(' ')}</td>
                </tr>
            `;
            }).join('');
        }

        function renderNumberOmissionTable(data) {
            const tbody = document.getElementById('numberOmissionBody');

            if (!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px;">暂无数据</td></tr>';
                return;
            }

            const sortedData = [...data].sort((a, b) => a.currentOmission - b.currentOmission);

            tbody.innerHTML = sortedData.map(item => {
                const avgOmission = item.count > 0 ? (item.totalOmission / item.count).toFixed(1) : item.currentOmission;
                const status = getOmissionStatus(item.currentOmission, parseFloat(avgOmission));
                const barWidth = Math.min((item.currentOmission / (item.maxOmission || 1)) * 100, 100);

                return `
                <tr>
                    <td>
                        <span class="number-cell ${item.color}" style="width: 24px; height: 24px; font-size: 11px;">${item.number}</span>
                    </td>
                    <td class="zodiac-cell" style="font-weight: 600;">${item.zodiac}</td>
                    <td class="omission-current ${status}">${item.currentOmission}</td>
                    <td style="color: var(--text-secondary);">${item.maxOmission}</td>
                    <td style="color: var(--text-secondary);">${avgOmission}</td>
                    <td>${item.count}</td>
                    <td style="min-width: 100px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <div style="flex: 1; height: 12px; background: #0d1117; border-radius: 6px; overflow: hidden;">
                                <div style="
                                    height: 100%;
                                    width: ${barWidth}%;
                                    background: ${status === 'hot' ? 'linear-gradient(90deg, #00e676, #00c853)' : status === 'cold' ? 'linear-gradient(90deg, #ff1744, #d50000)' : 'linear-gradient(90deg, #00d4ff, #0091ea)'};
                                    border-radius: 6px;
                                    transition: width 0.3s ease;
                                "></div>
                            </div>
                            <span style="font-size: 10px; color: var(--text-secondary); min-width: 28px; text-align: right;">${barWidth.toFixed(0)}%</span>
                        </div>
                    </td>
                    <td class="status-${status}" style="font-weight: 600;">${status === 'hot' ? '🔥' : status === 'cold' ? '❄' : '➡️'}</td>
                    <td>
                        <span class="ball ${item.color}" style="width: 18px; height: 18px; font-size: 10px;"></span>
                    </td>
                </tr>
            `;
            }).join('');
        }

        function getOmissionStatus(current, average) {
            if (current <= average * 0.5) return 'hot';
            if (current >= average * 1.5) return 'cold';
            return 'normal';
        }

        document.addEventListener('DOMContentLoaded', initMobileFeatures);

        function toggleChartSize() {
            const main = document.getElementById('chartSection').parentElement;
            const isCollapsed = main.classList.toggle('table-collapsed');
            document.getElementById('chartToggleArrow').textContent = isCollapsed ? '▶' : '▼';
            document.getElementById('chartToggleLabel').textContent = isCollapsed ? '展开数据表' : '收起数据表';
            setTimeout(() => { resizeCanvas(); draw(); }, 50);
        }
