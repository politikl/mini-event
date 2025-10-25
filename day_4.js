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
    const rect = playbound.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = LOG_W;
    canvas.height = LOG_H;
  }

  // call resize initially and when window resizes
  resizeCanvasToPlaybound();
  window.addEventListener('resize', () => {
    resizeCanvasToPlaybound();
    repositionBackgroundElements();
  });

  // Constants (in logical coords)
  const W = LOG_W;
  const H = LOG_H;
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
  let scaryMode = localStorage.getItem('day2Scary') === 'true';

  // Timer setup (ends Oct 28 of current year)
  const now = new Date();
  const year = now.getFullYear();
  const EVENT_END_ISO = `${year}-10-28T00:00:00-07:00`;
  const GAME_END_TS = Date.parse(EVENT_END_ISO);

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
  updateTimers();
  setInterval(updateTimers, 1000);

  // Audio
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

  // Row generation
  function createRow(rowIndex) {
    const difficulty = Math.min(1, Math.max(0, rowIndex / 100));
    const bias = Math.max(0, Math.min(0.5, rowIndex / 10));
    const rand = Math.random();

    let type = 'grass';
    if (rowIndex > 0) {
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
      const baseSpeed = 1.6 + difficulty * 2.5;
      const speed = baseSpeed * direction;
      const spacing = 100 + Math.random() * 120;
      const count = Math.max(1, Math.ceil(W / spacing) + 2);

      for (let i = 0; i < count; i++) {
        const isGhost = Math.random() < 0.38;
        row.obstacles.push({
          x: i * spacing + Math.random() * 40 - 60,
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
      const spacing = 140 + Math.random() * 120;
      const count = Math.max(1, Math.ceil(W / spacing) + 2);

      for (let i = 0; i < count; i++) {
        const isBat = Math.random() < 0.25;
        if (isBat) {
          row.obstacles.push({
            x: i * spacing + Math.random() * 40 - 40,
            speed: speed * 1.4,
            width: 36,
            height: 20,
            type: 'bat',
            rideable: false
          });
        } else {
          // log
          const lw = 80 + Math.floor(Math.random() * 80);
          row.obstacles.push({
            x: i * spacing + Math.random() * 40 - 40,
            speed: speed,
            width: lw,
            height: 18 + Math.floor(Math.random() * 8),
            type: 'log',
            rideable: true
          });
        }
      }
    }

    return row;
  }

  function initRows() {
    rows = [];
    for (let i = -2; i < ROWS_VISIBLE; i++) {
      rows.push(createRow(i));
    }
    for (let i = 0; i < 3; i++) {
      const idx = Math.max(0, Math.floor(i + 1));
      rows[idx] = createRow(idx);
      if (rows[idx].type === 'grass') {
        rows[idx].type = (i % 2 === 0) ? 'road' : 'river';
        rows[idx].obstacles = createRow(idx).obstacles;
      }
    }
  }

  function generateNewRows() {
    if (!player) return;
    let minRow = Math.min(...rows.map(r => r.index));
    const neededRow = Math.floor(player.y / TILE_SIZE) - ROWS_VISIBLE;
    while (minRow > neededRow) {
      const newIdx = minRow - 1;
      rows.push(createRow(newIdx));
      minRow = newIdx;
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
          updateScoreUI();
        }
      }
    }

    moveDelay = 140;
  }

  function updateScoreUI(){
    if (bigScoreEl) bigScoreEl.textContent = `Score: ${score}`;
  }

  // Collision
  function checkCollisions() {
    if (!player || !player.alive) return;

    const camY = player ? player.y - H + TILE_SIZE * 3 : 0;
    let currentRow = null;
    for (const r of rows) {
      const drawY = r.y - camY;
      if (Math.abs(drawY - player.y) < TILE_SIZE / 1.2) {
        currentRow = r;
        break;
      }
    }
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
    ctx.clearRect(0, 0, LOG_W, LOG_H);
  }

  function drawBackgroundGradient() {
    const grad = ctx.createLinearGradient(0, 0, 0, LOG_H);
    grad.addColorStop(0, '#0a0508');
    grad.addColorStop(1, '#150610');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, LOG_W, LOG_H);
  }

  function drawPlayerSprite() {
    if (!player) return;
    const px = player.x;
    const py = player.y;
    const w = player.width;
    const h = player.height;
    const cx = px + w / 2;
    const cy = py + h / 2;

    const bodyRadius = Math.min(w, h) / 2;
    const grad = ctx.createLinearGradient(cx, cy - bodyRadius, cx, cy + bodyRadius);
    grad.addColorStop(0, '#ffb86b');
    grad.addColorStop(0.6, '#ff8c00');
    grad.addColorStop(1, '#c25a00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bodyRadius, bodyRadius * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(120,50,0,0.6)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * (bodyRadius * 0.25), cy - bodyRadius * 0.9);
      ctx.quadraticCurveTo(cx + i * 2, cy, cx + i * (bodyRadius * 0.25), cy + bodyRadius * 0.9);
      ctx.stroke();
    }

    ctx.fillStyle = '#3a2a0d';
    ctx.beginPath();
    ctx.ellipse(cx, cy - bodyRadius * 0.95, bodyRadius * 0.18, bodyRadius * 0.28, -0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#000';
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

        for (const obs of row.obstacles) {
          const ox = obs.x;
          const ow = obs.width;
          const oh = obs.height;
          if (obs.type === 'ghost') {
            ctx.fillStyle = 'rgba(200,240,255,0.9)';
            ctx.beginPath();
            ctx.ellipse(ox + ow / 2, drawY + TILE_SIZE / 2, ow / 2, oh / 2, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,0.9)';
            ctx.fillRect(ox + ow * 0.25, drawY + TILE_SIZE / 2 - 6, 6, 6);
            ctx.fillRect(ox + ow * 0.6, drawY + TILE_SIZE / 2 - 6, 6, 6);
          } else {
            ctx.fillStyle = '#8b0000';
            ctx.fillRect(ox, drawY + (TILE_SIZE - oh) / 2, ow, oh);
            ctx.fillStyle = '#c04040';
            ctx.fillRect(ox + 6, drawY + (TILE_SIZE - oh) / 2 + 4, Math.max(8, ow - 12), Math.max(4, oh - 8));
          }
        }
      } else if (row.type === 'river') {
        const grad = ctx.createLinearGradient(0, drawY, 0, drawY + TILE_SIZE);
        grad.addColorStop(0, '#1a3a4a');
        grad.addColorStop(1, '#0f2430');
        ctx.fillStyle = grad;
        ctx.fillRect(0, drawY, W, TILE_SIZE);

        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        for (let x = 0; x < W; x += 24) {
          ctx.beginPath();
          ctx.ellipse(
            x + (Math.sin((Date.now() + x) / 800) * 6),
            drawY + TILE_SIZE / 2 + (Math.cos((Date.now() + x) / 700) * 3),
            8, 2, 0, 0, Math.PI * 2
          );
          ctx.fill();
        }

        for (const obs of row.obstacles) {
          const ox = obs.x;
          const ow = obs.width;
          const oh = obs.height;
          if (obs.type === 'log') {
            ctx.fillStyle = '#5b3e2b';
            ctx.fillRect(ox, drawY + (TILE_SIZE - oh) / 2, ow, oh);
            ctx.fillStyle = '#7a553e';
            ctx.fillRect(ox + 6, drawY + (TILE_SIZE - oh) / 2 + 4, Math.max(4, ow - 12), Math.max(4, oh - 8));
          } else if (obs.type === 'bat') {
            ctx.fillStyle = '#222';
            ctx.beginPath();
            const bx = ox + ow / 2;
            const by = drawY + TILE_SIZE / 2;
            ctx.moveTo(bx, by);
            ctx.quadraticCurveTo(bx - 14, by - 8, bx - 30, by);
            ctx.quadraticCurveTo(bx - 14, by - 6, bx, by);
            ctx.quadraticCurveTo(bx + 14, by - 6, bx + 30, by);
            ctx.quadraticCurveTo(bx + 14, by - 8, bx, by);
            ctx.fill();
          }
        }
      }
    });

    drawPlayerSprite();
  }

  function updateObstacles(dt) {
    for (const r of rows) {
      if (!r.obstacles) continue;
      for (const obs of r.obstacles) {
        obs.x += (obs.speed || 0) * dt * 0.06;
        // loop obstacles
        if (obs.x > W + 200) obs.x = -obs.width - 40;
        if (obs.x < -obs.width - 200) obs.x = W + 40;
      }
    }
  }

  // Simple background element reposition (keeps falling leaves inside viewport)
  function repositionBackgroundElements() {
    // no-op placeholder, keep for compatibility with resize handler
  }

  // Modal helpers — move into playbound for correct style scope while visible
  function showModalInPlaybound(modal) {
    if (!modal) return;
    modal.classList.remove('hidden');
    if (modal.parentElement !== playbound) {
      playbound.appendChild(modal);
    }
  }
  function hideModal(modal) {
    if (!modal) return;
    modal.classList.add('hidden');
    if (modal.parentElement === playbound) {
      document.body.appendChild(modal);
    }
  }

  // Game loop
  function step(nowTs) {
    const dt = Math.min(40, nowTs - lastTime);
    lastTime = nowTs;
    if (moveDelay > 0) moveDelay = Math.max(0, moveDelay - dt);
    if (!running) {
      // still draw static frame
      clearLogicalCanvas();
      drawBackgroundGradient();
      drawRowsAndObstacles();
      updateScoreUI();
      animationId = requestAnimationFrame(step);
      return;
    }

    updateObstacles(dt);
    // if player is on a log, move with it
    if (player && player.onLog) {
      player.x += player.onLog.speed * dt * 0.06;
    }

    checkCollisions();
    clearLogicalCanvas();
    drawBackgroundGradient();
    drawRowsAndObstacles();
    updateScoreUI();

    generateNewRows();

    animationId = requestAnimationFrame(step);
  }

  function startGame() {
    // reset state
    player = createPlayer();
    score = 0;
    rowsPassed = 0;
    highestRow = 0;
    running = true;
    moveDelay = 0;
    initRows();
    lastTime = performance.now();
    if (animationId) cancelAnimationFrame(animationId);
    animationId = requestAnimationFrame(step);
    updateScoreUI();
  }

  function stopGame() {
    running = false;
    if (animationId) cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Input
  window.addEventListener('keydown', (e) => {
    if (!player || !player.alive) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') movePlayer(-1, 0);
    if (k === 'arrowright' || k === 'd') movePlayer(1, 0);
    if (k === 'arrowup' || k === 'w') movePlayer(0, -1);
    if (k === 'arrowdown' || k === 's') movePlayer(0, 1);
  });

  // UI handlers
  if (playBtn) {
    playBtn.addEventListener('click', () => {
      hideModal(playOverlay);
      startGame();
    });
  }

  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) {
          await playbound.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
      } catch (e) {
        // ignore
      }
    });
  }

  if (dayLeaderboardBtn) {
    dayLeaderboardBtn.addEventListener('click', () => {
      showModalInPlaybound(dayLeaderboardModal);
    });
  }

  if (dayLeaderboardClose) {
    dayLeaderboardClose.addEventListener('click', () => {
      hideModal(dayLeaderboardModal);
    });
  }

  if (submitScoreBtn) {
    submitScoreBtn.addEventListener('click', () => {
      // stub: implement server submit later
      submitScoreBtn.disabled = true;
      submitScoreBtn.textContent = 'Saving...';
      setTimeout(() => {
        submitScoreBtn.textContent = 'Saved';
        submitScoreBtn.disabled = false;
        hideModal(gameOverModal);
      }, 700);
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      hideModal(gameOverModal);
      startGame();
    });
  }

  if (scaryToggle) {
    scaryToggle.checked = scaryMode;
    scaryToggle.addEventListener('change', () => {
      scaryMode = !!scaryToggle.checked;
      localStorage.setItem('day2Scary', scaryMode ? 'true' : 'false');
    });
  }

  // initial draw
  clearLogicalCanvas();
  drawBackgroundGradient();
  initRows();
  drawRowsAndObstacles();
  updateScoreUI();
})();
