// Candy Stock Market Simulation Game
/*
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

// set per-day unlock ISO (change as needed). Example for day_1:
const UNLOCK_ISO = '2025-10-30T00:00:00-07:00'; // adjust per-day
const unlockDate = new Date(UNLOCK_ISO);

const rn = nowPT();
if(rn < unlockDate){
  showTimeLockOverlay(`This game will unlock on ${unlockDate.toLocaleString('en-US', { timeZone: PT_TZ })} PT.`);
  return; // stop executing the rest of the day's script (paste inside the day's IIFE)
}

if(inBlockedWindow(rn)){
  showTimeLockOverlay('This game is temporarily blocked for scheduled hours. Please try again later.');
  // continue polling until outside blocked hours, remove overlay when allowed
}

const __timeLockChecker = setInterval(() => {
  const n = nowPT();
  if(n < unlockDate){
    if(!document.getElementById('time-lock-overlay')){
      showTimeLockOverlay(`This game will unlock on ${unlockDate.toLocaleString('en-US', { timeZone: PT_TZ })} PT.`);
    }
    return;
  }
  // unlocked; hide overlay if not in blocked window
  if(!inBlockedWindow(n)){
    hideTimeLockOverlay();
    // once unlocked and outside blocked window, we can stop checking
    clearInterval(__timeLockChecker);
  } else {
    // still in blocked window: ensure overlay visible
    if(!document.getElementById('time-lock-overlay')){
      showTimeLockOverlay('This game is temporarily blocked for scheduled hours. Please try again later.');
    }
  }
}, 30_000);
*/
// Game Configuration
const GAME_CONFIG = {
    initialCash: 1000,
    maxDays: 30,
    priceUpdateInterval: 1000, // milliseconds
    newsUpdateInterval: 5000,  // milliseconds
    chartUpdateInterval: 1000, // milliseconds
    maxPriceHistory: 30,      // number of days to show in charts
    volatilityBase: 0.05,     // base volatility for price changes
    autosaveInterval: 30000,  // autosave every 30 seconds
    highScoreKey: 'candyStockHighScores',
    achievements: {
        firstPurchase: { name: 'First Purchase', description: 'Buy your first candy stock' },
        thousandProfit: { name: 'Sweet Profit', description: 'Make $1000 in profit' },
        diversified: { name: 'Candy Connoisseur', description: 'Own all types of candy stocks' },
        bigSpender: { name: 'Big Spender', description: 'Have $5000 total worth' }
    }
};

// Candy Stock Data
const CANDY_STOCKS = {
    choco: {
        name: "Choco Delights",
        basePrice: 10.00,
        volatility: 0.08,
        color: "#8B4513", // brown
        description: "Premium chocolate candies with a smooth, rich flavor.",
        trend: 0.01, // slight upward trend
        history: []
    },
    gummy: {
        name: "Gummy Worms",
        basePrice: 5.50,
        volatility: 0.12,
        color: "#FF5733", // orange-red
        description: "Colorful, chewy gummy worms that kids love.",
        trend: 0.005, // stable with slight growth
        history: []
    },
    lollipop: {
        name: "Lollipop Dreams",
        basePrice: 3.25,
        volatility: 0.15,
        color: "#FF69B4", // hot pink
        description: "Swirled lollipops in various flavors and colors.",
        trend: -0.002, // slight downward trend
        history: []
    },
    taffy: {
        name: "Taffy Twists",
        basePrice: 7.75,
        volatility: 0.10,
        color: "#9370DB", // medium purple
        description: "Soft, chewy taffy in assorted fruit flavors.",
        trend: 0.008, // moderate growth
        history: []
    },
    caramel: {
        name: "Caramel Clouds",
        basePrice: 12.50,
        volatility: 0.06,
        color: "#D2691E", // chocolate
        description: "Luxurious caramel candies with a hint of sea salt.",
        trend: 0.015, // strong growth
        history: []
    }
};

