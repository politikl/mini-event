// Spooky Crossy Road - Day 2 Game (fixed: movement, background, enemies, character)
(() => {
  // DOM
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const playbound = document.getElementById('playbound');
  const bigScoreEl = document.getElementById('big-score');
  const gameTimerHeader = document.getElementById('game-timer');
  const scaryToggle = document.getElementById('day-scary-toggle');
  const dayLeaderboardBtn = document.getElementById('day-leaderboard-btn');
  const dayLeaderboardModal = document.getElementById('day-leaderboard-modal');
  const dayLeaderboardClose = document.getElementById('day-leaderboard-close');
  const dayLeaderboardBody = document.getElementById('day-leaderboard-body');
  const gameOverModal = document.getElementById('game-over-modal');
  const finalScoreEl = document.getElementById('final-score');
  const rowsCrossedEl = document.getElementById('rows-crossed');
  const submitScoreBtn = document.getElementById('submit-score-btn');
  const retryBtn = document.getElementById('retry-btn');
  const submitNote = document.getElementById('submit-note');
  const dayJumpscareImg = document.getElementById('day-jumpscare-img');
  const dayJumpscare = document.getElementById('day-jumpscare');
  const playOverlay = document.getElementById('play-overlay');
  const playBtn = document.getElementById('play-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const backgroundRoot = document.getElementById('background');

  // Logical canvas resolution — keep game math in a stable coordinate system
  const LOG_W = 480;
  const LOG_H = 720;

  // Keep canvas drawing scaled to fit displayed playbound (so mouse/touch coordinates and visual match)
  function resizeCanvasToPlaybound() {
    // compute target pixel size based on playbound display size
    const rect = playbound.getBoundingClientRect();
    // maintain logical coordinate system but scale to displayed size
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    // set internal resolution to logical values (so game math remains stable)
    canvas.width = LOG_W;
    canvas.height = LOG_H;
    // optionally scale context to match if you want crisp scaling; here we will draw at LOG_W/LOG_H coords
  }

  // call resize initially and when window resizes
  resizeCanvasToPlaybound();
  window.addEventListener('resize', () => {
    resizeCanvasToPlaybound();
    // re-position any background elements to remain within viewport bounds
    repositionBackgroundElements();
  });

  // Constants (in logical coords)
  const W = canvas.width; // LOG_W
  const H = canvas.height; // LOG_H
  const TILE_SIZE = 48;
  const PLAYER_SIZE = 36;
  const ROWS_VISIBLE = Math.ceil(H / TILE_SIZE) + 2;

  // State
  let player = null;
  let rows = [];
  let score = 0;
  let rowsPassed = 0;
  let highestRow = 0;
  let running = false;
  let lastTime = performance.now();
  let animationId = null;
  let moveDelay = 0; // ms cooldown between grid moves
  // allow initial setting via localStorage
  let scaryMode = localStorage.getItem('day2Scary') === 'true';

  // Timer setup (ends Oct 28 of current year)
  const now = new Date();
  const year = now.getFullYear();
  const EVENT_END_ISO = `${year}-10-28T00:00:00-07:00`;
  const GAME_END_TS = Date.parse(EVENT_END_ISO);

  // Helpers
  function formatTimeRemaining(ms) {
    if (ms <= 0) return '00:00:00';
    const s = Math.floor(ms / 1000);
    const hh = Math.floor(s / 3600).toString().padStart(2,'0');
    const mm = Math.floor((s % 3600) / 60).toString().padStart(2,'0');
    const ss = (s % 60).toString().padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }

  function updateTimers() {
    if (!gameTimerHeader) return;
    const left = GAME_END_TS - Date.now();
    gameTimerHeader.textContent = left <= 0 ? 'Game Ended' : formatTimeRemaining(left);
  }

  // Audio (unchanged)
  function getAudioCtx(){ 
    try { 
      return new (window.AudioContext||window.webkitAudioContext)(); 
    } catch(e){ 
      return null; 
    } 
  }

  function playScreamLoud(){
    const ctxAudio = getAudioCtx(); 
    if(!ctxAudio) return;
    const o = ctxAudio.createOscillator(), g = ctxAudio.createGain();
    o.type='sawtooth'; 
    o.frequency.setValueAtTime(220, ctxAudio.currentTime);
    g.gain.setValueAtTime(0.0001, ctxAudio.currentTime);
    g.gain.exponentialRampToValueAtTime(0.7, ctxAudio.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctxAudio.currentTime + 1.2);
    o.connect(g); 
    g.connect(ctxAudio.destination);
    o.start(); 
    o.stop(ctxAudio.currentTime + 1.2);
  }

  function doJumpscare(){
    if(!scaryMode) return;
    dayJumpscareImg.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1000' height='1000'%3E%3Crect width='100%' height='100%' fill='%23000'/%3E%3Ctext x='50%' y='55%' font-size='140' text-anchor='middle' fill='%23ff0000' font-family='Creepster'%3EBOO!%3C/text%3E%3C/svg%3E";
    dayJumpscare.classList.remove('hidden');
    playScreamLoud();
    setTimeout(()=> dayJumpscare.classList.add('hidden'), 1300);
  }

  // Row generation (fixed to guarantee some obstacles initially)
  function createRow(rowIndex) {
    const difficulty = Math.min(1, Math.max(0, rowIndex / 100));
    // slightly bias toward obstacles early so the player sees enemies immediately
    const bias = Math.max(0, Math.min(0.5, rowIndex / 10));
    const rand = Math.random();

    let type = 'grass';
    if (rowIndex > 0) {
      // ensure some obstacles in early positive rows
      if (rand < 0.18 - bias) type = 'island';
      else if (rand < 0.47 + bias) type = 'road';
      else if (rand < 0.8) type = 'river';
      else type = 'grass';
    }

    const row = {
      index: rowIndex,
      y: -rowIndex * TILE_SIZE,
      type: type,
      obstacles: []
    };

    if (row.type === 'road') {
      const direction = Math.random() < 0.5 ? 1 : -1;
      const baseSpeed = 1.6 + difficulty * 2.5; // slightly faster so they are visible
      const speed = baseSpeed * direction;
      const spacing = 100 + Math.random() * 120;
      const count = Math.max(1, Math.ceil(W / spacing) + 2);

      for (let i = 0; i < count; i++) {
        const isGhost = Math.random() < 0.38;
        row.obstacles.push({
          x: i * spacing + Math.random() * 40,
          speed: speed,
          width: isGhost ? 40 : 50,
          height: isGhost ? 40 : 44,
          type: isGhost ? 'ghost' : 'car'
        });
      }
    } else if (row.type === 'river') {
      const direction = Math.random() < 0.5 ? 1 : -1;
      const baseSpeed = 0.9 + difficulty * 1.8;
      const speed = baseSpeed * direction;
      const logCount = 2 + Math.floor(Math.random() * 3);

      for (let i = 0; i < logCount; i++) {
        const isBat = Math.random() < 0.28;
        row.obstacles.push({
          x: (i / logCount) * W + Math.random() * 60,
          speed: speed,
          width: isBat ? 35 : (80 + Math.random() * 70),
          height: TILE_SIZE - 8,
          type: isBat ? 'bat' : 'log',
          rideable: !isBat
        });
      }
    }

    return row;
  }

  function initRows() {
    rows = [];
    // create some positive rows close to player that are likely to include obstacles
    for (let i = -2; i < ROWS_VISIBLE; i++) {
      rows.push(createRow(i));
    }
    // guarantee at least a couple of obstacle rows near the player start
    for (let i = 0; i < 3; i++) {
      const idx = Math.max(0, Math.floor(i + 1));
      rows[idx] = createRow(idx);
      if (rows[idx].type === 'grass') {
        // force one road row in early area
        rows[idx].type = (i % 2 === 0) ? 'road' : 'river';
        rows[idx].obstacles = createRow(idx).obstacles;
      }
    }
  }

  function generateNewRows() {
    if (!player) return;
    // find current minimum (lowest-index) row we have
    let minRow = Math.min(...rows.map(r => r.index));
    const neededRow = Math.floor(player.y / TILE_SIZE) - ROWS_VISIBLE;

    // if we need older rows (smaller index), add them until covered
    while (minRow > neededRow) {
      const newIdx = minRow - 1;
      rows.push(createRow(newIdx));
      minRow = newIdx;
      // prune very old rows to keep memory bounded
      if (rows.length > ROWS_VISIBLE + 12) {
        rows = rows.filter(r => r.index > Math.floor(player.y / TILE_SIZE) + 6);
      }
    }
  }

  // Player
  function createPlayer() {
    return {
      x: W / 2 - PLAYER_SIZE / 2,
      y: H - TILE_SIZE - 10,
      gridX: Math.floor(W / 2 / TILE_SIZE),
      gridY: 0,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      alive: true,
      onLog: null
    };
  }

  // grid move: dx/dy in tiles
  function movePlayer(dx, dy) {
    if (!player || !player.alive) return;
    // allow movement if cooldown is zero
    if (moveDelay > 0) return;

    const newX = player.x + dx * TILE_SIZE;
    const newY = player.y + dy * TILE_SIZE;

    if (newX >= 0 && newX + player.width <= W) {
      player.x = newX;
      player.gridX += dx;
    }

    if (dy !== 0) {
      player.y = newY;
      player.gridY -= dy;

      if (dy < 0) {
        if (player.gridY > highestRow) {
          const diff = player.gridY - highestRow;
          highestRow = player.gridY;
          rowsPassed += diff;
          const pointsPerRow = Math.max(1, Math.floor(rowsPassed / 10));
          score += diff * pointsPerRow;
        }
      }
    }

    // short cooldown so repeated keys don't over-move
    moveDelay = 140;
  }

  // Collision
  function checkCollisions() {
    if (!player || !player.alive) return;

    // find the row the player's center is closest to
    const playerCenterY = player.y + player.height / 2;
    const playerRow = rows.find(r => Math.abs(r.y + (H - (player.y + player.height/2)) - player.y) < TILE_SIZE*2) // fallback (old calculation)
      || rows.find(r => Math.abs(r.y - player.y) < TILE_SIZE / 1.5)
      || rows[Math.floor(rows.length/2)];

    // More robust: compute nearest by index
    let nearest = null;
    let best = Infinity;
    for (const r of rows) {
      const dy = Math.abs(r.y - player.y);
      if (dy < best) { best = dy; nearest = r; }
    }

    const currentRow = nearest;
    if (!currentRow) return;

    player.onLog = null;

    if (currentRow.type === 'road') {
      for (const obs of currentRow.obstacles) {
        if (player.x < obs.x + obs.width - 10 &&
            player.x + player.width > obs.x + 10 &&
            Math.abs(currentRow.y - player.y) < TILE_SIZE / 1.2) {
          killPlayer();
          return;
        }
      }
    } else if (currentRow.type === 'river') {
      let onSomething = false;
      for (const obs of currentRow.obstacles) {
        if (obs.rideable &&
            (player.x + player.width / 2) > obs.x &&
            (player.x + player.width / 2) < (obs.x + obs.width) &&
            Math.abs(currentRow.y - player.y) < TILE_SIZE / 1.2) {
          onSomething = true;
          player.onLog = obs;
          break;
        }
      }

      for (const obs of currentRow.obstacles) {
        if (obs.type === 'bat' &&
            player.x < obs.x + obs.width - 8 &&
            player.x + player.width > obs.x + 8 &&
            Math.abs(currentRow.y - player.y) < TILE_SIZE / 1.2) {
          killPlayer();
          return;
        }
      }

      if (!onSomething) {
        killPlayer();
        return;
      }
    }

    if (player.x < -player.width || player.x > W) {
      killPlayer();
    }
  }

  function killPlayer() {
    if (!player || !player.alive) return;
    player.alive = false;
    running = false;

    finalScoreEl.textContent = score;
    rowsCrossedEl.textContent = rowsPassed;
    submitNote.textContent = (Date.now() <= GAME_END_TS)
      ? 'This score is within the event window and can be submitted to the main leaderboard.'
      : 'Event window ended — score will be recorded in the day leaderboard only.';

    setTimeout(() => {
      showModalInPlaybound(gameOverModal);
    }, 120);

    if (scaryMode && Math.random() < 0.6) {
      doJumpscare();
    }
  }

  // Drawing
  function clearLogicalCanvas() {
    // clear the logical canvas
    ctx.clearRect(0, 0, LOG_W, LOG_H);
  }

  function drawBackgroundGradient() {
    const grad = ctx.createLinearGradient(0, 0, 0, LOG_H);
    grad.addColorStop(0, '#0a0508');
    grad.addColorStop(1, '#150610');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOG_W, LOG_H);
  }

  // Draw improved pumpkin player (nicer than a plain circle)
  function drawPlayerSprite() {
    if (!player) return;
    const px = player.x;
    const py = player.y;
    const w = player.width;
    const h = player.height;
    const cx = px + w / 2;
    const cy = py + h / 2;

    // pumpkin body
    const bodyRadius = Math.min(w, h) / 2;
    const grad = ctx.createLinearGradient(cx, cy - bodyRadius, cx, cy + bodyRadius);
    grad.addColorStop(0, '#ffb86b');
    grad.addColorStop(0.6, '#ff8c00');
    grad.addColorStop(1, '#c25a00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bodyRadius, bodyRadius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // ribs
    ctx.strokeStyle = 'rgba(120,50,0,0.6)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * (bodyRadius * 0.25), cy - bodyRadius * 0.9);
      ctx.quadraticCurveTo(cx + i * 2, cy, cx + i * (bodyRadius * 0.25), cy + bodyRadius * 0.9);
      ctx.stroke();
    }

    // stem
    ctx.fillStyle = '#3a2a0d';
    ctx.beginPath();
    ctx.ellipse(cx, cy - bodyRadius * 0.95, bodyRadius * 0.18, bodyRadius * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // face (eyes + mouth)
    ctx.fillStyle = '#000';
    // eyes
    ctx.beginPath();
    ctx.moveTo(cx - bodyRadius * 0.35, cy - bodyRadius * 0.1);
    ctx.lineTo(cx - bodyRadius * 0.15, cy - bodyRadius * 0.25);
    ctx.lineTo(cx - bodyRadius * 0.05, cy - bodyRadius * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + bodyRadius * 0.35, cy - bodyRadius * 0.1);
    ctx.lineTo(cx + bodyRadius * 0.15, cy - bodyRadius * 0.25);
    ctx.lineTo(cx + bodyRadius * 0.05, cy - bodyRadius * 0.1);
    ctx.closePath();
    ctx.fill();

    // mouth
    ctx.beginPath();
    ctx.moveTo(cx - bodyRadius * 0.35, cy + bodyRadius * 0.35);
    ctx.quadraticCurveTo(cx, cy + bodyRadius * 0.6, cx + bodyRadius * 0.35, cy + bodyRadius * 0.35);
    ctx.lineTo(cx + bodyRadius * 0.18, cy + bodyRadius * 0.25);
    ctx.quadraticCurveTo(cx, cy + bodyRadius * 0.4, cx - bodyRadius * 0.18, cy + bodyRadius * 0.25);
    ctx.closePath();
    ctx.fill();
  }

  function drawRowsAndObstacles() {
    const camY = player ? player.y - H + TILE_SIZE * 3 : 0;
    rows.forEach(row => {
      const drawY = row.y - camY;
      if (drawY < -TILE_SIZE || drawY > H + TILE_SIZE) return;

      if (row.type === 'grass') {
        ctx.fillStyle = '#2d4a2f';
        ctx.fillRect(0, drawY, W, TILE_SIZE);
        ctx.fillStyle = '#1a3a1f';
        for (let x = 0; x < W; x += TILE_SIZE) {
          ctx.fillRect(x + 2, drawY + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
      } else if (row.type === 'island') {
        ctx.fillStyle = '#5a4a2a';
        ctx.fillRect(0, drawY, W, TILE_SIZE);
        ctx.fillStyle = '#8b7355';
        for (let x = 0; x < W; x += TILE_SIZE * 2) {
          ctx.fillRect(x + 4, drawY + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        }
        ctx.fillStyle = '#ff8c00';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎃', W / 2, drawY + TILE_SIZE / 2 + 8);
      } else if (row.type === 'road') {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, drawY, W, TILE_SIZE);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        ctx.moveTo(0, drawY + TILE_SIZE / 2);
        ctx.lineTo(W, drawY + TILE_SIZE / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (row.type === 'river') {
        const grad = ctx.createLinearGradient(0, drawY, 0, drawY + TILE_SIZE);
        grad.addColorStop(0, '#1a3a4a');
        grad.addColorStop(1, '#
