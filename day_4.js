// day_4.js — single coherent trading dashboard file (clean)
// Time-lock checks followed by a small Chart.js-powered card UI.

const PT_TZ = 'America/Los_Angeles';
const nowPT = () => new Date(new Date().toLocaleString('en-US', { timeZone: PT_TZ }));

// blocked weekday ranges in minutes (08:15–11:00, 12:50–15:20 PT)
// const BLOCKED_RANGES = [[8*60 + 15, 11*60], [12*60 + 50, 15*60 + 20]];
// function isWeekday(d){ const day = d.getDay(); return day >= 1 && day <= 5; }
// function inBlockedWindow(ptDate){
//     if(!isWeekday(ptDate)) return false;
//     const mins = ptDate.getHours()*60 + ptDate.getMinutes();
//     return BLOCKED_RANGES.some(([a,b]) => mins >= a && mins < b);
// }

// function showTimeLockOverlay(message){
//     if(document.getElementById('time-lock-overlay')) return;
//     const o = document.createElement('div');
//     o.id = 'time-lock-overlay';
//     Object.assign(o.style, {
//         position: 'fixed', inset: '0', zIndex: 99999,
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         background: 'rgba(0,0,0,0.92)', color: '#ffdca8', textAlign: 'center',
//         padding: '24px', fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif'
//     });
//     o.innerHTML = `<div style="max-width:820px">
//         <h2 style="margin:0 0 8px">Game temporarily unavailable</h2>
//         <p style="margin:0 0 12px">${message}</p>
//         <div style="opacity:.85;font-size:.9rem">Blocked PT weekday hours: 08:15–11:00 and 12:50–15:20</div>
//     </div>`;
//     document.body.appendChild(o);
// }

// function hideTimeLockOverlay(){
//     const el = document.getElementById('time-lock-overlay');
//     if(el) el.remove();
// }


// const UNLOCK_ISO = '2025-10-30T00:00:00-07:00';
// const unlockDate = new Date(UNLOCK_ISO);

// const rn = nowPT();
// if(rn < unlockDate){
//     showTimeLockOverlay(`This game will unlock on ${unlockDate.toLocaleString('en-US', { timeZone: PT_TZ })} PT.`);
// } else if(inBlockedWindow(rn)){
//     showTimeLockOverlay('This game is temporarily blocked for scheduled hours. Please try again later.');
// }

// const __timeLockChecker = setInterval(() => {
//     const n = nowPT();
//     if(n < unlockDate){
//         if(!document.getElementById('time-lock-overlay')){
//             showTimeLockOverlay(`This game will unlock on ${unlockDate.toLocaleString('en-US', { timeZone: PT_TZ })} PT.`);
//         }
//         return;
//     }
//     if(inBlockedWindow(n)){
//         if(!document.getElementById('time-lock-overlay')){
//             showTimeLockOverlay('This game is temporarily blocked for scheduled hours. Please try again later.');
//         }
//         return;
//     }
//     // allowed — remove overlay and stop checking
//     hideTimeLockOverlay();
//     clearInterval(__timeLockChecker);
// }, 10000);