// News Events that affect stock prices
const NEWS_EVENTS = [
    {
        headline: "Sugar shortage affects candy production worldwide",
        impact: { choco: -0.05, gummy: -0.08, lollipop: -0.1, taffy: -0.07, caramel: -0.06 }
    },
    {
        headline: "New health study shows dark chocolate benefits",
        impact: { choco: 0.15, caramel: 0.05 }
    },
    {
        headline: "Kids' favorite TV show features Gummy Worms",
        impact: { gummy: 0.2 }
    },
    {
        headline: "Halloween approaching: candy sales expected to surge",
        impact: { choco: 0.1, gummy: 0.12, lollipop: 0.15, taffy: 0.08, caramel: 0.07 }
    },
    {
        headline: "Taffy Twists announces new flavors",
        impact: { taffy: 0.18 }
    },
    {
        headline: "Caramel Clouds wins 'Best Candy of the Year' award",
        impact: { caramel: 0.25 }
    },
    {
        headline: "Dentists warn against lollipop consumption",
        impact: { lollipop: -0.12 }
    },
    {
        headline: "Supply chain issues delay chocolate imports",
        impact: { choco: -0.08, caramel: -0.04 }
    },
    {
        headline: "Celebrity chef creates desserts with Taffy Twists",
        impact: { taffy: 0.14 }
    },
    {
        headline: "Gummy Worms recalled in three states",
        impact: { gummy: -0.18 }
    },
    {
        headline: "Lollipop Dreams launches sugar-free line",
        impact: { lollipop: 0.09 }
    },
    {
        headline: "Candy tax proposed in several countries",
        impact: { choco: -0.06, gummy: -0.05, lollipop: -0.04, taffy: -0.06, caramel: -0.07 }
    }
];

// Game State
const gameState = {
    day: 1,
    cash: GAME_CONFIG.initialCash,
    portfolio: {
        choco: { shares: 0, avgBuyPrice: 0 },
        gummy: { shares: 0, avgBuyPrice: 0 },
        lollipop: { shares: 0, avgBuyPrice: 0 },
        taffy: { shares: 0, avgBuyPrice: 0 },
        caramel: { shares: 0, avgBuyPrice: 0 }
    },
    currentNews: [],
    gameOver: false,
    selectedCandy: 'choco',
    charts: {},
    achievements: new Set(),
    statistics: {
        totalProfit: 0,
        tradesCount: 0,
        highestProfit: 0
    }
};

// DOM Elements
// Candy-themed Stock Market Game
// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDYcUOKFG2OH7LXrS1YpMB04YMBrT9w4Yc",
    authDomain: "mini-event-a5460.firebaseapp.com",
    projectId: "mini-event-a5460",
    storageBucket: "mini-event-a5460.appspot.com",
    messagingSenderId: "402811747405",
    appId: "1:402811747405:web:7701ee5e962e5a6b89f4c4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', () => {
    // Initialize the game
    initGame();
});

// Initialize candy data
function initializeCandyData() {
    Object.keys(CANDY_STOCKS).forEach(candyId => {
        const candy = CANDY_STOCKS[candyId];
        candy.currentPrice = candy.basePrice;
        // Fill history with base price for initial display
        candy.history = Array(GAME_CONFIG.maxPriceHistory).fill(candy.basePrice);
    });
}

// Initialize the game
function initGame() {
    // Try to load saved game
    const savedGame = loadGame();
    if (savedGame) {
        Object.assign(gameState, savedGame);
        // Ensure candy data is properly loaded
        Object.keys(CANDY_STOCKS).forEach(candyId => {
            if (!CANDY_STOCKS[candyId].currentPrice) {
                CANDY_STOCKS[candyId].currentPrice = CANDY_STOCKS[candyId].basePrice;
            }
            if (!Array.isArray(CANDY_STOCKS[candyId].history) || CANDY_STOCKS[candyId].history.length === 0) {
                CANDY_STOCKS[candyId].history = Array(GAME_CONFIG.maxPriceHistory).fill(CANDY_STOCKS[candyId].currentPrice);
            }
        });
        showMessage("Game loaded from save!");
    } else {
        // Initialize new game data
        initializeCandyData();
    }

    // Create charts for each candy
    createCharts();

    // Update UI
    updateUI();

    // Set up event listeners
    setupEventListeners();

    // Start news ticker
    updateNewsTicker();
    setInterval(updateNewsTicker, GAME_CONFIG.newsUpdateInterval);

    // Start autosave
    setInterval(saveGame, GAME_CONFIG.autosaveInterval);

    // Initialize tooltips
    setupTooltips();
}

