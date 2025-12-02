// ==================== Holiday Dates ==================== 
const holidays = {
    christmas: new Date(2025, 11, 25),
    hanukkah: new Date(2025, 11, 25),
    kwanzaa: new Date(2026, 0, 1),
    newyear: new Date(2026, 0, 1)
};

// ==================== Snowflake System ==================== 
const canvas = document.getElementById('snow-canvas');
const ctx = canvas.getContext('2d');
let snowflakes = [];
let windDirection = 1;
let windStrength = 0.5;
let windChangeTimer = 0;

// Snowflake types
const SNOWFLAKE_TYPES = {
    SNOW: 'snow',
    HAIL: 'hail',
    SLEET: 'sleet',
    SPECIAL_CLUE: 'clue'
};

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}

class Snowflake {
    constructor(isClue = false) {
        this.x = Math.random() * canvas.width;
        this.y = -10;
        this.size = Math.random() * 5 + 2;
        this.speedY = Math.random() * 2 + 1;
        this.speedX = Math.random() * 2 - 1;
        this.opacity = Math.random() * 0.5 + 0.5;
        
        // Determine snowflake type
        if (isClue) {
            this.type = SNOWFLAKE_TYPES.SPECIAL_CLUE;
            this.color = '#FFD700'; // Gold color for clues
            this.size = Math.random() * 3 + 5; // Slightly larger
        } else {
            const rand = Math.random();
            if (rand < 0.7) {
                this.type = SNOWFLAKE_TYPES.SNOW;
                this.color = '#FFFFFF';
            } else if (rand < 0.85) {
                this.type = SNOWFLAKE_TYPES.HAIL;
                this.color = '#E8F4F8';
                this.size = Math.random() * 2 + 1; // Smaller
            } else {
                this.type = SNOWFLAKE_TYPES.SLEET;
                this.color = '#D0E8F2';
                this.size = Math.random() * 3 + 1.5;
            }
        }
    }

    update() {
        this.y += this.speedY;
        
        // Apply wind effect
        this.x += (this.speedX + windDirection * windStrength) * 0.5;

        // Gentle oscillation based on type
        if (this.type === SNOWFLAKE_TYPES.SNOW) {
            this.speedX += Math.sin(this.y * 0.01) * 0.1;
        } else if (this.type === SNOWFLAKE_TYPES.HAIL) {
            this.speedY += 0.1; // Hail falls faster
        }

        // Fade out near bottom
        if (this.y > canvas.height * 0.9) {
            this.opacity *= 0.98;
        }

        // Reset if off screen
        if (this.y > canvas.height + 20) {
            this.x = Math.random() * canvas.width;
            this.y = -10;
            this.opacity = Math.random() * 0.5 + 0.5;
        }

        // Wrap around sides
        if (this.x > canvas.width + 20) this.x = -20;
        if (this.x < -20) this.x = canvas.width + 20;
    }

    draw() {
        ctx.fillStyle = `rgba(${this.color === '#FFFFFF' ? '255,255,255' : 
                              this.color === '#E8F4F8' ? '232,244,248' :
                              this.color === '#D0E8F2' ? '208,232,242' :
                              '255,215,0'}, ${this.opacity})`;
        
        ctx.shadowColor = `rgba(255, 255, 255, ${this.opacity * 0.5})`;
        ctx.shadowBlur = 10;

        // Draw based on type
        if (this.type === SNOWFLAKE_TYPES.SPECIAL_CLUE) {
            // Gold sparkle for clue
            ctx.fillStyle = `rgba(255, 215, 0, ${this.opacity})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Extra glow
            ctx.strokeStyle = `rgba(255, 215, 0, ${this.opacity * 0.7})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
            ctx.stroke();
        } else if (this.type === SNOWFLAKE_TYPES.HAIL) {
            // Hard circle for hail
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Snowflake pattern
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            if (this.size > 4) {
                ctx.strokeStyle = `rgba(255, 255, 255, ${this.opacity * 0.7})`;
                ctx.lineWidth = 0.5;
                ctx.beginPath();
                ctx.moveTo(this.x - this.size * 1.5, this.y);
                ctx.lineTo(this.x + this.size * 1.5, this.y);
                ctx.moveTo(this.x, this.y - this.size * 1.5);
                ctx.lineTo(this.x, this.y + this.size * 1.5);
                ctx.stroke();
            }
        }
    }
}

function initSnowflakes() {
    snowflakes = [];
    const snowflakeCount = Math.max(50, Math.floor(window.innerWidth / 20));
    for (let i = 0; i < snowflakeCount; i++) {
        snowflakes.push(new Snowflake(false));
    }
    // Add a clue snowflake periodically
    addClueSnowflake();
}

