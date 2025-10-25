// Spooky Crossy Road - Day 2 Game (standalone, local-storage leaderboard fallback)
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

  // Constants
  const W = canvas.width;
  const H = canvas.height;
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
  let moveDelay = 0;
  let scaryMode = localStorage.getItem('day2Scary') === 'true';

  // Timer setup (ends Oct 28 of current year, local -07 offset interpreted by Date.parse of ISO)
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

  // Audio
  function getAudioCtx(){ 
    try { 
      return new (window.AudioContext||window.webkitAudioContext)(); 
    } catch(e){ 
      return null; 
    } 
  }

  function playScreamLoud(){
    const ctx = getAudioCtx(); 
    if(!ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type='sawtooth'; 
    o.frequency.setValueAtTime(220, ctx.currentTime);
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.7, ctx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
    o.connect(g); 
    g.connect(ctx.destination);
    o.start(); 
    o.stop(ctx.currentTime + 1.2);
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
    const difficulty = Math.min(1, rowIndex / 100);
    const rand = Math.random();

    let type = 'grass';
    if (rowIndex > 0) {
      if (rand < 0.15) type = 'island';
      else if (rand < 0.45) type = 'road';
      else if (rand < 0.75) type = 'river';
      else type = 'grass';
    }

    const row = {
      index: rowIndex,
      y: -rowIndex * TILE_SIZE,
      type: type,
      obstacles: []
    };

    if (type === 'road') {
      const direction = Math.random() < 0.5 ? 1 : -1;
      const baseSpeed = 1.2 + difficulty * 2.5;
      const speed = baseSpeed * direction;
      const spacing = 120 + Math.random() * 160;
      const count = Math.ceil(W / spacing) + 2;

      for (let i = 0; i < count; i++) {
        const isGhost = Math.random() < 0.4;
        row.obstacles.push({
          x: i * spacing + Math.random() * 40,
          speed: speed,
          width: isGhost ? 40 : 50,
          height: isGhost ? 40 : 44,
          type: isGhost ? 'ghost' : 'car'
        });
      }
    } else if (type === 'river') {
      const direction = Math.random() < 0.5 ? 1 : -1;
      const baseSpeed = 0.8 + difficulty * 1.8;
      const speed = baseSpeed * direction;
      const logCount = 2 + Math.floor(Math.random() * 3);

      for (let i = 0; i < logCount; i++) {
        const isBat = Math.random() < 0.3;
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
    for (let i = -2; i < ROWS_VISIBLE; i++) {
      rows.push(createRow(i));
    }
  }

  function generateNewRows() {
    if (!player) return;
    const minRow = Math.min(...rows.map(r => r.index));
    const neededRow = Math.floor(player.y / TILE_SIZE) - ROWS_VISIBLE;

    while (minRow > neededRow) {
      rows.push(createRow(minRow - 1));
      // keep memory bounded
      if (rows.length > ROWS_VISIBLE + 12) {
        rows = rows.filter(r => r.index > Math.floor(player.y / TILE_SIZE) + 6);
      }
      // recompute
      const arr = rows.map(r => r.index);
      if (arr.length) minRow = Math.min(...arr);
      else break;
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

  function movePlayer(dx, dy) {
    if (!player || !player.alive || moveDelay > 0) return;

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

    moveDelay = 150;
  }

  // Collision
  function checkCollisions() {
    if (!player || !player.alive) return;

    const playerRow = rows.find(r => Math.abs(r.y - player.y) < TILE_SIZE / 2);
    if (!playerRow) return;

    player.onLog = null;

    if (playerRow.type === 'road') {
      for (const obs of playerRow.obstacles) {
        if (player.x < obs.x + obs.width - 10 &&
            player.x + player.width > obs.x + 10 &&
            Math.abs(playerRow.y - player.y) < TILE_SIZE / 2) {
          killPlayer();
          return;
        }
      }
    } else if (playerRow.type === 'river') {
      let onSomething = false;
      for (const obs of playerRow.obstacles) {
        if (obs.rideable &&
            player.x + player.width / 2 > obs.x &&
            player.x + player.width / 2 < obs.x + obs.width &&
            Math.abs(playerRow.y - player.y) < TILE_SIZE / 2) {
          onSomething = true;
          player.onLog = obs;
          break;
        }
      }

      for (const obs of playerRow.obstacles) {
        if (obs.type === 'bat' &&
            player.x < obs.x + obs.width - 8 &&
            player.x + player.width > obs.x + 8 &&
            Math.abs(playerRow.y - player.y) < TILE_SIZE / 2) {
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
    }, 100);

    if (scaryMode && Math.random() < 0.6) {
      doJumpscare();
    }
  }

  // Drawing
  function draw() {
    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0a0508');
    bg.addColorStop(1, '#150610');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

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
        grad.addColorStop(1, '#0f2530');
        ctx.fillStyle = grad;
        ctx.fillRect(0, drawY, W, TILE_SIZE);
      }

      row.obstacles.forEach(obs => {
        const obsDrawY = drawY + (TILE_SIZE - obs.height) / 2;

        if (obs.type === 'car') {
          ctx.fillStyle = '#8b0000';
          ctx.fillRect(obs.x, obsDrawY, obs.width, obs.height);
          ctx.fillStyle = '#ff0000';
          ctx.fillRect(obs.x + 5, obsDrawY + 5, obs.width - 10, obs.height - 10);
          ctx.fillStyle = '#ffff00';
          if (obs.speed > 0) {
            ctx.fillRect(obs.x + obs.width - 8, obsDrawY + 8, 6, 8);
          } else {
            ctx.fillRect(obs.x + 2, obsDrawY + 8, 6, 8);
          }
        } else if (obs.type === 'ghost') {
          ctx.fillStyle = 'rgba(240,240,240,0.8)';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width / 2, obsDrawY + obs.height / 3, obs.width / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(obs.x, obsDrawY + obs.height / 2, obs.width, obs.height / 2);
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(obs.x + obs.width * 0.35, obsDrawY + obs.height * 0.3, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(obs.x + obs.width * 0.65, obsDrawY + obs.height * 0.3, 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (obs.type === 'log') {
          ctx.fillStyle = '#6b4423';
          ctx.fillRect(obs.x, obsDrawY, obs.width, obs.height);
          ctx.fillStyle = '#4a2f15';
          for (let i = 0; i < obs.width; i += 20) {
            ctx.fillRect(obs.x + i, obsDrawY + 2, 3, obs.height - 4);
          }
        } else if (obs.type === 'bat') {
          ctx.fillStyle = '#2a0a2a';
          ctx.beginPath();
          ctx.ellipse(obs.x + obs.width / 2, obsDrawY + obs.height / 2, obs.width / 2, obs.height / 3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#4a1a4a';
          ctx.beginPath();
          ctx.moveTo(obs.x, obsDrawY + obs.height / 2);
          ctx.quadraticCurveTo(obs.x + obs.width * 0.25, obsDrawY, obs.x + obs.width / 2, obsDrawY + obs.height / 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(obs.x + obs.width, obsDrawY + obs.height / 2);
          ctx.quadraticCurveTo(obs.x + obs.width * 0.75, obsDrawY, obs.x + obs.width / 2, obsDrawY + obs.height / 2);
          ctx.fill();
        }
      });
    });

    if (player && player.alive) {
      const playerDrawY = player.y - camY;
      ctx.fillStyle = '#ffa500';
      ctx.beginPath();
      ctx.arc(player.x + player.width / 2, playerDrawY + player.height / 2, player.width / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(player.x + player.width * 0.35, playerDrawY + player.height * 0.35, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(player.x + player.width * 0.65, playerDrawY + player.height * 0.35, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x + player.width / 2, playerDrawY + player.height * 0.65, player.width * 0.2, 0, Math.PI);
      ctx.stroke();
    }

    if (scaryMode && Math.random() < 0.003) {
      ctx.fillStyle = 'rgba(255,0,0,0.06)';
      ctx.fillRect(0, Math.random() * H, W, 4 + Math.random() * 40);
    }
  }

  function update(dt) {
    if (!running || !player || !player.alive) return;

    if (moveDelay > 0) {
      moveDelay = Math.max(0, moveDelay - dt);
    }

    rows.forEach(row => {
      row.obstacles.forEach(obs => {
        obs.x += obs.speed;
        if (obs.speed > 0 && obs.x > W + 100) {
          obs.x = -obs.width - 50;
        } else if (obs.speed < 0 && obs.x < -obs.width - 100) {
          obs.x = W + 50;
        }
      });
    });

    if (player.onLog) {
      player.x += player.onLog.speed;
    }

    checkCollisions();
    generateNewRows();
  }

  function loop(nowTime) {
    const dt = Math.min(32, nowTime - lastTime);
    lastTime = nowTime;

    draw();

    if (running) {
      update(dt);
      if (bigScoreEl) bigScoreEl.textContent = `Score: ${score}`;
      updateTimers();
    }

    animationId = requestAnimationFrame(loop);
  }

  function startGame() {
    if (running) return;

    initRows();
    player = createPlayer();
    score = 0;
    rowsPassed = 0;
    highestRow = 0;
    moveDelay = 0;
    running = true;
    lastTime = performance.now();

    hideModal(gameOverModal);
    hideModal(playOverlay);

    if (!animationId) animationId = requestAnimationFrame(loop);
  }

  function showModalInPlaybound(modalEl) {
    if (!modalEl || !playbound) return;
    if (modalEl.parentElement !== playbound) playbound.appendChild(modalEl);
    modalEl.classList.remove('hidden');
  }

  function hideModal(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add('hidden');
  }

  function showToast(msg, timeout=2200){
    if(!playbound) return;
    let t = playbound.querySelector('.save-toast');
    if(!t){ t = document.createElement('div'); t.className='save-toast'; playbound.appendChild(t); }
    t.textContent = msg;
    clearTimeout(t._timeout);
    t._timeout = setTimeout(()=> { t && t.remove(); }, timeout);
  }

  function initBackgroundElements() {
    if (!backgroundRoot) return;
    if (backgroundRoot.dataset.initted) return;
    backgroundRoot.dataset.initted = '1';

    for (let i = 0; i < 20; i++) {
      const leaf = document.createElement('div');
      leaf.className = 'leaf';
      leaf.style.left = `${Math.random() * 100}%`;
      leaf.style.top = `${-10 - Math.random() * 60}%`;
      leaf.style.animationDelay = `${Math.random() * 10}s`;
      backgroundRoot.appendChild(leaf);
    }

    for (let i = 0; i < 8; i++) {
      const pk = document.createElement('div');
      pk.className = 'bg-pumpkin';
      pk.style.left = `${Math.random() * 100}%`;
      pk.style.top = `${-20 - Math.random() * 60}%`;
      pk.style.animationDelay = `${Math.random() * 12}s`;
      backgroundRoot.appendChild(pk);
    }
  }

  // --- Local (localStorage) leaderboard fallback ---
  function getLocalScores() {
    try {
      const raw = localStorage.getItem('day2_scores');
      const arr = raw ? JSON.parse(raw) : [];
      return arr.sort((a,b) => b.score - a.score);
    } catch(e) {
      return [];
    }
  }

  function saveLocalScore(entry) {
    try {
      const arr = getLocalScores();
      arr.push(entry);
      arr.sort((a,b) => b.score - a.score);
      localStorage.setItem('day2_scores', JSON.stringify(arr.slice(0,200)));
      return true;
    } catch(e) { return false; }
  }

  async function handleSubmitScore(){
    // local fallback: ask for a player name and save to localStorage
    const defaultName = (window.userData && window.userData.username) ? window.userData.username : 'Player';
    const playerName = prompt('Enter name to save score:', defaultName) || 'Anonymous';
    const entry = { score, playerName, uid: null, ts: Date.now(), withinEvent: Date.now() <= GAME_END_TS };

    const ok = saveLocalScore(entry);
    if (!ok) { showToast('Save failed'); return; }
    showToast('Score saved (local)');

    setTimeout(() => {
      hideModal(gameOverModal);
      hideModal(playOverlay);
      startGame();
    }, 700);
  }

  // Input handlers
  window.addEventListener('keydown', e => {
    const k = (e.key || '').toLowerCase();
    if (k === 'arrowup' || k === 'w') { movePlayer(0, -1); e.preventDefault(); }
    if (k === 'arrowdown' || k === 's') { movePlayer(0, 1); e.preventDefault(); }
    if (k === 'arrowleft' || k === 'a') { movePlayer(-1, 0); e.preventDefault(); }
    if (k === 'arrowright' || k === 'd') { movePlayer(1, 0); e.preventDefault(); }
    if (k === 'f' && document.fullscreenEnabled) toggleFullscreen();
  });

  let touchStartX = 0;
  let touchStartY = 0;

  canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
  }, { passive: true });

  canvas.addEventListener('touchend', e => {
    if (!e.changedTouches || !e.changedTouches[0]) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStartX;
    const dy = t.clientY - touchStartY;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx > 30 || absDy > 30) {
      if (absDx > absDy) {
        movePlayer(dx > 0 ? 1 : -1, 0);
      } else {
        movePlayer(0, dy > 0 ? 1 : -1);
      }
    }
  }, { passive: true });

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        await playbound.requestFullscreen();
        if (fullscreenBtn) fullscreenBtn.textContent = '⤡';
      } else {
        await document.exitFullscreen();
        if (fullscreenBtn) fullscreenBtn.textContent = '⤢';
      }
    } catch(e) {}
  }

  // UI event handlers
  playBtn && playBtn.addEventListener('click', () => startGame());
  retryBtn && retryBtn.addEventListener('click', () => startGame());
  submitScoreBtn && submitScoreBtn.addEventListener('click', handleSubmitScore);
  fullscreenBtn && fullscreenBtn.addEventListener('click', toggleFullscreen);

  // Leaderboard
  dayLeaderboardBtn && dayLeaderboardBtn.addEventListener('click', async () => {
    if (dayLeaderboardModal.parentElement !== document.body && playbound) {
      // keep leaderboard visually inside playbound for consistent styling
      playbound.appendChild(dayLeaderboardModal);
    }
    dayLeaderboardBody.innerHTML = '<tr><td colspan="5">Loading…</td></tr>';
    dayLeaderboardModal.classList.remove('hidden');

    // load local scores
    const remote = getLocalScores().slice(0, 100);
    const rowsHtml = (remote || []).map((r, idx) => {
      const when = new Date(r.ts).toLocaleString();
      const within = r.withinEvent ? 'Yes' : 'No';
      const name = r.playerName || 'Anonymous';
      return `<tr class="${idx===0?'rank-1':idx===1?'rank-2':idx===2?'rank-3':''}"><td>${idx+1}</td><td>${escapeHtml(name)}</td><td>${r.score}</td><td>${when}</td><td>${within}</td></tr>`;
    });
    dayLeaderboardBody.innerHTML = rowsHtml.length ? rowsHtml.join('') : '<tr><td colspan="5">No scores yet</td></tr>';
  });

  dayLeaderboardClose && dayLeaderboardClose.addEventListener('click', ()=> {
    dayLeaderboardModal.classList.add('hidden');
  });

  // Scary toggle
  if(scaryToggle){
    scaryToggle.checked = scaryMode;
    scaryToggle.addEventListener('change', ()=> {
      scaryMode = scaryToggle.checked;
      localStorage.setItem('day2Scary', scaryMode ? 'true' : 'false');
      if(scaryMode && Math.random() < 0.6) playScreamLoud();
    });
  }

  function escapeHtml(str=''){
    return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));
  }

  // Start loop + initializers
  initBackgroundElements();
  lastTime = performance.now();
  animationId = requestAnimationFrame(loop);
  updateTimers();
  setInterval(updateTimers, 1000);

  // ensure initial play overlay lives in playbound for consistent modal behavior
  if (playOverlay && playOverlay.parentElement !== playbound && playbound) {
    playbound.appendChild(playOverlay);
  }

  window.addEventListener('beforeunload', () => {
    if (animationId) cancelAnimationFrame(animationId);
  });
})();