// Save game state
function saveGame() {
    const prices = {};
    Object.keys(CANDY_STOCKS).forEach(candyId => {
        const candy = CANDY_STOCKS[candyId];
        prices[candyId] = {
            currentPrice: candy.currentPrice,
            history: candy.history
        };
    });
    const saveData = {
        day: gameState.day,
        cash: gameState.cash,
        portfolio: gameState.portfolio,
        selectedCandy: gameState.selectedCandy,
        achievements: Array.from(gameState.achievements),
        statistics: gameState.statistics,
        prices: prices
    };
    localStorage.setItem('candyStockSave', JSON.stringify(saveData));
}

// Load game state
function loadGame() {
    const saveData = localStorage.getItem('candyStockSave');
    if (saveData) {
        const parsed = JSON.parse(saveData);
        parsed.achievements = new Set(parsed.achievements);
        // Load prices
        if (parsed.prices) {
            Object.keys(parsed.prices).forEach(candyId => {
                if (CANDY_STOCKS[candyId]) {
                    CANDY_STOCKS[candyId].currentPrice = parsed.prices[candyId].currentPrice;
                    CANDY_STOCKS[candyId].history = parsed.prices[candyId].history;
                }
            });
        }
        return parsed;
    }
    return null;
}

// Setup tooltips
function setupTooltips() {
    const tooltips = document.querySelectorAll('[data-tooltip]');
    tooltips.forEach(element => {
        element.addEventListener('mouseenter', e => {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = e.target.dataset.tooltip;
            document.body.appendChild(tooltip);

            const rect = e.target.getBoundingClientRect();
            tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
            tooltip.style.top = rect.bottom + 5 + 'px';
        });

        element.addEventListener('mouseleave', () => {
            const tooltip = document.querySelector('.tooltip');
            if (tooltip) tooltip.remove();
        });
    });
}

// Create price charts for each candy
function createCharts() {
    const chartsContainer = document.getElementById('charts-container');
    if (!chartsContainer) {
        console.error('Charts container not found');
        return;
    }
    chartsContainer.innerHTML = ''; // Clear existing charts
    
    Object.keys(CANDY_STOCKS).forEach(candyId => {
        const candy = CANDY_STOCKS[candyId];
        
        // Validate candy data
        if (!candy || !candy.name || typeof candy.currentPrice === 'undefined' || !Array.isArray(candy.history)) {
            console.error(`Invalid candy data for ${candyId}:`, candy);
            return;
        }

        // Ensure we have valid price data
        if (typeof candy.currentPrice !== 'number' || isNaN(candy.currentPrice)) {
            candy.currentPrice = candy.basePrice;
        }

        // Ensure history array is properly filled
        if (candy.history.length === 0) {
            candy.history = Array(GAME_CONFIG.maxPriceHistory).fill(candy.currentPrice);
        }
        
        // Create chart wrapper
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-wrapper';
        chartWrapper.innerHTML = `
            <h3>${candy.name}</h3>
            <canvas id="chart-${candyId}"></canvas>
            <div class="price-display">Current: $${candy.currentPrice.toFixed(2)}</div>
        `;
        chartsContainer.appendChild(chartWrapper);
        
        // Create chart
        const ctx = document.getElementById(`chart-${candyId}`).getContext('2d');
        gameState.charts[candyId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(candy.history.length).fill('').map((_, i) => `Day ${gameState.day - candy.history.length + i + 1}`),
                datasets: [{
                    label: `${candy.name} Price`,
                    data: candy.history,
                    borderColor: candy.color,
                    backgroundColor: `${candy.color}33`,
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            callback: value => `$${value.toFixed(2)}`
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: context => `Price: $${context.parsed.y.toFixed(2)}`
                        }
                    }
                }
            }
        });
    });
}