function addClueSnowflake() {
    if (Math.random() < 0.02) { // 2% chance each frame
        snowflakes.push(new Snowflake(true));
    }
}


function animateSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update wind direction periodically
    windChangeTimer++;
    if (windChangeTimer > 300) { // Change every 5 seconds at 60fps
        windChangeTimer = 0;
        windDirection = Math.random() * 2 - 1; // Random direction between -1 and 1
        windStrength = Math.random() * 1.5 + 0.5; // Between 0.5 and 2
    }

    snowflakes.forEach(flake => {
        flake.update();
        flake.draw();
    });

    // Occasionally add clue snowflakes
    addClueSnowflake();

    requestAnimationFrame(animateSnow);
}

// ==================== Stars System ==================== 
function createStars() {
    const starsContainer = document.getElementById('stars-container');
    starsContainer.innerHTML = '';
    const starCount = 150;

    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = Math.random() * 100 + '%';
        star.style.top = Math.random() * 100 + '%';
        star.style.width = Math.random() * 3 + 1 + 'px';
        star.style.height = star.style.width;
        star.style.opacity = Math.random() * 0.7 + 0.3;
        star.style.animationDelay = Math.random() * 3 + 's';
        
        // Add twinkling animation
        star.style.animation = `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`;
        starsContainer.appendChild(star);
    }
}

// ==================== Floating Ornaments ==================== 
function createFloatingOrnaments() {
    const floatingElements = document.getElementById('floating-elements');
    floatingElements.innerHTML = '';
    const count = 6;

    for (let i = 0; i < count; i++) {
        const ornament = document.createElement('div');
        ornament.className = 'floating-ornament';
        ornament.style.left = Math.random() * 90 + 5 + '%';
        ornament.style.top = Math.random() * 60 + '%';
        ornament.style.animationDuration = Math.random() * 2 + 3 + 's';
        ornament.style.animationDelay = Math.random() * 1 + 's';
        floatingElements.appendChild(ornament);
    }
}

// ==================== Day/Night Cycle (Slower) ==================== 
let cycleHour = 6;

function updateDayNightCycle() {
    // Much slower cycle: 1 hour per ~24 seconds, full cycle 60 seconds
    const cycleSpeed = 0.00417; // 1 hour per ~240 seconds (60 second cycle)
    cycleHour = (cycleHour + cycleSpeed) % 24;

    const body = document.body;
    const isNight = cycleHour > 18 || cycleHour < 6;

    if (isNight && !body.classList.contains('night-mode')) {
        body.classList.add('night-mode');
    } else if (!isNight && body.classList.contains('night-mode')) {
        body.classList.remove('night-mode');
    }

    requestAnimationFrame(updateDayNightCycle);
}

// ==================== Celestial Body (Sun/Moon) ==================== 
function updateCelestialBody() {
    const celestialBody = document.getElementById('celestial-body');
    
    if (!celestialBody.classList.contains('sun')) {
        celestialBody.classList.add('sun');
    }
    
    const body = document.body;
    const isNight = body.classList.contains('night-mode');
    
    if (isNight) {
        celestialBody.classList.remove('sun');
        celestialBody.classList.add('moon');
    } else {
        celestialBody.classList.remove('moon');
        celestialBody.classList.add('sun');
    }
    
    requestAnimationFrame(updateCelestialBody);
}

