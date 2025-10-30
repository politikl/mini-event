// day_4.js — single coherent trading dashboard file (clean)
// Time-lock checks followed by a small Chart.js-powered card UI.

const PT_TZ = 'America/Los_Angeles';
const nowPT = () => new Date(new Date().toLocaleString('en-US', { timeZone: PT_TZ }));

// blocked weekday ranges in minutes (08:15–11:00, 12:50–15:20 PT)
const BLOCKED_RANGES = [[8*60 + 15, 11*60], [12*60 + 50, 15*60 + 20]];
function isWeekday(d){ const day = d.getDay(); return day >= 1 && day <= 5; }
function inBlockedWindow(ptDate){
    if(!isWeekday(ptDate)) return false;
    const mins = ptDate.getHours()*60 + ptDate.getMinutes();
    return BLOCKED_RANGES.some(([a,b]) => mins >= a && mins < b);
}

function showTimeLockOverlay(message){
    if(document.getElementById('time-lock-overlay')) return;
    const o = document.createElement('div');
    o.id = 'time-lock-overlay';
    Object.assign(o.style, {
        position: 'fixed', inset: '0', zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.92)', color: '#ffdca8', textAlign: 'center',
        padding: '24px', fontFamily: 'system-ui, "Segoe UI", Roboto, sans-serif'
    });
    o.innerHTML = `<div style="max-width:820px">
        <h2 style="margin:0 0 8px">Game temporarily unavailable</h2>
        <p style="margin:0 0 12px">${message}</p>
        <div style="opacity:.85;font-size:.9rem">Blocked PT weekday hours: 08:15–11:00 and 12:50–15:20</div>
    </div>`;
    document.body.appendChild(o);
}

function hideTimeLockOverlay(){
    const el = document.getElementById('time-lock-overlay');
    if(el) el.remove();
}

// set per-day unlock ISO
const UNLOCK_ISO = '2025-10-30T00:00:00-07:00';
const unlockDate = new Date(UNLOCK_ISO);

const rn = nowPT();
if(rn < unlockDate){
    showTimeLockOverlay(`This game will unlock on ${unlockDate.toLocaleString('en-US', { timeZone: PT_TZ })} PT.`);
} else if(inBlockedWindow(rn)){
    showTimeLockOverlay('This game is temporarily blocked for scheduled hours. Please try again later.');
}

const __timeLockChecker = setInterval(() => {
    const n = nowPT();
    if(n < unlockDate){
        if(!document.getElementById('time-lock-overlay')){
            showTimeLockOverlay(`This game will unlock on ${unlockDate.toLocaleString('en-US', { timeZone: PT_TZ })} PT.`);
        }
        return;
    }
    if(inBlockedWindow(n)){
        if(!document.getElementById('time-lock-overlay')){
            showTimeLockOverlay('This game is temporarily blocked for scheduled hours. Please try again later.');
        }
        return;
    }
    // allowed — remove overlay and stop checking
    hideTimeLockOverlay();
    clearInterval(__timeLockChecker);
}, 10000);

// Trading dashboard - card based UI
(function(){
    const STOCKS = [
        { id: 'choco', name: 'Chocolate', price: 100, color: '#7b3f00' },
        { id: 'gummy', name: 'Gummy', price: 55, color: '#ff6bd6' },
        { id: 'toffee', name: 'Toffee', price: 220, color: '#ffb84d' },
        { id: 'jelly', name: 'Jelly', price: 43, color: '#b28cff' }
    ];

    let state = { cash: 1000, day: 1, portfolio: {}, history: {} };

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
            const ctx = canvas.getContext('2d');
            s._chart = new Chart(ctx, { type: 'line', data: { labels: [], datasets: [{ data: [], borderColor: s.color, backgroundColor: 'rgba(0,0,0,0)' }] }, options: { animation: false, responsive: true, maintainAspectRatio: false, scales: { x: { display: false } } } });
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
        if(cashEl) cashEl.textContent = '$' + state.cash.toFixed(2);
        if(dayEl) dayEl.textContent = 'Day ' + state.day;

        STOCKS.forEach(s => {
            const el = document.querySelector('.owned-badge[data-stock="' + s.id + '"]');
            if(el) el.textContent = 'Owned: ' + (state.portfolio[s.id] || 0);
            if(s._chart){ s._chart.data.labels.push(''); s._chart.data.datasets[0].data.push(s.price); if(s._chart.data.datasets[0].data.length > 50) s._chart.data.datasets[0].data.shift(); if(s._chart.data.labels.length > 50) s._chart.data.labels.shift(); s._chart.update(); }
        });

        updatePortfolioTable();
    }

    function updatePortfolioTable(){
        const tbody = document.querySelector('#portfolio-table tbody'); if(!tbody) return; tbody.innerHTML = ''; const keys = Object.keys(state.portfolio).filter(k => state.portfolio[k] > 0); if(keys.length === 0){ tbody.innerHTML = '<tr class="empty-portfolio"><td colspan="3">No holdings</td></tr>'; return; }
        keys.forEach(id => { const stock = STOCKS.find(s => s.id === id); const qty = state.portfolio[id]; const tr = document.createElement('tr'); tr.innerHTML = `<td style="text-align:left">${stock.name}</td><td>${qty}</td><td>$${(stock.price * qty).toFixed(2)}</td>`; tbody.appendChild(tr); });
    }

    function showMessage(msg){ const p = document.getElementById('message'); if(p){ p.textContent = msg; p.classList.remove('hidden'); setTimeout(()=>p.classList.add('hidden'),1500); } }

    function nextDay(){ STOCKS.forEach(s => { const change = (Math.random() - 0.5) * s.price * 0.08; s.price = Math.max(1, s.price + change); }); state.day++; updateUI(); }

    function resetGame(){ state = { cash: 1000, day: 1, portfolio: {}, history: {} }; createCharts(); updateUI(); }

    window.addEventListener('load', () => { createCharts(); updateUI(); const next = document.getElementById('next-day'); const reset = document.getElementById('reset-game'); if(next) next.addEventListener('click', nextDay); if(reset) reset.addEventListener('click', resetGame); });
})();