// Update charts with new price data
function updateCharts() {
    Object.keys(CANDY_STOCKS).forEach(candyId => {
        const candy = CANDY_STOCKS[candyId];
        const chart = gameState.charts[candyId];
        
        // Validate data before updating
        if (!candy || !Array.isArray(candy.history) || !chart) {
            console.error(`Invalid data for updating ${candyId} chart`);
            return;
        }

        // Ensure history array is properly filled
        if (candy.history.length === 0) {
            candy.history = Array(GAME_CONFIG.maxPriceHistory).fill(candy.currentPrice || candy.basePrice);
        }
        
        try {
            // Update labels
            chart.data.labels = Array(candy.history.length).fill('').map((_, i) => 
                `Day ${Math.max(1, gameState.day - candy.history.length + i + 1)}`
            );

            // Update data
            chart.data.datasets[0].data = candy.history;

            // Update chart
            chart.update();

            // Update price display (guard against invalid numbers)
            const chartElement = document.getElementById(`chart-${candyId}`);
            if (chartElement) {
                const priceDisplay = chartElement.parentNode.querySelector('.price-display');
                if (priceDisplay && typeof candy.currentPrice === 'number' && !isNaN(candy.currentPrice)) {
                    priceDisplay.textContent = `Current: $${candy.currentPrice.toFixed(2)}`;
                }
            }
        } catch (err) {
            console.error(`Failed to update chart for ${candyId}:`, err);
        }
    });
}

// Generate new prices for all candies
function generateNewPrices() {
    Object.keys(CANDY_STOCKS).forEach(candyId => {
        const candy = CANDY_STOCKS[candyId];
        
        // Calculate price change based on volatility, trend, and randomness
        const randomFactor = (Math.random() * 2 - 1); // Random value between -1 and 1
        const volatilityFactor = candy.volatility * randomFactor;
        const trendFactor = candy.trend;
        
        // Apply price change
        const priceChange = candy.currentPrice * (volatilityFactor + trendFactor);
        candy.currentPrice = Math.max(0.01, candy.currentPrice + priceChange);
        
        // Add to history, keeping only the most recent prices
        candy.history.push(candy.currentPrice);
        if (candy.history.length > GAME_CONFIG.maxPriceHistory) {
            candy.history.shift();
        }
    });
}

// Apply news event effects to prices
function applyNewsEvents(newsEvent) {
    if (!newsEvent || !newsEvent.impact) return;
    
    Object.keys(newsEvent.impact).forEach(candyId => {
        if (CANDY_STOCKS[candyId]) {
            const impactPercentage = newsEvent.impact[candyId];
            CANDY_STOCKS[candyId].currentPrice *= (1 + impactPercentage);
            CANDY_STOCKS[candyId].currentPrice = Math.max(0.01, CANDY_STOCKS[candyId].currentPrice);
        }
    });
}

// Update the news ticker with random events
function updateNewsTicker() {
    if (gameState.gameOver) return;
    
    const newsContent = document.getElementById('news-content');
    
    // 30% chance of a news event
    if (Math.random() < 0.3) {
        const newsEvent = NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)];
        gameState.currentNews.push(newsEvent);
        
        // Apply the news event effect
        applyNewsEvents(newsEvent);
        
        // Update the news ticker
        const newsItems = gameState.currentNews.map(news => news.headline).join(' • ');
        newsContent.textContent = newsItems;
        
        // Keep only the 3 most recent news items
        if (gameState.currentNews.length > 3) {
            gameState.currentNews.shift();
        }
    }
}

// Calculate portfolio value
function calculatePortfolioValue() {
    let totalValue = 0;
    
    Object.keys(gameState.portfolio).forEach(candyId => {
        const holding = gameState.portfolio[candyId];
        const currentPrice = CANDY_STOCKS[candyId].currentPrice;
        totalValue += holding.shares * currentPrice;
    });
    
    return totalValue;
}