// ==================== Countdown Timers ==================== 
function formatCountdown(targetDate) {
    const now = new Date();
    let diff = targetDate - now;

    if (diff < 0) {
        return '00:00:00';
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateCountdowns() {
    document.getElementById('christmas-countdown').textContent = formatCountdown(holidays.christmas);
    document.getElementById('hanukkah-countdown').textContent = formatCountdown(holidays.hanukkah);
    document.getElementById('kwanzaa-countdown').textContent = formatCountdown(holidays.kwanzaa);
    document.getElementById('newyear-countdown').textContent = formatCountdown(holidays.newyear);
}

// ==================== Button Interactions ==================== 
function setupButtonHandlers() {
    document.getElementById('decomytree-btn').addEventListener('click', () => {
        window.location.href = 'decomytree.html';
    });

    document.getElementById('close-minigame').addEventListener('click', () => {
        stopMiniGame();
        document.getElementById('mini-snowball-game').classList.add('hidden');
    });

    // small game buttons show modal
    const releaseModal = document.getElementById('release-modal');
    const closeRelease = document.getElementById('close-release');
    const collatzBtn = document.getElementById('collatz-btn');
    const hexBtn = document.getElementById('hex-btn');

    function openRelease(name) {
        document.getElementById('release-title').textContent = name;
        document.getElementById('release-message').textContent = 'Will be released on Christmas.';
        releaseModal.classList.remove('hidden');
    }

    collatzBtn.addEventListener('click', (e) => { e.preventDefault(); openRelease('Collatz Racing'); });
    hexBtn.addEventListener('click', (e) => { e.preventDefault(); openRelease('Hexagonal Chess'); });
    closeRelease.addEventListener('click', () => releaseModal.classList.add('hidden'));
}

// ==================== Mini Snowball Game with Powerups ==================== 
let snowballGameActive = false;
let snowballScore = 0;
let snowballLives = 3;
let snowballLevel = 1;
let fallingSnowballs = [];
let powerups = [];

const GAME_CONSTANTS = {
    maxLives: 3,
    levelUpScore: 50,
    initialSpawnRate: 500
};

class FallingSnowball {
    constructor(gameArea) {
        this.x = Math.random() * (gameArea.clientWidth - 20);
        this.y = -20;
        this.size = Math.random() * 15 + 10;
        this.speedY = Math.random() * 3 + 2 + (snowballLevel * 0.5);
        this.element = document.createElement('div');
        this.element.style.cssText = `
            position: absolute;
            left: ${this.x}px;
            top: ${this.y}px;
            width: ${this.size}px;
            height: ${this.size}px;
            background: radial-gradient(circle at 30% 30%, #ffffff, #e0f2fe);
            border-radius: 50%;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            user-select: none;
        `;
        gameArea.appendChild(this.element);
    }

    update() {
        this.y += this.speedY;
        this.element.style.top = this.y + 'px';
    }

    isOffScreen(gameArea) {
        return this.y > gameArea.clientHeight;
    }

    remove() {
        this.element.remove();
    }

    onClick(callback) {
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            callback();
        });
    }
}

class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.element = document.createElement('div');
        
        const icon = type === 'shield' ? '🛡️' : '⭐';
        this.element.innerHTML = icon;
        this.element.style.cssText = `
            position: absolute;
            left: ${this.x}px;
            top: ${this.y}px;
            font-size: 24px;
            cursor: pointer;
            animation: powerup-float 2s ease-out forwards;
            user-select: none;
        `;
        
        document.getElementById('snowball-game-area').appendChild(this.element);
    }

    isOffScreen(gameArea) {
        return this.y < -30;
    }

    update() {
        this.y -= 2;
        this.element.style.top = this.y + 'px';
    }

    remove() {
        this.element.remove();
    }

    onClick(callback) {
        this.element.addEventListener('click', (e) => {
            e.stopPropagation();
            callback();
        });
    }
}