// Trading dashboard - card based UI
(function(){
    const STOCKS = [
        { id: 'choco', name: 'Chocolate', price: 100, color: '#7b3f00' },
        { id: 'gummy', name: 'Gummy', price: 55, color: '#ff6bd6' },
        { id: 'toffee', name: 'Toffee', price: 220, color: '#ffb84d' },
        { id: 'jelly', name: 'Jelly', price: 43, color: '#b28cff' }
    ];

    let state = { cash: 1000, day: 1, portfolio: {}, history: {}, achievements: {} };
    let settings = { autoAdvance: false, gameSpeed: 1 };
    let autoAdvanceInterval;

    function createCharts(){
        const container = document.getElementById('charts-container');
        if(!container) return;
        container.innerHTML = '';

        STOCKS.forEach(s => {
            const card = document.createElement('div');
            card.className = 'chart-card';
            card.innerHTML = `
                <div class="card-header">
                    <div class="card-name">${s.name}</div>
                    <div class="owned-badge" data-stock="${s.id}">Owned: 0</div>
                </div>
                <div class="card-canvas"><canvas id="chart-${s.id}" width="400" height="90"></canvas></div>
                <div class="card-controls">
                    <button class="btn-buy" data-buy="1" data-stock="${s.id}">Buy 1</button>
                    <button class="btn-sell" data-sell="1" data-stock="${s.id}">Sell 1</button>
                </div>
            `;

            container.appendChild(card);
            const canvas = document.getElementById('chart-' + s.id);
            // Set canvas size properly
            canvas.style.width = '100%';
            canvas.style.height = '90px';

            const ctx = canvas.getContext('2d');
            // Cap devicePixelRatio to a safe value to prevent chart.js from attempting
            // to allocate a canvas buffer larger than the browser allows (which throws
            // "Canvas exceeds max size"). Typical devicePixelRatio can be large on some
            // high-density displays; 2 is a safe cap for visuals while avoiding the error.
            const safeDPR = Math.min(window.devicePixelRatio || 1, 2);
            s._chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        borderColor: s.color,
                        backgroundColor: 'rgba(0,0,0,0)',
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        tension: 0.1
                    }]
                },
                options: {
                    devicePixelRatio: safeDPR,
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return '$' + context.parsed.y.toFixed(2);
                                }
                            }
                        }
                    },
                    scales: {
                        x: { display: false },
                        y: {
                            display: false,
                            beginAtZero: false
                        }
                    }
                }
            });
        });

        container.addEventListener('click', e => {
            const buy = e.target.closest('[data-buy]');
            const sell = e.target.closest('[data-sell]');
            if(buy){ buyStocks(buy.dataset.stock, parseInt(buy.dataset.buy, 10)); }
            if(sell){ sellStocks(sell.dataset.stock, parseInt(sell.dataset.sell, 10)); }
        });
    }

    function buyStocks(id, qty){
        const stock = STOCKS.find(s => s.id === id);
        if(!stock) return;
        const cost = stock.price * qty;
        if(state.cash >= cost){ state.cash -= cost; state.portfolio[id] = (state.portfolio[id] || 0) + qty; updateUI(); } else showMessage('Not enough cash');
    }

    function sellStocks(id, qty){
        if((state.portfolio[id] || 0) >= qty){ const stock = STOCKS.find(s => s.id === id); state.portfolio[id] -= qty; state.cash += stock.price * qty; updateUI(); } else showMessage('Not enough owned');
    }

    function updateUI(){
        const cashEl = document.getElementById('player-cash');
        const dayEl = document.getElementById('current-day');
        const portfolioValueEl = document.getElementById('portfolio-value');
        const statTotalValueEl = document.getElementById('stat-total-value');
        const statDayEl = document.getElementById('stat-day');
        const statHoldingsEl = document.getElementById('stat-holdings');
        const statBestStockEl = document.getElementById('stat-best-stock');
        const statAchievementsEl = document.getElementById('stat-achievements');
        const statNetChangeEl = document.getElementById('stat-net-change');

        if(cashEl) cashEl.textContent = '$' + state.cash.toFixed(2);
        if(dayEl) dayEl.textContent = 'Day ' + state.day;

        let portfolioValue = 0;
        let totalHoldings = 0;
        let bestStock = null;
        let bestPerformance = -Infinity;

        STOCKS.forEach(s => {
            const owned = state.portfolio[s.id] || 0;
            portfolioValue += owned * s.price;
            totalHoldings += owned;

            // Find best performing stock (highest price)
            if(s.price > bestPerformance){
                bestPerformance = s.price;
                bestStock = s.name;
            }

            const el = document.querySelector('.owned-badge[data-stock="' + s.id + '"]');
            if(el) el.textContent = 'Owned: ' + owned;
            if(s._chart){
                s._chart.data.labels.push('');
                s._chart.data.datasets[0].data.push(s.price);
                if(s._chart.data.datasets[0].data.length > 50) s._chart.data.datasets[0].data.shift();
                if(s._chart.data.labels.length > 50) s._chart.data.labels.shift();
                s._chart.update();
            }
        });

        const totalValue = state.cash + portfolioValue;
        const achievementCount = Object.keys(state.achievements || {}).length;

        if(portfolioValueEl) portfolioValueEl.textContent = '$' + portfolioValue.toFixed(2);
        if(statTotalValueEl) statTotalValueEl.textContent = '$' + totalValue.toFixed(2);
        if(statDayEl) statDayEl.textContent = 'Day ' + state.day;
        if(statHoldingsEl) statHoldingsEl.textContent = totalHoldings;
        if(statBestStockEl) statBestStockEl.textContent = bestStock || '-';
        if(statAchievementsEl) statAchievementsEl.textContent = achievementCount;
        if(statNetChangeEl) statNetChangeEl.textContent = '$' + (totalValue - 1000).toFixed(2);

        updatePortfolioTable();
    }

    function updatePortfolioTable(){
        const tbody = document.querySelector('#portfolio-table tbody'); if(!tbody) return; tbody.innerHTML = ''; const keys = Object.keys(state.portfolio).filter(k => state.portfolio[k] > 0); if(keys.length === 0){ tbody.innerHTML = '<tr class="empty-portfolio"><td colspan="3">No holdings</td></tr>'; return; }
        keys.forEach(id => { const stock = STOCKS.find(s => s.id === id); const qty = state.portfolio[id]; const tr = document.createElement('tr'); tr.innerHTML = `<td style="text-align:left">${stock.name}</td><td>${qty}</td><td>$${(stock.price * qty).toFixed(2)}</td>`; tbody.appendChild(tr); });
    }

    function showMessage(msg){ const p = document.getElementById('message'); if(p){ p.textContent = msg; p.classList.remove('hidden'); setTimeout(()=>p.classList.add('hidden'),1500); } }

    function nextDay(){
        STOCKS.forEach(s => {
            const change = (Math.random() - 0.5) * s.price * 0.08;
            s.price = Math.max(1, s.price + change);
        });
        state.day++;
        updateUI();
        checkAchievements();
    }

    function resetGame(){
        // Save score before resetting
        saveScore();
        state = { cash: 1000, day: 1, portfolio: {}, history: {}, achievements: {} };
        createCharts();
        updateUI();
        if(autoAdvanceInterval) clearInterval(autoAdvanceInterval);
        autoAdvanceInterval = null;
    }

    function checkAchievements(){
        // Simple achievement checks
        const totalValue = state.cash + Object.keys(state.portfolio).reduce((sum, id) => sum + (state.portfolio[id] || 0) * STOCKS.find(s => s.id === id).price, 0);
        if(totalValue >= 2000 && !state.achievements?.rich){
            state.achievements = state.achievements || {};
            state.achievements.rich = true;
            showAchievement('Wealthy Trader', 'Accumulated $2000+ in total value!');
        }
        if(state.day >= 10 && !state.achievements?.veteran){
            state.achievements = state.achievements || {};
            state.achievements.veteran = true;
            showAchievement('Veteran Trader', 'Survived 10 trading days!');
        }
    }

    function showAchievement(name, description){
        const popup = document.getElementById('achievement-popup');
        const nameEl = document.getElementById('achievement-name');
        const descEl = document.getElementById('achievement-description');
        const closeBtn = document.getElementById('achievement-close');
        if(popup && nameEl && descEl){
            nameEl.textContent = name;
            descEl.textContent = description;
            popup.classList.remove('hidden');
            const hidePopup = () => popup.classList.add('hidden');
            if(closeBtn) closeBtn.onclick = hidePopup;
            setTimeout(hidePopup, 5000); // Extended to 5 seconds
        }
    }

    // Leaderboard functionality
    let leaderboardData = [];

    function showLeaderboard(){
        const modal = document.getElementById('leaderboard-modal');
        if(modal) modal.classList.remove('hidden');
        loadLeaderboard();
    }

    function hideLeaderboard(){
        const modal = document.getElementById('leaderboard-modal');
        if(modal) modal.classList.add('hidden');
    }

    // Add modal backdrop click to close
    document.addEventListener('click', e => {
        const modal = document.getElementById('leaderboard-modal');
        if(e.target === modal) hideLeaderboard();
    });

    function loadLeaderboard(){
        // For demo purposes, using localStorage. In production, use Firebase.
        const stored = localStorage.getItem('candyTraderLeaderboard');
        leaderboardData = stored ? JSON.parse(stored) : [];
        renderLeaderboard();
    }

    function saveScore(){
        const totalValue = state.cash + Object.keys(state.portfolio).reduce((sum, id) => sum + (state.portfolio[id] || 0) * STOCKS.find(s => s.id === id).price, 0);
        const score = { player: 'Player', score: totalValue, date: new Date().toLocaleDateString() };
        leaderboardData.push(score);
        leaderboardData.sort((a, b) => b.score - a.score);
        leaderboardData = leaderboardData.slice(0, 10); // Keep top 10
        localStorage.setItem('candyTraderLeaderboard', JSON.stringify(leaderboardData));
    }

    function renderLeaderboard(){
        const tbody = document.getElementById('leaderboard-body');
        if(!tbody) return;
        tbody.innerHTML = '';
        leaderboardData.forEach((entry, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${index + 1}</td><td>${entry.player}</td><td>$${entry.score.toFixed(2)}</td><td>${entry.date}</td>`;
            tbody.appendChild(tr);
        });
    }

    // Save score when game ends or on certain events
    function endGame(){
        saveScore();
    }

    function setupEventListeners(){
        const next = document.getElementById('next-day-btn');
        const reset = document.getElementById('reset-game-btn');
        const back = document.getElementById('back-btn');
        const leaderboard = document.getElementById('leaderboard-btn');
        const closeLeaderboard = document.getElementById('close-leaderboard');
        const autoAdvance = document.getElementById('auto-advance');
        const gameSpeed = document.getElementById('game-speed');

        if(next) next.addEventListener('click', nextDay);
        if(reset) reset.addEventListener('click', resetGame);
        if(back) back.addEventListener('click', () => window.history.back());
        if(leaderboard) leaderboard.addEventListener('click', showLeaderboard);
        if(closeLeaderboard) closeLeaderboard.addEventListener('click', hideLeaderboard);
        if(autoAdvance) autoAdvance.addEventListener('change', handleAutoAdvanceToggle);
        if(gameSpeed) gameSpeed.addEventListener('input', handleGameSpeedChange);
    }

    function handleAutoAdvanceToggle(){
        settings.autoAdvance = this.checked;
        if(settings.autoAdvance){
            autoAdvanceInterval = setInterval(nextDay, 5000 / settings.gameSpeed);
        } else {
            if(autoAdvanceInterval) clearInterval(autoAdvanceInterval);
            autoAdvanceInterval = null;
        }
    }

    function handleGameSpeedChange(){
        settings.gameSpeed = parseFloat(this.value);
        if(settings.autoAdvance && autoAdvanceInterval){
            clearInterval(autoAdvanceInterval);
            autoAdvanceInterval = setInterval(nextDay, 5000 / settings.gameSpeed);
        }
    }

    window.addEventListener('load', () => { createCharts(); updateUI(); setupEventListeners(); });
})();