// Update UI elements
function updateUI() {
    // Update game stats
    const playerCashElement = document.getElementById('player-cash');
    const portfolioValueElement = document.getElementById('portfolio-value');
    const totalWorthElement = document.getElementById('total-worth');
    const currentDayElement = document.getElementById('current-day');
    const currentPriceElement = document.getElementById('current-price');
    const sharesOwnedElement = document.getElementById('shares-owned');
    const sharesValueElement = document.getElementById('shares-value');
    const quantityInput = document.getElementById('quantity');
    const transactionCostElement = document.getElementById('transaction-cost');
    
    if (playerCashElement) playerCashElement.textContent = `$${gameState.cash.toFixed(2)}`;
    
    const portfolioValue = calculatePortfolioValue();
    if (portfolioValueElement) portfolioValueElement.textContent = `$${portfolioValue.toFixed(2)}`;
    
    const totalWorth = gameState.cash + portfolioValue;
    if (totalWorthElement) totalWorthElement.textContent = `$${totalWorth.toFixed(2)}`;
    
    if (currentDayElement) currentDayElement.textContent = gameState.day;
    
    // Update selected candy info
    const selectedCandy = CANDY_STOCKS[gameState.selectedCandy];
    const holding = gameState.portfolio[gameState.selectedCandy];
    
    if (currentPriceElement) currentPriceElement.textContent = `$${selectedCandy.currentPrice.toFixed(2)}`;
    if (sharesOwnedElement) sharesOwnedElement.textContent = holding.shares;
    if (sharesValueElement) sharesValueElement.textContent = `$${(holding.shares * selectedCandy.currentPrice).toFixed(2)}`;
    
    // Update transaction cost
    const quantity = parseInt(quantityInput?.value) || 0;
    if (transactionCostElement) transactionCostElement.textContent = `$${(quantity * selectedCandy.currentPrice).toFixed(2)}`;
    
    // Update portfolio table
    updatePortfolioTable();

    // Update charts
    updateCharts();

    // Update statistics panel
    updateStatisticsPanel();
}