function startMiniGame() {
    snowballGameActive = true;
    snowballScore = 0;
    snowballLives = GAME_CONSTANTS.maxLives;
    snowballLevel = 1;
    fallingSnowballs = [];
    powerups = [];
    
    const gameArea = document.getElementById('snowball-game-area');
    const bucket = document.getElementById('player-bucket');
    const scoreDisplay = document.getElementById('snowball-score');
    const livesDisplay = document.getElementById('snowball-lives');
    const levelDisplay = document.getElementById('snowball-level');
    const statusDisplay = document.getElementById('game-status');

    updateGameDisplay();

    // Mouse tracking
    let bucketX = gameArea.clientWidth / 2 - 30;
    gameArea.addEventListener('mousemove', (e) => {
        const rect = gameArea.getBoundingClientRect();
        bucketX = e.clientX - rect.left - 30;
        bucketX = Math.max(0, Math.min(bucketX, gameArea.clientWidth - 60));
        bucket.style.left = bucketX + 'px';
    });

    // Spawn snowballs with increasing difficulty
    const spawnInterval = setInterval(() => {
        if (!snowballGameActive) {
            clearInterval(spawnInterval);
            return;
        }
        const snowball = new FallingSnowball(gameArea);
        snowball.onClick(() => {
            snowballScore++;
            updateGameDisplay();
            checkLevelUp();
            snowball.remove();
            fallingSnowballs = fallingSnowballs.filter(s => s !== snowball);
            
            // Random chance for powerup
            if (Math.random() < 0.1) {
                spawnPowerup(snowball.x, snowball.y, Math.random() < 0.5 ? 'shield' : 'star');
            }
        });
        fallingSnowballs.push(snowball);
    }, Math.max(200, GAME_CONSTANTS.initialSpawnRate - (snowballLevel * 50)));

    function gameLoop() {
        if (!snowballGameActive) return;

        fallingSnowballs.forEach((snowball, index) => {
            snowball.update();

            const snowballRect = snowball.element.getBoundingClientRect();
            const bucketRect = bucket.getBoundingClientRect();

            if (
                snowballRect.bottom >= bucketRect.top &&
                snowballRect.left < bucketRect.right &&
                snowballRect.right > bucketRect.left
            ) {
                snowballScore++;
                updateGameDisplay();
                checkLevelUp();
                snowball.remove();
                fallingSnowballs.splice(index, 1);
            } else if (snowball.isOffScreen(gameArea)) {
                snowballLives--;
                updateGameDisplay();
                
                if (snowballLives <= 0) {
                    endGame('Game Over! Final Score: ' + snowballScore);
                    snowballGameActive = false;
                    clearInterval(spawnInterval);
                    return;
                }
                snowball.remove();
                fallingSnowballs.splice(index, 1);
            }
        });

        powerups.forEach((powerup, index) => {
            powerup.update();
            
            if (powerup.isOffScreen(gameArea)) {
                powerup.remove();
                powerups.splice(index, 1);
            }
        });

        requestAnimationFrame(gameLoop);
    }

    function spawnPowerup(x, y, type) {
        const powerup = new Powerup(x, y, type);
        powerup.onClick(() => {
            if (type === 'shield') {
                snowballLives = Math.min(snowballLives + 1, GAME_CONSTANTS.maxLives);
            } else {
                snowballScore += 10;
            }
            updateGameDisplay();
            powerup.remove();
            powerups = powerups.filter(p => p !== powerup);
        });
        powerups.push(powerup);
    }

    function checkLevelUp() {
        const newLevel = Math.floor(snowballScore / GAME_CONSTANTS.levelUpScore) + 1;
        if (newLevel > snowballLevel) {
            snowballLevel = newLevel;
            updateGameDisplay();
        }
    }

    function updateGameDisplay() {
        scoreDisplay.textContent = `Score: ${snowballScore}`;
        livesDisplay.textContent = `Lives: ${'❤️'.repeat(snowballLives)}`;
        levelDisplay.textContent = `Level: ${snowballLevel}`;
    }

    function endGame(message) {
        statusDisplay.textContent = message;
        statusDisplay.style.display = 'block';
        bucket.style.pointerEvents = 'none';
    }

    gameLoop();
}

function stopMiniGame() {
    snowballGameActive = false;
    fallingSnowballs.forEach(s => s.remove());
    powerups.forEach(p => p.remove());
    fallingSnowballs = [];
    powerups = [];
    document.getElementById('snowball-game-area').innerHTML = '<div id="player-bucket"></div>';
}

// ==================== Mini Game Setup ==================== 
function setupMiniGame() {
    const trigger = document.getElementById('minigame-trigger');
    let clickCount = 0;
    let clickTimer = null;

    trigger.addEventListener('click', () => {
        clickCount++;
        clearTimeout(clickTimer);

        if (clickCount === 3) {
            document.getElementById('mini-snowball-game').classList.remove('hidden');
            startMiniGame();
            clickCount = 0;
        }

        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 1000);
    });
}

// ==================== Notification System ==================== 
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 15px 30px;
        border-radius: 10px;
        z-index: 2000;
        font-size: 1rem;
        animation: slide-up 0.3s ease-out;
        backdrop-filter: blur(10px);
    `;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slide-down 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 2500);
}

// ==================== CSS Animations ==================== 
const style = document.createElement('style');
style.textContent = `
    @keyframes particle-float {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translateY(-100px) scale(0.5);
        }
    }

    @keyframes slide-up {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }

    @keyframes slide-down {
        from {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        to {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
        }
    }

    @keyframes twinkle {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 1; }
    }

    @keyframes powerup-float {
        0% {
            opacity: 1;
            transform: translateY(0) scale(1);
        }
        100% {
            opacity: 0;
            transform: translateY(-100px) scale(0);
        }
    }
`;
document.head.appendChild(style);

// ==================== Initialization ==================== 
window.addEventListener('load', () => {
    resizeCanvas();
    initSnowflakes();
    createStars();
    createFloatingOrnaments();
    
    animateSnow();
    updateDayNightCycle();
    updateCelestialBody();
    
    updateCountdowns();
    setInterval(updateCountdowns, 1000);

    setupButtonHandlers();
    setupMiniGame();

    setTimeout(() => {
        showNotification('❄️ Welcome to Winter Celebrations! (Triple-click top-right for minigame)');
    }, 500);
});

window.addEventListener('resize', () => {
    resizeCanvas();
    createFloatingOrnaments();
});
