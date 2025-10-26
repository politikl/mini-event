// Spooky Crossy Road - Day 2 Game (fixed: movement, background, enemies, character, tuning)
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
  const TILE_SIZE = 24;
  const PLAYER_SIZE = 36;
  const ROWS_VISIBLE = Math.ceil(H / TILE_SIZE) + 2;
  // how many tile rows the camera leaves above the player (look-ahead)
  const CAMERA_LOOKAHEAD_ROWS = 12;
  const STARTING_ROW = -3; // Player starts 3 rows back from enemies

  // State
  let player = null;
  let rows = [];
  let score = 0;
  let rowsPassed = 0;
  let highestRow = STARTING_ROW;
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

    // Starting area (negative rows) should be safe
    let type = 'grass';
    if (rowIndex < 0) {
      type = 'grass';
    } else if (rowIndex === 0) {
      type = 'island'; // Safe spawn area
    } else if (rowIndex <= 3) {
      // First few rows with enemies
      type = (rowIndex % 2 === 0) ? 'road' : 'river';
    } else {
      if (rand < 0.16 - bias) type = 'island';
      else if (rand < 0.5 + bias) type = 'road';
      else if (rand < 0.82) type = 'river';
      else type = 'grass';
    }

    const row = {
      index: rowIndex,
      y: -rowIndex * TILE_SIZE,
      type: type,
      obstacles: []
    };

    // Only add obstacles to positive rows (enemies start at row 1+)
    if (rowIndex >= 1) {
      if (row.type === 'road') {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const baseSpeed = 1.0 + difficulty * 1.8;
        const speed = baseSpeed * direction;
        const spacing = 160 + Math.random() * 120;
        const count = Math.max(1, Math.ceil(W / spacing));

        for (let i = 0; i < count; i++) {
          const isGhost = Math.random() < 0.32;
          const baseX = Math.round((i * spacing + Math.random() * 40 - 60) / TILE_SIZE) * TILE_SIZE;
          row.obstacles.push({
            x: baseX,
            speed: speed,
            width: isGhost ? TILE_SIZE : Math.round(1.0 * TILE_SIZE),
            height: isGhost ? TILE_SIZE : Math.round(0.9 * TILE_SIZE),
            type: isGhost ? 'ghost' : 'car'
          });
        }
      } else if (row.type === 'river') {
        const direction = Math.random() < 0.5 ? 1 : -1;
        const baseSpeed = 0.6 + difficulty * 1.2;
        const speed = baseSpeed * direction;
        const spacing = 180 + Math.random() * 120;
        const count = Math.max(1, Math.ceil(W / spacing));

        for (let i = 0; i < count; i++) {
          const baseX = Math.round((i * spacing + Math.random() * 40 - 40) / TILE_SIZE) * TILE_SIZE;
          const lw = Math.round((80 + Math.floor(Math.random() * 80)) / TILE_SIZE) * TILE_SIZE;
          row.obstacles.push({
            x: baseX,
            speed: speed,
            width: lw,
            height: Math.round(0.45 * TILE_SIZE),
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
    // Create rows from starting position up to visible area
    const startSpanBefore = 2;
    const startSpanAfter = ROWS_VISIBLE;
    for (let i = STARTING_ROW - startSpanBefore; i < STARTING_ROW + startSpanAfter; i++) {
      rows.push(createRow(i));
    }
  }

  function generateNewRows() {
    if (!player) return;
    let minRow = Math.min(...rows.map(r => r.index));
    const neededRow = player.gridY - ROWS_VISIBLE;
    while (minRow > neededRow) {
      const newIdx = minRow - 1;
      rows.push(createRow(newIdx));
      minRow = newIdx;
      if (rows.length > ROWS_VISIBLE + 12) {
        rows = rows.filter(r => r.index > player.gridY + 6);
      }
    }
  }

  // util mapping between grid row index and world Y so player is centered inside tiles
  function gridYToWorldY(gridY) {
    return -gridY * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
  }

  // Camera helper to keep player near bottom and allow looking ahead
  function getCamY() {
    if (!player) return 0;
    return player.y - (H - TILE_SIZE * CAMERA_LOOKAHEAD_ROWS);
  }

  // Player
  function createPlayer() {
    const startGridX = Math.floor((W / TILE_SIZE) / 2);
    const startGridY = STARTING_ROW;
    const alignedX = startGridX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
    const alignedY = gridYToWorldY(startGridY);
    return {
      x: alignedX,
      y: alignedY,
      gridX: startGridX,
      gridY: startGridY,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      alive: true,
      onLog: null,
      moving: false,
      startX: 0,
      startY: 0,
      targetX: 0,
      targetY: 0,
      moveStart: 0,
      moveDuration: 140
    };
  }

  // grid move: dx/dy in tiles. dy positive = forward/up, negative = backward/down
  function movePlayer(dx, dy) {
    if (!player || !player.alive) return;
    if (moveDelay > 0 || player.moving) return;

    const newGridX = player.gridX + dx;
    const newGridY = player.gridY + dy;

    // Prevent moving backwards past starting position
    if (newGridY < STARTING_ROW) {
      return;
    }

    // clamp to grid bounds
    const maxGridX = Math.floor((W - PLAYER_SIZE) / TILE_SIZE);
    const clampedGridX = Math.max(0, Math.min(maxGridX, newGridX));

    const targetX = clampedGridX * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
    const targetY = gridYToWorldY(newGridY);

    player.startX = player.x;
    player.startY = player.y;
    player.targetX = targetX;
    player.targetY = targetY;
    player.moveStart = performance.now();
    player.moving = true;

    player.onLog = null;

    player.gridX = clampedGridX;
    player.gridY = newGridY;

    moveDelay = player.moveDuration + 80;
  }

  function updateScoreUI(){
    if (bigScoreEl) bigScoreEl.textContent = `Score: ${score}`;
  }

  // Collision
  function checkCollisions() {
    if (!player || !player.alive) return;

    const camY = getCamY();
    let currentRow = null;
    for (const r of rows) {
      const drawY = r.y - camY;
      const playerCenterY = player.y + player.height / 2;
      if (playerCenterY >= drawY && playerCenterY < drawY + TILE_SIZE) {
        currentRow = r;
        break;
      }
    }
    if (!currentRow) return;

    player.onLog = null;

    if (currentRow.type === 'road') {
      for (const obs of currentRow.obstacles) {
        if (player.x < obs.x + obs.width - 8 &&
            player.x + player.width > obs.x + 8) {
          killPlayer();
          return;
        }
      }
    } else if (currentRow.type === 'river') {
      let onSomething = false;
      for (const obs of currentRow.obstacles) {
        if (obs.rideable &&
            (player.x + player.width / 2) > obs.x &&
            (player.x + player.width / 2) < (obs.x + obs.width)) {
          onSomething = true;
          player.onLog = obs;
          break;
        }
      }

      for (const obs of currentRow.obstacles) {
        if (obs.type === 'bat' &&
            player.x < obs.x + obs.width - 8 &&
            player.x + player.width > obs.x + 8) {
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

  // Drawing helpers for nicer enemies
  function drawCar(ox, oy, w, h) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = '#b22222';
    roundRect(ctx, 0, -h/2, w, h, Math.max(4, h/5));
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(w*0.2, -h*0.35, w*0.45, h*0.3);
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(w*0.2, h*0.25, h*0.18, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w*0.8, h*0.25, h*0.18, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawGhost(ox, oy, w, h) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = 'rgba(220,240,255,0.95)';
    ctx.beginPath();
    ctx.ellipse(w/2, 0, w/2, h/2, 0, Math.PI, 2*Math.PI);
    const tails = 3;
    for (let i=0;i<tails;i++) {
      const tx = (i+0.5) * (w / tails);
      ctx.quadraticCurveTo(tx, h*0.6, tx + w/(tails*2), 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.arc(w*0.38, -h*0.08, w*0.06, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w*0.62, -h*0.08, w*0.06, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function drawBat(ox, oy, w, h) {
    ctx.save();
    ctx.translate(ox, oy);
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(0,0);
    ctx.quadraticCurveTo(w*0.25,-h*0.6, w*0.5,0);
    ctx.quadraticCurveTo(w*0.75,-h*0.6, w,0);
    ctx.lineTo(w*0.85,h*0.2);
    ctx.quadraticCurveTo(w*0.5,-h*0.1, w*0.15,h*0.2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffeb8a';
    ctx.beginPath(); ctx.arc(w*0.4, -h*0.05, w*0.05, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(w*0.6, -h*0.05, w*0.05, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.min(w, h)/2);
    ctx.beginPath();
    ctx.moveTo(x+rr, y);
    ctx.arcTo(x+w, y, x+w, y+h, rr);
    ctx.arcTo(x+w, y+h, x, y+h, rr);
    ctx.arcTo(x, y+h, x, y, rr);
    ctx.arcTo(x, y, x+w, y, rr);
    ctx.closePath();
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
    const camY = getCamY();
    rows.forEach(row => {
      const drawY = row.y - camY;
      if (drawY < -TILE_SIZE || drawY > H + TILE_SIZE) return;

      if (row.type === 'grass') {
        ctx.fillStyle = '#483522';
        ctx.fillRect(0, drawY, W, TILE_SIZE);
        ctx.fillStyle = '#3b2c1f';
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
        const centerTileCol = Math.floor((W / 2) / TILE_SIZE);
        const pumpkinX = centerTileCol * TILE_SIZE + TILE_SIZE / 2;
        ctx.fillStyle = '#ff8c00';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎃', pumpkinX, drawY + TILE_SIZE / 2 + 8);
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
            drawGhost(ox, drawY + TILE_SIZE / 2, ow, oh);
          } else {
            drawCar(ox, drawY + TILE_SIZE / 2, ow, oh);
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
            drawBat(ox, drawY + TILE_SIZE / 2, ow, oh);
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
        if (obs.x > W + 240) obs.x = -obs.width - 20;
        if (obs.x < -obs.width - 240) obs.x = W + 20;
      }
    }
  }

  function repositionBackgroundElements() {
    // no-op placeholder
  }

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

    if (player && player.moving) {
      const t = Math.min(1, (nowTs - player.moveStart) / player.moveDuration);
      player.x = lerp(player.startX, player.targetX, t);
      player.y = lerp(player.startY, player.targetY, t);
      if (t >= 1) {
        player.moving = false;
        player.x = player.targetX;
        player.y = player.targetY;
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

    if (!running) {
      clearLogicalCanvas();
      drawBackgroundGradient();
      drawRowsAndObstacles();
      updateScoreUI();
      animationId = requestAnimationFrame(step);
      return;
    }

    updateObstacles(dt);
    if (player && player.onLog && !player.moving) {
      player.x += player.onLog.speed * dt * 0.06;
      const playerCenterX = player.x + player.width / 2;
      if (!(playerCenterX > player.onLog.x && playerCenterX < (player.onLog.x + player.onLog.width))) {
        player.onLog = null;
      }
      const approxGridX = Math.round((player.x - (TILE_SIZE - PLAYER_SIZE) / 2) / TILE_SIZE);
      player.gridX = Math.max(0, Math.min(Math.floor((W - PLAYER_SIZE) / TILE_SIZE), approxGridX));
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
    player = createPlayer();
    score = 0;
    rowsPassed = 0;
    highestRow = STARTING_ROW;
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
    if (e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a' || k === 'j') { e.preventDefault(); movePlayer(-1, 0); }
    if (k === 'arrowright' || k === 'd' || k === 'l') { e.preventDefault(); movePlayer(1, 0); }
    if (k === 'arrowup' || k === 'w' || k === 'i') { e.preventDefault(); movePlayer(0, 0.5); }
    if (k === 'arrowdown' || k === 's' || k === 'k') { e.preventDefault(); movePlayer(0, -0.5); }
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

  function lerp(a,b,t){ return a + (b-a)*t; }

  clearLogicalCanvas();
  drawBackgroundGradient();
  initRows();
  drawRowsAndObstacles();
  updateScoreUI();
})();