// Update the portfolio table
function updatePortfolioTable() {
    const portfolioBody = document.getElementById('portfolio-body');
    if (!portfolioBody) return;
    
    portfolioBody.innerHTML = '';
    
    Object.keys(gameState.portfolio).forEach(candyId => {
        const holding = gameState.portfolio[candyId];
        const candy = CANDY_STOCKS[candyId];
        
        if (holding.shares > 0) {
            const currentValue = holding.shares * candy.currentPrice;
            const costBasis = holding.shares * holding.avgBuyPrice;
            const profitLoss = currentValue - costBasis;
            const profitLossPercent = (profitLoss / costBasis) * 100;
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${candy.name}</td>
                <td>${holding.shares}</td>
                <td>$${holding.avgBuyPrice.toFixed(2)}</td>
                <td>$${candy.currentPrice.toFixed(2)}</td>
                <td>$${currentValue.toFixed(2)}</td>
                <td class="${profitLoss >= 0 ? 'profit' : 'loss'}">
                    ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} 
                    (${profitLoss >= 0 ? '+' : ''}${profitLossPercent.toFixed(2)}%)
                </td>
            `;
            portfolioBody.appendChild(row);
        }
    });
    
    if (portfolioBody.children.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = '<td colspan="6" class="empty-portfolio">No stocks owned yet</td>';
        portfolioBody.appendChild(emptyRow);
    }
}

// Check for achievements
function checkAchievements() {
    const totalWorth = gameState.cash + calculatePortfolioValue();
    
    // First Purchase
    if (!gameState.achievements.has('firstPurchase') && 
        Object.values(gameState.portfolio).some(h => h.shares > 0)) {
        unlockAchievement('firstPurchase');
    }
    
    // Thousand Profit
    if (!gameState.achievements.has('thousandProfit') && 
        gameState.statistics.totalProfit >= 1000) {
        unlockAchievement('thousandProfit');
    }
    
    // Diversified Portfolio
    if (!gameState.achievements.has('diversified') && 
        Object.values(gameState.portfolio).every(h => h.shares > 0)) {
        unlockAchievement('diversified');
    }
    
    // Big Spender
    if (!gameState.achievements.has('bigSpender') && totalWorth >= 5000) {
        unlockAchievement('bigSpender');
    }
}

// Unlock achievement
function unlockAchievement(achievementId) {
    if (gameState.achievements.has(achievementId)) return;
    
    gameState.achievements.add(achievementId);
    const achievement = GAME_CONFIG.achievements[achievementId];
    
    // Show achievement popup
    const popup = document.getElementById('achievement-popup');
    const name = document.getElementById('achievement-name');
    const description = document.getElementById('achievement-description');
    
    name.textContent = achievement.name;
    description.textContent = achievement.description;
    popup.classList.remove('hidden');
    
    // Hide popup after 3 seconds
    setTimeout(() => {
        popup.classList.add('hidden');
    }, 3000);
    
    // Update achievements panel
    updateAchievementsPanel();
}

// Update achievements panel
function updateAchievementsPanel() {
    const list = document.getElementById('achievements-list');
    if (!list) return;
    list.innerHTML = '';
    gameState.achievements.forEach(id => {
        const ach = GAME_CONFIG.achievements[id];
        const div = document.createElement('div');
        div.className = 'achievement unlocked';
        div.innerHTML = `<strong>${ach.name}</strong><br>${ach.description}`;
        list.appendChild(div);
    });
}

// Update statistics panel
function updateStatisticsPanel() {
    const totalTradesElement = document.getElementById('total-trades');
    const highestProfitElement = document.getElementById('highest-profit');
    const totalProfitElement = document.getElementById('total-profit');

    if (totalTradesElement) totalTradesElement.textContent = gameState.statistics.tradesCount;
    if (highestProfitElement) highestProfitElement.textContent = `$${gameState.statistics.highestProfit.toFixed(2)}`;
    if (totalProfitElement) totalProfitElement.textContent = `$${gameState.statistics.totalProfit.toFixed(2)}`;
}

// Buy candy stocks
function buyStocks() {
    const quantityInput = document.getElementById('quantity');
    const quantity = parseInt(quantityInput?.value) || 0;
    if (quantity <= 0) {
        showMessage("Please enter a valid quantity.");
        return;
    }
    
    const selectedCandy = CANDY_STOCKS[gameState.selectedCandy];
    const totalCost = quantity * selectedCandy.currentPrice;
    
    if (totalCost > gameState.cash) {
        showMessage("Not enough cash for this purchase!");
        return;
    }
    
    // Update portfolio
    const holding = gameState.portfolio[gameState.selectedCandy];
    const newTotalShares = holding.shares + quantity;
    const newTotalCost = (holding.shares * holding.avgBuyPrice) + totalCost;
    holding.avgBuyPrice = newTotalCost / newTotalShares;
    holding.shares = newTotalShares;
    
    // Update cash and statistics
    gameState.cash -= totalCost;
    gameState.statistics.tradesCount++;
    
    // Check achievements
    checkAchievements();
    
    // Update UI
    updateUI();
    showMessage(`Bought ${quantity} shares of ${selectedCandy.name} for $${totalCost.toFixed(2)}`);
    
    // Autosave
    saveGame();
}

// Sell candy stocks
function sellStocks() {
    const quantityInput = document.getElementById('quantity');
    const quantity = parseInt(quantityInput?.value) || 0;
    if (quantity <= 0) {
        showMessage("Please enter a valid quantity.");
        return;
    }

    const holding = gameState.portfolio[gameState.selectedCandy];
    if (quantity > holding.shares) {
        showMessage("You don't own that many shares!");
        return;
    }

    const selectedCandy = CANDY_STOCKS[gameState.selectedCandy];
    const saleValue = quantity * selectedCandy.currentPrice;
    const costBasis = quantity * holding.avgBuyPrice;
    const realizedProfit = saleValue - costBasis;

    // Update portfolio
    holding.shares -= quantity;
    // Note: We don't change avgBuyPrice when selling

    // Update cash
    gameState.cash += saleValue;

    // Update statistics
    gameState.statistics.totalProfit += realizedProfit;
    gameState.statistics.highestProfit = Math.max(gameState.statistics.highestProfit, realizedProfit);
    gameState.statistics.tradesCount++;

    // Check achievements
    checkAchievements();

    // Update UI
    updateUI();
    showMessage(`Sold ${quantity} shares of ${selectedCandy.name} for $${saleValue.toFixed(2)}`);

    // Autosave
    saveGame();
}

// Advance to the next day
function nextDay() {
    if (gameState.gameOver) return;
    
    gameState.day++;
    
    // Generate new prices
    generateNewPrices();
    
    // Check if game is over
    if (gameState.day > GAME_CONFIG.maxDays) {
        endGame();
    } else {
        // Update UI
        updateUI();
        showMessage(`Day ${gameState.day} has begun!`);
    }
}

// Leaderboard functions
async function submitScore(playerName, score) {
    try {
        const scoreData = {
            player: playerName,
            score: score,
            date: firebase.firestore.Timestamp.now(),
            achievements: Array.from(gameState.achievements),
            statistics: gameState.statistics
        };

        await db.collection('candyStockScores').add(scoreData);
        showMessage("Score submitted successfully!");
        updateLeaderboard();
    } catch (error) {
        console.error("Error submitting score:", error);
        showMessage("Error submitting score. Please try again.");
    }
}

async function updateLeaderboard() {
    try {
        const leaderboardBody = document.getElementById('leaderboard-body');
        leaderboardBody.innerHTML = '';

        const snapshot = await db.collection('candyStockScores')
            .orderBy('score', 'desc')
            .limit(10)
            .get();

        snapshot.docs.forEach((doc, index) => {
            const data = doc.data();
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${data.player}</td>
                <td>$${data.score.toFixed(2)}</td>
                <td>${data.date.toDate().toLocaleDateString()}</td>
            `;
            leaderboardBody.appendChild(row);
        });
    } catch (error) {
        console.error("Error updating leaderboard:", error);
    }
}

