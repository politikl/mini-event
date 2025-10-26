// Spooky Crossy Road - Clean Implementation
(() => {
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const playbound = document.getElementById('playbound');
  const scoreEl = document.getElementById('score-display');
  const playOverlay = document.getElementById('play-overlay');
  const playBtn = document.getElementById('play-btn');
  const gameOverModal = document.getElementById('game-over-modal');
  const finalScoreEl = document.getElementById('final-score');
  const retryBtn = document.getElementById('retry-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');

  // Game constants
  const CANVAS_W = 480;
  const CANVAS_H = 720;
  const TILE_SIZE = 60;
  const PLAYER_SIZE = 40;
  const GRID_COLS = 8;
  const VISIBLE_ROWS = 16;
  const SAFE_START_ROWS = 4;
  const ROW_BUFFER = 8;

  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;

  // Game state
  let player = null;
  let rows = new Map();
  let score = 0;
  let highestRow = 0;
  let running = false;
  let gameLoop = null;
  let keys = {};
  let cameraY = 0;
  let nextRowId = 0;

  // Player object
  function createPlayer() {
    return {
      col: Math.floor(GRID_COLS / 2),
      row: 0,
      x: 0,
      y: 0,
      size: PLAYER_SIZE,
      alive: true,
      ridingLog: null
    };
  }

  // Row types and generation
  function createRow(rowNum) {
    const row = {
      id: rowNum,
      num: rowNum,
      type: 'grass',
      obstacles: []
    };

    // Safe starting area
    if (rowNum < 2) {
      row.type = rowNum === 0 ? 'island' : 'grass';
      return row;
    }

    // Gradual difficulty with more roads early
    const difficulty = Math.min(1, (rowNum - 2) / 25);
    
    // Generate terrain - increased road probability
    const rand = Math.random();
    
    if (rowNum < SAFE_START_ROWS) {
      // Early game: mix of grass, islands, and some roads
      if (rand < 0.4) {
        row.type = 'road';
        generateRoadObstacles(row, rowNum, difficulty);
      } else if (rand < 0.6) {
        row.type = 'grass';
      } else if (rand < 0.8) {
        row.type = 'island';
      } else {
        row.type = 'river';
        generateRiverObstacles(row, rowNum, difficulty);
      }
    } else {
      // Normal game distribution
      if (rand < 0.2) {
        row.type = 'grass';
      } else if (rand < 0.35) {
        row.type = 'island';
      } else if (rand < 0.65) {
        row.type = 'road';
        generateRoadObstacles(row, rowNum, difficulty);
      } else {
        row.type = 'river';
        generateRiverObstacles(row, rowNum, difficulty);
      }
    }

    return row;
  }

  function generateRoadObstacles(row, rowNum, difficulty) {
    const direction = Math.random() < 0.5 ? 1 : -1;
    const speedVariation = Math.random();
    let baseSpeed;
    if (speedVariation < 0.2) {
      baseSpeed = 0.8 + Math.random() * 0.4;
    } else if (speedVariation < 0.5) {
      baseSpeed = 0.5 + Math.random() * 0.3;
    } else {
      baseSpeed = 0.3 + Math.random() * 0.3;
    }
    
    const speed = (baseSpeed + difficulty * 0.6) * direction;
    const spacing = 160 + Math.random() * 80;
    const count = Math.max(2, Math.ceil(CANVAS_W / spacing));

    for (let i = 0; i < count; i++) {
      const isGhost = Math.random() < (0.3 + difficulty * 0.4);
      row.obstacles.push({
        x: i * spacing + Math.random() * 60,
        speed: speed,
        width: isGhost ? 50 : 60,
        height: isGhost ? 50 : 45,
        type: isGhost ? 'ghost' : 'car'
      });
    }
  }

  function generateRiverObstacles(row, rowNum, difficulty) {
    const direction = Math.random() < 0.5 ? 1 : -1;
    const speedVariation = Math.random();
    let baseSpeed;
    if (speedVariation < 0.3) {
      baseSpeed = 0.5 + Math.random() * 0.3;
    } else if (speedVariation < 0.6) {
      baseSpeed = 0.3 + Math.random() * 0.2;
    } else {
      baseSpeed = 0.1 + Math.random() * 0.2;
    }
    
    const speed = (baseSpeed + difficulty * 0.4) * direction;
    const spacing = 150 + Math.random() * 60;
    const count = Math.max(2, Math.ceil(CANVAS_W / spacing));

    for (let i = 0; i < count; i++) {
      row.obstacles.push({
        x: i * spacing + Math.random() * 30,
        speed: speed,
        width: 120 + Math.random() * 40,
        height: 30,
        type: 'log'
      });
    }
  }

  // Initialize game
  function initGame() {
    player = createPlayer();
    rows = new Map();
    score = 0;
    highestRow = 0;
    cameraY = 0;
    nextRowId = 0;
    
    // Create initial rows around player
    for (let i = -ROW_BUFFER; i < VISIBLE_ROWS + ROW_BUFFER; i++) {
      const row = createRow(i);
      rows.set(i, row);
      nextRowId = Math.max(nextRowId, i + 1);
    }
    
    updatePlayerPosition();
    updateScore();
  }

  function startGame() {
    initGame();
    running = true;
    player.alive = true;
    hideModal(playOverlay);
    hideModal(gameOverModal);
    if (gameLoop) cancelAnimationFrame(gameLoop);
    gameLoop = requestAnimationFrame(update);
  }

  function endGame() {
    running = false;
    player.alive = false;
    finalScoreEl.textContent = score;
    showModal(gameOverModal);
  }

  // Update camera to center on player's row
  function updateCamera() {
    if (!player) return;
    
    const targetY = player.row * TILE_SIZE - (CANVAS_H / 2 - TILE_SIZE);
    cameraY = targetY;
  }

  // Update player visual position
  function updatePlayerPosition() {
    if (!player) return;
    player.x = player.col * TILE_SIZE + (TILE_SIZE - PLAYER_SIZE) / 2;
    player.y = getRowY(player.row) + (TILE_SIZE - PLAYER_SIZE) / 2;
  }

  // Movement
  function movePlayer(dcol, drow) {
    if (!player || !player.alive) return;

    const newCol = Math.max(0, Math.min(GRID_COLS - 1, player.col + dcol));
    const newRow = Math.max(0, player.row + drow);

    player.col = newCol;
    player.row = newRow;
    player.ridingLog = null; // Reset when player moves manually

    updateCamera();
    updatePlayerPosition();

    // Score for moving forward
    if (newRow > highestRow) {
      score += (newRow - highestRow) * 10;
      highestRow = newRow;
      updateScore();
    }

    ensureRowsExist();
  }

  // FIXED: Working raft movement
  function updateRaftMovement(dt) {
    if (!player || !player.alive || !player.ridingLog) return;

    // Store the current log we're riding
    const currentLog = player.ridingLog;
    
    // Move player with the raft
    player.x += currentLog.speed * dt * 0.1;
    
    // Update grid position based on new x position
    player.col = Math.floor(player.x / TILE_SIZE);
    player.col = Math.max(0, Math.min(GRID_COLS - 1, player.col));
    
    // Update visual position
    updatePlayerPosition();
    
    // Check if player is still on the same log
    const currentRow = rows.get(player.row);
    if (!currentRow) {
      player.ridingLog = null;
      return;
    }

    // Check if we're still on the same log
    const playerCenterX = player.x + player.size / 2;
    const obstacleY = getRowY(player.row) + (TILE_SIZE - currentLog.height) / 2;
    
    const stillOnLog = playerCenterX > currentLog.x && 
                       playerCenterX < currentLog.x + currentLog.width &&
                       player.y < obstacleY + currentLog.height && 
                       player.y + player.size > obstacleY;

    if (!stillOnLog) {
      player.ridingLog = null;
    }
  }

  function ensureRowsExist() {
    if (!player) return;

    const minRow = player.row - ROW_BUFFER;
    const maxRow = player.row + VISIBLE_ROWS + ROW_BUFFER;

    for (let rowNum = player.row; rowNum <= maxRow; rowNum++) {
      if (!rows.has(rowNum)) {
        const row = createRow(rowNum);
        rows.set(rowNum, row);
        nextRowId = Math.max(nextRowId, rowNum + 1);
      }
    }

    for (let rowNum = player.row - 1; rowNum >= minRow; rowNum--) {
      if (!rows.has(rowNum)) {
        const row = createRow(rowNum);
        rows.set(rowNum, row);
      }
    }

    const cleanupThreshold = 30;
    for (let [rowNum, row] of rows) {
      if (rowNum < player.row - cleanupThreshold || rowNum > player.row + cleanupThreshold) {
        rows.delete(rowNum);
      }
    }
  }

  function updateScore() {
    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
  }

  // FIXED: Collision detection with proper raft handling
  function checkCollisions() {
    if (!player || !player.alive) return;

    const currentRow = rows.get(player.row);
    if (!currentRow) {
      console.warn('Missing row for player:', player.row);
      return;
    }

    // If we're already riding a log, don't check for new ones
    if (player.ridingLog) {
      return;
    }

    if (currentRow.type === 'road') {
      for (const obs of currentRow.obstacles) {
        const obstacleY = getRowY(player.row) + (TILE_SIZE - obs.height) / 2;
        
        if (boxCollision(player.x, player.y, player.size, player.size,
                         obs.x, obstacleY, obs.width, obs.height)) {
          endGame();
          return;
        }
      }
    } else if (currentRow.type === 'river') {
      let onLog = false;
      for (const obs of currentRow.obstacles) {
        const playerCenterX = player.x + player.size / 2;
        const obstacleY = getRowY(player.row) + (TILE_SIZE - obs.height) / 2;
        
        if (playerCenterX > obs.x && playerCenterX < obs.x + obs.width &&
            player.y < obstacleY + obs.height && player.y + player.size > obstacleY) {
          onLog = true;
          player.ridingLog = obs; // Set the raft we're on
          break;
        }
      }
      if (!onLog) {
        endGame();
        return;
      }
    }

    if (player.x < -player.size || player.x > CANVAS_W) {
      endGame();
    }
  }

  function boxCollision(x1, y1, w1, h1, x2, y2, w2, h2) {
    return x1 < x2 + w2 - 8 && x1 + w1 > x2 + 8 &&
           y1 < y2 + h2 - 8 && y1 + h1 > y2 + 8;
  }

  function getRowY(rowNum) {
    return rowNum * TILE_SIZE - cameraY;
  }

  function updateObstacles(dt) {
    for (const [rowNum, row] of rows) {
      for (const obs of row.obstacles) {
        obs.x += obs.speed * dt * 0.1;
        
        if (obs.speed > 0 && obs.x > CANVAS_W + 100) {
          obs.x = -obs.width - 50;
        } else if (obs.speed < 0 && obs.x < -obs.width - 100) {
          obs.x = CANVAS_W + 50;
        }
      }
    }

    // FIXED: Always call raft movement if we're on a raft
    if (player && player.ridingLog) {
      updateRaftMovement(dt);
    }
  }

  // Input handling
  let lastMoveTime = 0;
  const MOVE_COOLDOWN = 150;

  window.addEventListener('keydown', (e) => {
    if (!running || !player || !player.alive) return;
    
    const now = Date.now();
    if (now - lastMoveTime < MOVE_COOLDOWN) return;

    const key = e.key.toLowerCase();
    let moved = false;

    if (key === 'arrowleft' || key === 'a' || key === 'j') {
      movePlayer(-1, 0);
      moved = true;
    } else if (key === 'arrowright' || key === 'd' || key === 'l') {
      movePlayer(1, 0);
      moved = true;
    } else if (key === 'arrowup' || key === 'w' || key === 'i') {
      movePlayer(0, -1);
      moved = true;
    } else if (key === 'arrowdown' || key === 's' || key === 'k') {
      movePlayer(0, 1);
      moved = true;
    }

    if (moved) {
      lastMoveTime = now;
      e.preventDefault();
    }
  });

  // Drawing functions
  function drawBackground() {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#0a0508');
    grad.addColorStop(1, '#1a0a14');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  function drawRows() {
    const sortedRows = Array.from(rows.values()).sort((a, b) => a.num - b.num);
    
    for (const row of sortedRows) {
      const y = getRowY(row.num);
      
      if (y < -TILE_SIZE || y > CANVAS_H + TILE_SIZE) continue;

      if (row.type === 'grass') {
        ctx.fillStyle = '#3d2f1f';
        ctx.fillRect(0, y, CANVAS_W, TILE_SIZE);
        ctx.fillStyle = '#2d1f0f';
        for (let i = 0; i < GRID_COLS; i++) {
          ctx.fillRect(i * TILE_SIZE + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        }
      } else if (row.type === 'island') {
        ctx.fillStyle = '#5a4a2a';
        ctx.fillRect(0, y, CANVAS_W, TILE_SIZE);
        ctx.fillStyle = '#ff8c00';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🎃', CANVAS_W / 2, y + TILE_SIZE / 2 + 10);
      } else if (row.type === 'road') {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, y, CANVAS_W, TILE_SIZE);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        ctx.moveTo(0, y + TILE_SIZE / 2);
        ctx.lineTo(CANVAS_W, y + TILE_SIZE / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (row.type === 'river') {
        const grad = ctx.createLinearGradient(0, y, 0, y + TILE_SIZE);
        grad.addColorStop(0, '#1a4a5a');
        grad.addColorStop(1, '#0f2a3a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, y, CANVAS_W, TILE_SIZE);
      }

      for (const obs of row.obstacles) {
        const oy = y + (TILE_SIZE - obs.height) / 2;
        
        if (obs.type === 'car') {
          const speedRatio = Math.abs(obs.speed) / 1.5;
          const red = Math.min(255, 180 + speedRatio * 75);
          const color = `rgb(${red}, 30, 58)`;
          
          ctx.fillStyle = color;
          roundRect(ctx, obs.x, oy, obs.width, obs.height, 8);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.3)';
          ctx.fillRect(obs.x + 10, oy + 5, obs.width * 0.4, obs.height * 0.4);
        } else if (obs.type === 'ghost') {
          const speedRatio = Math.abs(obs.speed) / 1.5;
          const alpha = Math.min(0.95, 0.7 + speedRatio * 0.25);
          
          ctx.fillStyle = `rgba(230,240,255,${alpha})`;
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, oy + obs.height / 2, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width * 0.35, oy + obs.height * 0.4, 4, 0, Math.PI * 2);
          ctx.arc(obs.x + obs.width * 0.65, oy + obs.height * 0.4, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'log') {
          const speedRatio = Math.abs(obs.speed) / 0.8;
          const darken = Math.min(80, speedRatio * 40);
          
          ctx.fillStyle = `rgb(${93 - darken}, ${58 - darken}, ${26 - darken})`;
          roundRect(ctx, obs.x, oy, obs.width, obs.height, 6);
          ctx.fill();
          ctx.fillStyle = `rgb(${125 - darken}, ${90 - darken}, ${58 - darken})`;
          ctx.fillRect(obs.x + 4, oy + 4, obs.width - 8, obs.height - 8);
        }
      }
    }
  }

  function drawPlayer() {
    if (!player || !player.alive) return;

    const cx = player.x + player.size / 2;
    const cy = player.y + player.size / 2;
    const r = player.size / 2;

    const grad = ctx.createRadialGradient(cx, cy - r * 0.3, 0, cx, cy, r);
    grad.addColorStop(0, '#ffb347');
    grad.addColorStop(0.7, '#ff8c00');
    grad.addColorStop(1, '#d97000');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(180,80,0,0.4)';
    ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + i * r * 0.3, cy - r);
      ctx.quadraticCurveTo(cx + i * r * 0.15, cy, cx + i * r * 0.3, cy + r);
      ctx.stroke();
    }

    ctx.fillStyle = '#4a3a1a';
    ctx.fillRect(cx - 4, cy - r - 8, 8, 10);

    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.3, cy - r * 0.2);
    ctx.lineTo(cx - r * 0.15, cy - r * 0.4);
    ctx.lineTo(cx - r * 0.05, cy - r * 0.2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.3, cy - r * 0.2);
    ctx.lineTo(cx + r * 0.15, cy - r * 0.4);
    ctx.lineTo(cx + r * 0.05, cy - r * 0.2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.4, cy + r * 0.2);
    ctx.quadraticCurveTo(cx, cy + r * 0.5, cx + r * 0.4, cy + r * 0.2);
    ctx.lineTo(cx + r * 0.2, cy + r * 0.1);
    ctx.quadraticCurveTo(cx, cy + r * 0.3, cx - r * 0.2, cy + r * 0.1);
    ctx.closePath();
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  // Game loop
  let lastTime = performance.now();

  function update(timestamp) {
    const dt = Math.min(50, timestamp - lastTime);
    lastTime = timestamp;

    if (running && player && player.alive) {
      updateObstacles(dt);
      ensureRowsExist();
      checkCollisions();
      updateCamera();
    }

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawBackground();
    drawRows();
    drawPlayer();

    gameLoop = requestAnimationFrame(update);
  }

  // Modal helpers
  function showModal(modal) {
    modal.classList.remove('hidden');
  }

  function hideModal(modal) {
    modal.classList.add('hidden');
  }

  // UI Event listeners
  playBtn.addEventListener('click', startGame);
  retryBtn.addEventListener('click', startGame);

  fullscreenBtn.addEventListener('click', async () => {
    try {
      if (!document.fullscreenElement) {
        await playbound.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (e) {
      console.log('Fullscreen error:', e);
    }
  });

  // Start with play overlay visible
  initGame();
  showModal(playOverlay);
  gameLoop = requestAnimationFrame(update);
})();
