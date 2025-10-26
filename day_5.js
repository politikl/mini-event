// Full game logic for "Midnight Crossing" (all JS except Firebase which remains in HTML)

(() => {
  // DOM
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
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
  const hud = document.getElementById('hud');
  const hpText = document.getElementById('hp-text');
  const xpFill = document.getElementById('xp-fill');
  const lvlText = document.getElementById('lvl');
  const abilityPills = document.getElementById('ability-pills');
  const choiceArea = document.getElementById('choice-area');
  const overlayTitle = document.getElementById('overlay-title');
  const overlayDesc = document.getElementById('overlay-desc');

  // Timer setup — event ends Nov 1 00:00 PT (Pacific Time)
  const now = new Date();
  const year = now.getFullYear();
  const GAME_END_TS = Date.parse(`${year}-11-01T00:00:00-07:00`);
  function formatTimeRemaining(ms) {
    if (ms <= 0) return 'Event Ended';
    const s = Math.floor(ms/1000);
    const hh = Math.floor(s/3600).toString().padStart(2,'0');
    const mm = Math.floor((s%3600)/60).toString().padStart(2,'0');
    const ss = (s%60).toString().padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }
  function updateTimers(){ if(gameTimerHeader) gameTimerHeader.textContent = formatTimeRemaining(GAME_END_TS - Date.now()); }
  updateTimers(); setInterval(updateTimers, 1000);

  // logical view size (canvas logical coords)
  const VIEW_W = 480, VIEW_H = 720;
  canvas.width = VIEW_W; canvas.height = VIEW_H;
  // large map (multiple times the view)
  const MAP_W = VIEW_W * 6; // horizontally 6x
  const MAP_H = VIEW_H * 4; // vertically 4x

  // game state
  let running = false;
  let lastTime = performance.now();
  let keys = {};
  let player = null;
  let camera = { x:0, y:0, w: VIEW_W, h: VIEW_H };
  let enemies = [];
  let projectiles = [];
  let orbs = [];
  let spawnTimer = 0;
  let spawnInterval = 2200; // ms initially
  let difficultyTimer = 0;
  let score = 0;
  let chosenAbilities = [];
  let abilityDefs = {};

  // --- ability definitions (10 unique) ---
  const ABILITIES = [
    { id:'blade_spin', title:'Blade Spin', desc:'Melee 360° spin around you. Hits all nearby enemies.', type:'melee', basePower:18, cooldown:1200, range:72, upgradePow: (lv)=> 18 + lv*6 },
    { id:'dash_strike', title:'Dash Strike', desc:'Short dash that damages enemies you pass through.', type:'dash', basePower:28, cooldown:3000, range:160, upgradePow:(lv)=>28+lv*10 },
    { id:'fireball', title:'Fireball', desc:'Auto-launch a slowing fireball in movement direction.', type:'projectile', basePower:22, cooldown:900, range:420, upgradePow:(lv)=>22+lv*8 },
    { id:'siphon', title:'Siphon', desc:'Steal a portion of damage dealt as HP (on-hit lifesteal).', type:'passive', basePower:0.12, cooldown:0, range:0, upgradePow:(lv)=>0.12+lv*0.03 },
    { id:'turret', title:'Turret', desc:'Deploy a short-lived turret that shoots at nearest enemy.', type:'deploy', basePower:10, cooldown:5000, range:0, upgradePow:(lv)=>10+lv*6 },
    { id:'shockwave', title:'Shockwave', desc:'Emit a forward cone shock that knocks and damages.', type:'cone', basePower:20, cooldown:2500, range:220, upgradePow:(lv)=>20+lv*8 },
    { id:'poison_trail', title:'Poison Trail', desc:'Leave a damaging slow trail when you move.', type:'aura', basePower:6, cooldown:0, range:0, upgradePow:(lv)=>6+lv*3 },
    { id:'multi_arrow', title:'Multi Arrow', desc:'Fire a spread of arrows forward.', type:'projectile', basePower:16, cooldown:1100, range:500, upgradePow:(lv)=>16+lv*6 },
    { id:'shield', title:'Shield', desc:'Temporary shield reduces incoming damage by percent.', type:'active', basePower:0.36, cooldown:8000, range:0, upgradePow:(lv)=>0.36+lv*0.08 },
    { id:'time_slown', title:'Time Slow', desc:'Slow nearby enemies for a short period.', type:'aoe', basePower:0.55, cooldown:10000, range:260, upgradePow:(lv)=>0.55+lv*0.06 }
  ];
  ABILITIES.forEach(a=> abilityDefs[a.id]=a);

  // --- utilities ---
  function randRange(a,b){ return a + Math.random()*(b-a); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function dist(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return Math.hypot(dx,dy); }

  // --- Player class ---
  class Player {
    constructor(x,y){
      this.x=x; this.y=y;
      this.r = 18;
      this.hp = 120;
      this.maxHp = 120;
      this.xp = 0;
      this.level = 1;
      this.nextXp = 100;
      this.abilities = []; // {id,lvl,cd}
      this.moveSpeed = 180;
      this.shieldUntil = 0;
      this.alive = true;
    }
    addAbility(id){
      const existing = this.abilities.find(a=>a.id===id);
      if(existing){ existing.lvl++; return existing; }
      const def = abilityDefs[id];
      if(!def) return null;
      const item = { id, lvl:1, cd:0, lastUsed:0 };
      this.abilities.push(item);
      return item;
    }
    hasAbility(id){ return !!this.abilities.find(a=>a.id===id); }
    abilityLevel(id){ const a=this.abilities.find(x=>x.id===id); return a? a.lvl:0; }
    tick(dt){
      this.abilities.forEach(a=>{ if(a.cd>0) a.cd = Math.max(0, a.cd - dt); });
    }
    takeDamage(dmg){
      if(this.shieldUntil > performance.now()) dmg = dmg * 0.4;
      this.hp -= dmg;
      if(this.hp<=0) { this.hp=0; this.die(); }
    }
    heal(n){ this.hp = Math.min(this.maxHp, this.hp + n); }
    die(){ this.alive = false; onPlayerDeath(); }
    giveXp(n){
      this.xp += n;
      while(this.xp >= this.nextXp){
        this.xp -= this.nextXp;
        this.level++;
        this.nextXp = Math.floor(100 * Math.pow(1.55, this.level-1));
        queueLevelUp();
      }
    }
    tryUseAbility(id, dirx, diry){
      const def = abilityDefs[id]; if(!def) return false;
      const slot = this.abilities.find(a=>a.id===id); if(!slot) return false;
      if(slot.cd>0) return false;
      slot.lastUsed = performance.now();
      slot.cd = def.cooldown || 0;
      const lvl = slot.lvl;
      const power = def.upgradePow ? def.upgradePow(lvl-1) : def.basePower + (lvl-1)*6;

      if(def.type==='melee'){
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= def.range) e.takeDamage(power);
        return true;
      } else if(def.type==='dash'){
        const nx = dirx || 1, ny = diry || 0; const mag = Math.hypot(nx,ny)||1;
        const dashLen = def.range;
        this.x += (nx/mag)*dashLen; this.y += (ny/mag)*dashLen;
        this.x = clamp(this.x, this.r, MAP_W - this.r); this.y = clamp(this.y, this.r, MAP_H - this.r);
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= this.r + e.r + 8) e.takeDamage(power);
        return true;
      } else if(def.type==='projectile'){
        const nx = dirx || 1, ny = diry || 0; const mag = Math.hypot(nx,ny)||1;
        const speed = 420;
        projectiles.push(new Projectile(this.x + nx/mag*(this.r+8), this.y + ny/mag*(this.r+8), nx/mag*speed, ny/mag*speed, power, 6, 'player', def.range));
        return true;
      } else if(def.type==='deploy'){
        const turret = new Turret(this.x + (dirx||0)*32, this.y + (diry||0)*32, power, 6000 + lvl*2000);
        enemies.push(turret);
        turret.friendly = true;
        return true;
      } else if(def.type==='cone'){
        const nx = dirx || 1, ny = diry || 0; const angleCenter = Math.atan2(ny,nx);
        const cone = Math.PI/3;
        for(const e of enemies) if(e.alive && !e.friendly){
          const dx = e.x - this.x, dy = e.y - this.y; const d = Math.hypot(dx,dy);
          if(d>def.range) continue;
          const a = Math.atan2(dy,dx);
          let diff = Math.abs(((a-angleCenter+Math.PI)%(Math.PI*2))-Math.PI);
          if(diff < cone/2) e.takeDamage(power);
        }
        return true;
      } else if(def.type==='aura'){
        // handled in update loop
        return true;
      } else if(def.type==='active'){
        this.shieldUntil = performance.now() + 2500 + lvl*500;
        return true;
      } else if(def.type==='aoe'){
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= def.range) e.applySlow(0.4, 2200 + lvl*200);
        return true;
      }
      return false;
    }
  }

  // --- Enemy class ---
  class Enemy {
    constructor(x,y, hp=40, speed=40, r=14, type='zombie', melee=true){
      this.x=x; this.y=y; this.hp=hp; this.maxHp=hp; this.speed=speed; this.r=r;
      this.type=type; this.melee=melee; this.alive=true;
      this.slowUntil = 0; this.slowFactor = 1; this.tickAcc = 0; this.friendly = false;
    }
    takeDamage(d){
      this.hp -= d;
      if(this.hp<=0) this.die();
    }
    die(){
      if(!this.alive) return;
      this.alive=false;
      score += Math.round(this.maxHp/2);
      const orbsCount = Math.max(1, Math.floor(this.maxHp/20));
      for(let i=0;i<orbsCount;i++) orbs.push(new Orb(this.x + randRange(-10,10), this.y + randRange(-10,10), randRange(10,20)));
    }
    applySlow(factor, ms){ this.slowFactor = factor; this.slowUntil = performance.now() + ms; }
    update(dt){
      if(!player || !player.alive) return;
      if(this.friendly) return;
      if(performance.now() > this.slowUntil) this.slowFactor = 1;
      const sx = player.x - this.x, sy = player.y - this.y; const d = Math.hypot(sx,sy);
      if(d > 1){
        const spd = this.speed * (this.slowFactor || 1);
        this.x += (sx/d) * spd * (dt/1000);
        this.y += (sy/d) * spd * (dt/1000);
      }
      if(this.melee && d <= this.r + player.r + 4){
        if(this.tickAcc <= 0){
          player.takeDamage(Math.max(4, this.maxHp*0.08));
          this.tickAcc = 650;
        }
      }
      if(this.tickAcc > 0) this.tickAcc = Math.max(0, this.tickAcc - dt);
    }
    draw(ctx, cam){
      if(!this.alive) return;
      const x = this.x - cam.x, y=this.y-cam.y;
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle = this.type==='skeleton' ? '#cfd6d9' : (this.type==='demon' ? '#b14a4a' : '#6b8b6b');
      ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(-this.r, -this.r-8, this.r*2, 5);
      ctx.fillStyle = '#ff8d4d';
      ctx.fillRect(-this.r, -this.r-8, (this.hp/this.maxHp)*this.r*2, 5);
      ctx.restore();
    }
  }

  // --- Turret (friendly) ---
  class Turret extends Enemy {
    constructor(x,y, power, lifeMs){
      super(x,y, 40, 0, 12, 'turret', false);
      this.power = power; this.expireAt = performance.now() + lifeMs; this.shootAcc = 0; this.friendly = true;
    }
    update(dt){
      if(performance.now() > this.expireAt){ this.die(); return; }
      this.shootAcc -= dt;
      if(this.shootAcc <= 0){
        let target = null; let td = Infinity;
        for(const e of enemies) if(e.alive && !e.friendly){ const d=dist(this.x,this.y,e.x,e.y); if(d<td){td=d;target=e;} }
        if(target){
          const dx = target.x - this.x, dy = target.y - this.y; const mag = Math.hypot(dx,dy)||1;
          projectiles.push(new Projectile(this.x, this.y, dx/mag*260, dy/mag*260, this.power, 6, 'player', 700));
        }
        this.shootAcc = 700;
      }
    }
    draw(ctx, cam){
      if(!this.alive) return;
      const x = this.x - cam.x, y=this.y-cam.y;
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle = '#d0a058';
      ctx.fillRect(-10,-10,20,20);
      ctx.restore();
    }
  }

  // --- Projectile ---
  class Projectile {
    constructor(x,y,vx,vy,power,r,owner,range=600){
      this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.power=power; this.r=r; this.owner=owner; this.range=range;
      this.life = Math.max(200, range / Math.hypot(vx,vy) * 1000);
      this.alive = true;
    }
    update(dt){
      if(!this.alive) return;
      this.x += this.vx * dt/1000; this.y += this.vy * dt/1000;
      this.life -= dt; if(this.life<=0) this.alive=false;
      if(this.owner === 'player'){
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= e.r + this.r){ e.takeDamage(this.power); this.alive=false; break; }
      }
    }
    draw(ctx,cam){
      if(!this.alive) return;
      const x=this.x-cam.x, y=this.y-cam.y;
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle = this.owner==='enemy' ? '#f08080' : '#ffd84d';
      ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // --- Orb ---
  class Orb {
    constructor(x,y,amt){
      this.x=x; this.y=y; this.amt=amt; this.r=6; this.alive=true; this.float = Math.random()*Math.PI*2;
    }
    update(dt){ this.float += dt/300; }
    draw(ctx,cam){
      if(!this.alive) return;
      const x=this.x-cam.x, y=this.y-cam.y + Math.sin(this.float)*2;
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle = '#9be3ff';
      ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  // --- spawn & difficulty ---
  function spawnEnemyWave(dt){
    spawnTimer -= dt;
    if(spawnTimer <= 0){
      spawnTimer = spawnInterval;
      const side = Math.floor(Math.random()*4);
      let sx = 0, sy = 0;
      if(side===0){ sx = randRange(0,MAP_W); sy = -20; }
      else if(side===1){ sx = randRange(0,MAP_W); sy = MAP_H + 20; }
      else if(side===2){ sx = -20; sy = randRange(0,MAP_H); }
      else { sx = MAP_W+20; sy = randRange(0,MAP_H); }
      let t = Math.min(1, difficultyTimer/60000);
      const r = Math.random();
      if(r < 0.03 + 0.07*t){
        enemies.push(new Enemy(sx,sy, 220 + 80*t*3, 30, 34, 'brute', true));
      } else if(r < 0.18){
        const s = new Enemy(sx,sy, 40 + 40*t*3, 55 + 30*t, 12, 'skeleton', false);
        enemies.push(s);
      } else if(r < 0.5){
        enemies.push(new Enemy(sx,sy, 60 + 30*t*3, 36 + 10*t, 16, 'zombie', true));
      } else {
        enemies.push(new Enemy(sx,sy, 36 + 20*t*3, 110 + 40*t, 10, 'demon', true));
      }
    }
  }

  function updateDifficulty(dt){
    difficultyTimer += dt;
    spawnInterval = Math.max(500, 2200 - (difficultyTimer/1000)*20);
  }

  // --- camera ---
  function updateCamera(){
    camera.w = VIEW_W; camera.h = VIEW_H;
    let cx = player.x - camera.w/2;
    let cy = player.y - camera.h/2;
    cx = clamp(cx, 0, MAP_W - camera.w);
    cy = clamp(cy, 0, MAP_H - camera.h);
    camera.x = cx; camera.y = cy;
  }

  // --- input ---
  window.addEventListener('keydown', e=> { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', e=> { keys[e.key.toLowerCase()] = false; });

  function getMoveDir(){
    let x = 0, y = 0;
    if(keys['w']||keys['arrowup']||keys['i']) y -= 1;
    if(keys['s']||keys['arrowdown']||keys['k']) y += 1;
    if(keys['a']||keys['arrowleft']||keys['j']) x -= 1;
    if(keys['d']||keys['arrowright']||keys['l']) x += 1;
    const mag = Math.hypot(x,y);
    if(mag>0) return {x:x/mag, y:y/mag};
    return null;
  }

  // --- level-up UI & choices ---
  function getRandomAbilityOption(existingIds=[]){
    const pool = ABILITIES.filter(a=> !existingIds.includes(a.id));
    if(pool.length===0) return ABILITIES[Math.floor(Math.random()*ABILITIES.length)].id;
    return pool[Math.floor(Math.random()*pool.length)].id;
  }

  function presentChoices(title, choices, onPick){
    overlayTitle.textContent = title;
    choiceArea.innerHTML = '';
    choiceArea.style.display = 'flex';
    overlayDesc.style.display='none';
    playBtn.style.display = 'none';
    playOverlay.classList.remove('hidden');
    for(const opt of choices){
      const div = document.createElement('div'); div.className='choice-card';
      div.innerHTML = `<h3>${opt.title}</h3><p>${opt.desc}</p><small style="color:#ffd8a8;">${opt.extra||''}</small>`;
      div.addEventListener('click', ()=>{
        choiceArea.style.display='none';
        overlayDesc.style.display='block';
        playBtn.style.display = running ? 'none' : 'inline-block';
        playOverlay.classList.add('hidden');
        onPick(opt);
      });
      choiceArea.appendChild(div);
    }
  }

  function queueLevelUp(){
    const opts = [];
    for(let i=0;i<3;i++){
      if(player.abilities.length>0 && Math.random()<0.5){
        const a = player.abilities[Math.floor(Math.random()*player.abilities.length)];
        const def = abilityDefs[a.id];
        opts.push({ id:a.id, title: def.title + ` (Upgrade)`, desc: def.desc, extra:`Upgrade to level ${a.lvl+1}` });
      } else {
        const id = getRandomAbilityOption(player.abilities.map(x=>x.id));
        const def = abilityDefs[id];
        opts.push({ id, title: def.title, desc: def.desc, extra:'New ability' });
      }
    }
    running = false;
    presentChoices('Level Up', opts, (opt)=>{
      player.addAbility(opt.id);
      running = true;
      updateHud();
    });
  }

  // --- enemy ranged behavior ---
  function enemyRangedBehavior(e, dt){
    if(e.type!=='skeleton' || !e.alive) return;
    e.tickAcc = (e.tickAcc||0) - dt;
    if(e.tickAcc <= 0){
      e.tickAcc = 1500;
      const dx = player.x - e.x, dy = player.y - e.y; const m = Math.hypot(dx,dy)||1;
      projectiles.push(new Projectile(e.x, e.y, dx/m*180, dy/m*180, 12, 5, 'enemy', 900));
    }
  }

  // --- pickup orbs & passive effects ---
  function pickupOrbs(){
    for(const orb of orbs){
      if(!orb.alive) continue;
      if(dist(player.x,player.y,orb.x,orb.y) <= player.r + orb.r + 6){
        orb.alive=false;
        player.giveXp(Math.round(orb.amt));
      }
    }
    orbs = orbs.filter(o=>o.alive);
  }

  // --- update & draw ---
  function update(dt){
    if(!player || !player.alive) return;
    const dir = getMoveDir();
    if(dir){
      player.x += dir.x * player.moveSpeed * dt/1000;
      player.y += dir.y * player.moveSpeed * dt/1000;
      player.x = clamp(player.x, player.r, MAP_W - player.r);
      player.y = clamp(player.y, player.r, MAP_H - player.r);
    }
    player.tick(dt);
    if(player.hasAbility('poison_trail') && dir){
      const lvl = player.abilityLevel('poison_trail');
      for(const e of enemies) if(e.alive && !e.friendly && dist(player.x,player.y,e.x,e.y) < 40) e.takeDamage( (6 + (lvl-1)*3) * dt/1000 );
    }
    if(dir){
      for(const a of player.abilities){
        const def = abilityDefs[a.id];
        if(!def) continue;
        if(['projectile','cone','melee','dash','active','aoe'].includes(def.type)){
          player.tryUseAbility(a.id, dir.x, dir.y);
        }
      }
    }
    for(const e of enemies){ if(!e.alive) continue; enemyRangedBehavior(e, dt); e.update(dt); }
    enemies = enemies.filter(e=>e.alive);
    for(const p of projectiles) p.update(dt);
    projectiles = projectiles.filter(p=>p.alive);
    for(const o of orbs) o.update(dt);
    for(const p of projectiles){
      if(p.owner==='enemy' && dist(p.x,p.y,player.x,player.y) <= player.r + p.r){ player.takeDamage(p.power); p.alive=false; }
    }
    pickupOrbs();
    spawnEnemyWave(dt);
    updateDifficulty(dt);
    updateCamera();
    updateHud();
  }

  function draw(){
    ctx.fillStyle = '#0b0506';
    ctx.fillRect(0,0,VIEW_W,VIEW_H);
    const startX = Math.floor(camera.x/80)*80 - camera.x;
    const startY = Math.floor(camera.y/80)*80 - camera.y;
    ctx.save(); ctx.translate(startX, startY);
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    for(let gx=0; gx <= MAP_W/80 + 2; gx++){ ctx.beginPath(); ctx.moveTo(gx*80, -startY); ctx.lineTo(gx*80, MAP_H - startY); ctx.stroke(); }
    for(let gy=0; gy <= MAP_H/80 + 2; gy++){ ctx.beginPath(); ctx.moveTo(-startX, gy*80); ctx.lineTo(MAP_W - startX, gy*80); ctx.stroke(); }
    ctx.restore();

    for(const o of orbs) o.draw(ctx, camera);
    for(const e of enemies) e.draw(ctx, camera);
    for(const p of projectiles) p.draw(ctx, camera);

    if(player && player.alive){
      const px = player.x - camera.x, py = player.y - camera.y;
      ctx.save(); ctx.translate(px,py);
      ctx.fillStyle = '#7fbfff';
      ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.fill();
      if(player.shieldUntil > performance.now()){
        ctx.strokeStyle = 'rgba(150,200,255,0.6)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0,0,player.r+6,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath(); ctx.moveTo(VIEW_W/2-12, VIEW_H/2); ctx.lineTo(VIEW_W/2+12, VIEW_H/2);
    ctx.moveTo(VIEW_W/2, VIEW_H/2-12); ctx.lineTo(VIEW_W/2, VIEW_H/2+12); ctx.stroke();
  }

  // --- main loop ---
  function loop(ts){
    const dt = Math.min(40, ts - lastTime);
    lastTime = ts;
    if(running) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // --- HUD ---
  function updateHud(){
    if(!player) return;
    hud.style.display = player.alive ? 'block' : 'none';
    hpText.textContent = `HP: ${Math.round(player.hp)} / ${player.maxHp}`;
    xpFill.style.width = `${Math.min(100, Math.floor(player.xp / player.nextXp * 100))}%`;
    lvlText.textContent = player.level;
    abilityPills.innerHTML = '';
    for(const a of player.abilities){
      const def = abilityDefs[a.id];
      const pill = document.createElement('span'); pill.className='ability-pill';
      pill.textContent = `${def.title} Lv${a.lvl}`;
      abilityPills.appendChild(pill);
    }
    bigScoreEl.textContent = `Score: ${score}`;
  }

  // --- death / reset ---
  function onPlayerDeath(){
    running = false;
    finalScoreEl.textContent = score;
    gameOverModal.classList.remove('hidden');
  }
  retryBtn.addEventListener('click', ()=> {
    gameOverModal.classList.add('hidden');
    resetGame();
    startGame();
  });

  function resetGame(){
    enemies = []; projectiles = []; orbs = []; score = 0; spawnTimer = 0; spawnInterval = 2200; difficultyTimer = 0;
    player = new Player(MAP_W/2, MAP_H/2);
    player.abilities = [];
    chosenAbilities = [];
    updateHud();
  }

  function startGame(){
    resetGame();
    const opts = [];
    const pool = ABILITIES.slice();
    while(opts.length < 3 && pool.length){
      const i = Math.floor(Math.random()*pool.length);
      const a = pool.splice(i,1)[0];
      opts.push({ id:a.id, title:a.title, desc:a.desc, extra:'Choose this starting ability' });
    }
    presentChoices('Choose a starting ability', opts, (opt)=>{
      player.addAbility(opt.id);
      playOverlay.classList.add('hidden');
      running = true;
    });
  }

  // --- UI wiring ---
  if(playBtn) playBtn.addEventListener('click', ()=> startGame());
  if(fullscreenBtn && playbound){
    fullscreenBtn.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await playbound.requestFullscreen();
        else await document.exitFullscreen();
        setTimeout(resizeCanvasToPlaybound, 80);
      } catch (e){}
    });
  }
  if(dayLeaderboardBtn && dayLeaderboardModal) dayLeaderboardBtn.addEventListener('click', ()=> { dayLeaderboardModal.classList.remove('hidden'); });
  if(dayLeaderboardClose && dayLeaderboardModal) dayLeaderboardClose.addEventListener('click', ()=> { dayLeaderboardModal.classList.add('hidden'); });

  // submit score (dummy UI, actual firebase in HTML scope)
  if(submitScoreBtn){
    submitScoreBtn.addEventListener('click', async ()=>{
      submitScoreBtn.disabled = true;
      submitScoreBtn.textContent = 'Saving...';
      setTimeout(()=>{ submitScoreBtn.textContent = 'Saved'; submitScoreBtn.disabled = false; gameOverModal.classList.add('hidden'); }, 700);
    });
  }

  // --- resize and background init ---
  function resizeCanvasToPlaybound(){
    if(!canvas || !playbound) return;
    const rect = playbound.getBoundingClientRect();
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }
  window.addEventListener('resize', resizeCanvasToPlaybound);
  resizeCanvasToPlaybound();

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
  initBackgroundElements();

  // start loop
  requestAnimationFrame(loop);

  // initial debug state
  resetGame();
  updateHud();

  // expose API
  window.Day5Game = { startGame, resetGame, playerRef: ()=>player, GAME_NAME: 'Midnight Crossing', GAME_END_TS };
})();