// End the game
function endGame() {
    gameState.gameOver = true;
    
    const finalScore = gameState.cash + calculatePortfolioValue();
    const finalScoreElement = document.getElementById('final-score');
    const scoreSubmission = document.getElementById('score-submission');
    
    if (finalScoreElement) finalScoreElement.textContent = `$${finalScore.toFixed(2)}`;
    if (scoreSubmission) scoreSubmission.classList.remove('hidden');
    
    // Update leaderboard
    updateLeaderboard();
    
    showMessage("Game Over! Check your final score.");
    
    // Show leaderboard modal
    document.getElementById('leaderboard-modal').classList.remove('hidden');
}

// Reset the game
function resetGame() {
    // Reset game state
    gameState.day = 1;
    gameState.cash = GAME_CONFIG.initialCash;
    gameState.currentNews = [];
    gameState.gameOver = false;
    
    // Reset portfolio
    Object.keys(gameState.portfolio).forEach(candyId => {
        gameState.portfolio[candyId] = { shares: 0, avgBuyPrice: 0 };
    });
    
    // Reset candy prices
    Object.keys(CANDY_STOCKS).forEach(candyId => {
        const candy = CANDY_STOCKS[candyId];
        candy.currentPrice = candy.basePrice;
        candy.history = [candy.basePrice];
    });
    
    // Hide score submission
    const scoreSubmission = document.getElementById('score-submission');
    if (scoreSubmission) scoreSubmission.classList.add('hidden');
    
    // Update UI
    updateUI();
    showMessage("Game reset! You have $1000 to invest.");
}

// Show a message to the player
function showMessage(text) {
    const gameMessage = document.getElementById('game-message');
    if (!gameMessage) return;
    
    gameMessage.textContent = text;
    gameMessage.classList.remove('hidden');
    
    setTimeout(() => {
        gameMessage.classList.add('hidden');
    }, 3000);
}

