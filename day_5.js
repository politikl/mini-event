// Day 5 — reusable scaffold for "Midnight Crossing"
// Removed game-specific code; preserved reusable canvas sizing, timer, UI wiring, background init.

(() => {
  // DOM
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas && canvas.getContext ? canvas.getContext('2d') : null;
  const playbound = document.getElementById('playbound');
  const bigScoreEl = document.getElementById('big-score');
  const gameTimerHeader = document.getElementById('game-timer');
  const dayLeaderboardBtn = document.getElementById('day-leaderboard-btn');
  const dayLeaderboardModal = document.getElementById('day-leaderboard-modal');
  const dayLeaderboardClose = document.getElementById('day-leaderboard-close');
  const dayLeaderboardBody = document.getElementById('day-leaderboard-body');
  const gameOverModal = document.getElementById('game-over-modal');
  const finalScoreEl = document.getElementById('final-score');
  const submitScoreBtn = document.getElementById('submit-score-btn');
  const retryBtn = document.getElementById('retry-btn');
  const submitNote = document.getElementById('submit-note');
  const playOverlay = document.getElementById('play-overlay');
  const playBtn = document.getElementById('play-btn');
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const backgroundRoot = document.getElementById('background');

  // Logical canvas resolution — a stable coordinate system for other code to use
  const LOG_W = 480;
  const LOG_H = 720;

  // Timer setup — event ends Nov 1 00:00 PT (Pacific Time)
  const now = new Date();
  const year = now.getFullYear();
  const EVENT_END_ISO = `${year}-11-01T00:00:00-07:00`;
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
    gameTimerHeader.textContent = left <= 0 ? 'Event Ended' : formatTimeRemaining(left);
  }
  updateTimers();
  setInterval(updateTimers, 1000);

  // Keep canvas drawing scaled to fit displayed playbound (so mouse/touch coordinates and visuals match)
  function resizeCanvasToPlaybound() {
    if (!canvas || !playbound) return;
    const rect = playbound.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    canvas.width = LOG_W;
    canvas.height = LOG_H;
  }

  // Call resize initially and when window resizes
  resizeCanvasToPlaybound();
  window.addEventListener('resize', () => {
    resizeCanvasToPlaybound();
    repositionBackgroundElements();
  });

  // Background init (reusable visual elements)
  function initBackgroundElements(){
    if(!backgroundRoot) return;
    if(backgroundRoot.dataset.initted) return;
    backgroundRoot.dataset.initted = '1';
    for(let i=0;i<16;i++){
      const leaf = document.createElement('div'); leaf.className='leaf';
      leaf.style.left = `${Math.random()*100}%`;
      leaf.style.top = `${-10 - Math.random()*60}%`;
      leaf.style.animationDelay = `${Math.random()*10}s`;
      backgroundRoot.appendChild(leaf);
    }
    for(let i=0;i<6;i++){
      const pk = document.createElement('div'); pk.className='bg-pumpkin';
      pk.style.left = `${Math.random()*100}%`;
      pk.style.top = `${-20 - Math.random()*60}%`;
      pk.style.animationDelay = `${Math.random()*12}s`;
      backgroundRoot.appendChild(pk);
    }
  }

  function repositionBackgroundElements(){
    // placeholder — keep or extend in future
  }

  // Modal helpers
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

  // Fullscreen toggle (keeps playbound fullscreen)
  if (fullscreenBtn && playbound) {
    fullscreenBtn.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) {
          await playbound.requestFullscreen();
        } else {
          await document.exitFullscreen();
        }
        // small delay then resize
        setTimeout(resizeCanvasToPlaybound, 80);
      } catch (e) {
        // ignore
      }
    });
  }

  // Leaderboard modal wiring (keeps firebase calls in HTML/other script)
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

  // Play / retry handlers (game logic removed — placeholders)
  function startGame() {
    initBackgroundElements();
    // placeholder: actual game code should initialize and start here
    if (playOverlay) hideModal(playOverlay);
    if (bigScoreEl) bigScoreEl.textContent = 'Score: 0';
  }

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      hideModal(playOverlay);
      startGame();
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      hideModal(gameOverModal);
      startGame();
    });
  }

  if (submitScoreBtn) {
    submitScoreBtn.addEventListener('click', () => {
      // keep original UI behavior but actual save logic lives elsewhere
      submitScoreBtn.disabled = true;
      submitScoreBtn.textContent = 'Saving...';
      setTimeout(() => {
        submitScoreBtn.textContent = 'Saved';
        submitScoreBtn.disabled = false;
        hideModal(gameOverModal);
      }, 700);
    });
  }

  // expose a minimal API for future game code
  window.Day5 = {
    startGame,
    resizeCanvasToPlaybound,
    initBackgroundElements,
    showModalInPlaybound,
    hideModal,
    GAME_END_TS,
    GAME_NAME: 'Midnight Crossing'
  };

  // initial UI
  initBackgroundElements();
  resizeCanvasToPlaybound();
  if (bigScoreEl) bigScoreEl.textContent = 'Score: 0';
})();