// Set up event listeners
function setupEventListeners() {
    const candySelect = document.getElementById('candy-select');
    const quantityInput = document.getElementById('quantity');
    const buyButton = document.getElementById('buy-btn');
    const sellButton = document.getElementById('sell-btn');
    const nextDayButton = document.getElementById('next-day-btn');
    const resetGameButton = document.getElementById('reset-game-btn');
    const submitScoreButton = document.getElementById('submit-score-btn');
    const playAgainButton = document.getElementById('play-again-btn');
    const backButton = document.getElementById('back-btn');
    
    // Candy selection
    if (candySelect) {
        candySelect.addEventListener('change', () => {
            gameState.selectedCandy = candySelect.value;
            updateUI();
        });
    }
    
    // Quantity input
    if (quantityInput) {
        quantityInput.addEventListener('input', () => {
            const quantity = parseInt(quantityInput.value) || 0;
            const selectedCandy = CANDY_STOCKS[gameState.selectedCandy];
            const transactionCostElement = document.getElementById('transaction-cost');
            if (transactionCostElement) {
                transactionCostElement.textContent = `$${(quantity * selectedCandy.currentPrice).toFixed(2)}`;
            }
        });
    }
    
    // Buy button
    if (buyButton) {
        buyButton.addEventListener('click', buyStocks);
    }
    
    // Sell button
    if (sellButton) {
        sellButton.addEventListener('click', sellStocks);
    }
    
    // Next day button
    if (nextDayButton) {
        nextDayButton.addEventListener('click', nextDay);
    }
    
    // Reset game button
    if (resetGameButton) {
        resetGameButton.addEventListener('click', resetGame);
    }
    
    // Submit score button
    if (submitScoreButton) {
        submitScoreButton.addEventListener('click', async () => {
            const finalScore = gameState.cash + calculatePortfolioValue();
            const playerName = prompt("Enter your name for the leaderboard:");
            
            if (playerName && playerName.trim()) {
                await submitScore(playerName.trim(), finalScore);
            }
        });
    }
    
    // Close leaderboard button
    const closeLeaderboardBtn = document.getElementById('close-leaderboard');
    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener('click', () => {
            document.getElementById('leaderboard-modal').classList.add('hidden');
        });
    }
    
    // Play again button
    if (playAgainButton) {
        playAgainButton.addEventListener('click', resetGame);
    }
    
    // Back button
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
}

// Draw price chart for a specific candy
function drawChart(candyId) {
    const chart = gameState.charts[candyId];
    const ctx = chart.ctx;
    const canvas = chart.canvas;
    const stock = candyStocks[candyId];
    const priceHistory = stock.priceHistory;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i <= 4; i++) {
        const y = i * (canvas.height / 4);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 6; i++) {
        const x = i * (canvas.width / 6);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Draw price line
    if (priceHistory.length > 1) {
        const maxPrice = Math.max(...priceHistory) * 1.1;
        const minPrice = Math.min(...priceHistory) * 0.9;
        const priceRange = maxPrice - minPrice;
        
        ctx.strokeStyle = stock.color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        // Draw price line
        for (let i = 0; i < priceHistory.length; i++) {
            const x = (i / (priceHistory.length - 1)) * canvas.width;
            const y = canvas.height - ((priceHistory[i] - minPrice) / priceRange) * canvas.height;
            
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.stroke();
    }
    
    // Update price display
    const priceLabel = chart.wrapper.querySelector('.price-label');
    if (priceLabel) {
        priceLabel.textContent = `$${stock.price.toFixed(2)}`;
    }
    
    // Update shares display
    const sharesDisplay = chart.wrapper.querySelector('.shares-display');
    if (sharesDisplay) {
        sharesDisplay.textContent = `${stock.owned} shares`;
    }
    
    // Update profit display
    const profitDisplay = chart.wrapper.querySelector('.profit-display');
    if (profitDisplay) {
        const currentValue = stock.owned * stock.price;
        const profit = currentValue - stock.purchaseValue;
        const profitText = profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`;
        profitDisplay.textContent = profitText;
        profitDisplay.style.color = profit >= 0 ? '#00ff9d' : '#ff6b6b';
    }
}
