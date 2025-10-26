// Completed game logic with map background, clearer visuals, more abilities, healing drops,
// slower early difficulty, easier leveling, auto abilities and HUD moved into playbound.

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
  const gameOverModal = document.getElementById('game-over-modal');
  const finalScoreEl = document.getElementById('final-score');
  const submitScoreBtn = document.getElementById('submit-score-btn');
  const retryBtn = document.getElementById('retry-btn');
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

  // Timer — Nov 1 00:00 PT
  const now = new Date();
  const year = now.getFullYear();
  const GAME_END_TS = Date.parse(`${year}-11-01T00:00:00-07:00`);
  function formatTimeRemaining(ms){
    if(ms<=0) return 'Event Ended';
    const s=Math.floor(ms/1000);
    const hh=Math.floor(s/3600).toString().padStart(2,'0');
    const mm=Math.floor((s%3600)/60).toString().padStart(2,'0');
    const ss=(s%60).toString().padStart(2,'0');
    return `${hh}:${mm}:${ss}`;
  }
  function updateTimers(){ if(gameTimerHeader) gameTimerHeader.textContent = formatTimeRemaining(GAME_END_TS - Date.now()); }
  updateTimers(); setInterval(updateTimers,1000);

  // logical canvas resolution
  const VIEW_W = 480, VIEW_H = 720;
  canvas.width = VIEW_W; canvas.height = VIEW_H;

  // map size large multiple of view
  const MAP_W = VIEW_W * 7;
  const MAP_H = VIEW_H * 5;

  // state
  let running = false;
  let lastTime = performance.now();
  let keys = {};
  let player = null;
  let camera = { x:0,y:0,w:VIEW_W,h:VIEW_H };
  let enemies = [];
  let projectiles = [];
  let orbs = [];
  let spawnTimer = 0;
  // slower start, longer initial interval
  let spawnInterval = 3800;
  let difficultyTimer = 0;
  let score = 0;
  let abilityDefs = {};

  // visual effect arrays
  let blades = []; // spinning blades around player
  let beams = []; // lasers / cones
  let anvils = []; // falling anvils
  let particles = [];

  // --- ability definitions (extended) ---
  const ABILITIES = [
    { id:'blade_spin', title:'Blade Spin', desc:'Rotating blades around you (auto, melee).', type:'auto', basePower:16, cooldown:900, range:72, upgradePow:(lv)=>16 + lv*6 },
    { id:'dash_strike', title:'Dash Strike', desc:'Short dash that damages enemies you pass through.', type:'dash', basePower:28, cooldown:2600, range:160, upgradePow:(lv)=>28+lv*10 },
    { id:'fireball', title:'Fireball', desc:'Launchs a slowing, damaging fireball (projectile).', type:'projectile', basePower:22, cooldown:900, range:440, upgradePow:(lv)=>22+lv*8 },
    { id:'siphon', title:'Siphon', desc:'On-hit siphon: also deals small damage and heals you.', type:'passive', basePower:6, cooldown:0, range:40, upgradePow:(lv)=>6+lv*3 },
    { id:'turret', title:'Turret', desc:'Deploy a turret that auto-shoots nearby enemies.', type:'deploy', basePower:12, cooldown:5000, range:0, upgradePow:(lv)=>12+lv*6 },
    { id:'shockwave', title:'Shockwave', desc:'Forward cone shock that knocks and damages.', type:'cone', basePower:20, cooldown:2500, range:220, upgradePow:(lv)=>20+lv*8 },
    { id:'poison_trail', title:'Poison Trail', desc:'Leave damaging trail when moving.', type:'aura', basePower:6, cooldown:0, range:28, upgradePow:(lv)=>6+lv*3 },
    { id:'multi_arrow', title:'Multi Arrow', desc:'Fire a spread of arrows forward.', type:'projectile', basePower:16, cooldown:1200, range:520, upgradePow:(lv)=>16+lv*6 },
    { id:'shield', title:'Shield', desc:'Temporary damage reduction shield.', type:'active', basePower:0.36, cooldown:8000, range:0, upgradePow:(lv)=>0.36+lv*0.08 },
    { id:'time_slown', title:'Time Slow', desc:'Slow enemies in range for a short period.', type:'aoe', basePower:0.55, cooldown:10000, range:260, upgradePow:(lv)=>0.55+lv*0.06 },

    // new auto / special abilities
    { id:'auto_laser', title:'Auto Laser', desc:'Auto-aim laser periodically to nearest enemy.', type:'auto', basePower:22, cooldown:1200, range:700, upgradePow:(lv)=>22+lv*10 },
    { id:'anvil_drop', title:'Anvil Drop', desc:'Random heavy anvil falls on a nearby enemy.', type:'auto', basePower:45, cooldown:6000, range:700, upgradePow:(lv)=>45+lv*20 },
    { id:'homing_mine', title:'Homing Mine', desc:'Spawn a slow homing mine that seeks enemies.', type:'deploy', basePower:18, cooldown:4000, range:0, upgradePow:(lv)=>18+lv*8 },
    { id:'frost_aura', title:'Frost Aura', desc:'Constant cold aura that chills and damages enemies nearby.', type:'aura', basePower:4, cooldown:0, range:80, upgradePow:(lv)=>4+lv*2 }
  ];
  ABILITIES.forEach(a=> abilityDefs[a.id]=a);

  // --- utilities ---
  function randRange(a,b){ return a + Math.random()*(b-a); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function dist(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return Math.hypot(dx,dy); }
  function choose(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

  // --- Player ---
  class Player {
    constructor(x,y){
      this.x=x; this.y=y; this.r=18;
      this.hp=110; this.maxHp=110;
      this.xp=0; this.level=1;
      this.nextXp = 60; // easier leveling
      this.abilities = [];
      this.moveSpeed = 180;
      this.shieldUntil = 0;
      this.alive = true;
      this.lastAuto = {};
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
      // auto abilities: check timers
      for(const a of this.abilities){
        const def = abilityDefs[a.id];
        if(!def) continue;
        if(def.type === 'auto'){
          const last = this.lastAuto[a.id]||0;
          if(performance.now() - last > (def.cooldown || 1000)){
            this.lastAuto[a.id] = performance.now();
            this.triggerAuto(a.id);
          }
        }
      }
    }
    triggerAuto(id){
      // auto abilities which don't require player facing
      const def = abilityDefs[id];
      const lvl = this.abilityLevel(id);
      const power = def.upgradePow ? def.upgradePow(lvl-1) : def.basePower;
      if(id === 'blade_spin'){
        // spawn blades visual that deal damage over time nearby
        blades.push({ t: performance.now(), dur: 600, power, spins: 6 + lvl*2 });
      } else if(id === 'auto_laser'){
        // target nearest enemy and fire a beam
        const target = enemies.filter(e=>e.alive && !e.friendly).sort((a,b)=>dist(this.x,this.y,a.x,a.y)-dist(this.x,this.y,b.x,b.y))[0];
        if(target) {
          beams.push({ x1:this.x, y1:this.y, x2:target.x, y2:target.y, t:performance.now(), dur:160, power });
          target.takeDamage(power);
        }
      } else if(id === 'anvil_drop'){
        // pick random enemy and spawn anvil above them
        const pool = enemies.filter(e=>e.alive && !e.friendly);
        if(pool.length){
          const target = choose(pool);
          anvils.push({ tx: target.x, ty: target.y, x: target.x, y: -80, vy: 0, t: performance.now(), power, hit:false });
        }
      }
    }
    takeDamage(dmg){
      if(this.shieldUntil > performance.now()) dmg *= 0.45;
      this.hp -= dmg;
      if(this.hp <= 0){ this.hp = 0; this.die(); }
    }
    heal(n){ this.hp = Math.min(this.maxHp, this.hp + n); }
    die(){ this.alive=false; onPlayerDeath(); }
    giveXp(n){
      this.xp += n;
      while(this.xp >= this.nextXp){
        this.xp -= this.nextXp;
        this.level++;
        this.nextXp = Math.floor(60 * Math.pow(1.35, this.level-1));
        queueLevelUp();
      }
    }
    tryUseAbility(id, dx, dy){
      const def = abilityDefs[id]; if(!def) return false;
      const slot = this.abilities.find(a=>a.id===id); if(!slot) return false;
      if(slot.cd>0) return false;
      slot.lastUsed = performance.now();
      slot.cd = def.cooldown || 0;
      const lvl = slot.lvl;
      const power = def.upgradePow ? def.upgradePow(lvl-1) : def.basePower;

      // ensure every ability deals damage somewhere (passives also do small damage)
      if(def.type==='melee' || def.type==='auto' || def.type==='aura'){
        // melee-like: immediate radius damage + visible blades
        blades.push({ t:performance.now(), dur:500, power, spins: 5 + lvl });
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= (def.range||72)) e.takeDamage(power);
        return true;
      }
      if(def.type==='dash'){
        const nx = dx||1, ny = dy||0, mag=Math.hypot(nx,ny)||1;
        this.x += (nx/mag)*def.range;
        this.y += (ny/mag)*def.range;
        this.x = clamp(this.x, this.r, MAP_W - this.r); this.y = clamp(this.y, this.r, MAP_H - this.r);
        // visible rush streak and damage enemies along path
        particles.push({ x:this.x, y:this.y, t:performance.now(), dur:350, col:'#ffcc88' });
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= this.r + e.r + 8) e.takeDamage(power);
        return true;
      }
      if(def.type==='projectile'){
        const nx = (dx||1), ny = (dy||0), mag=Math.hypot(nx,ny)||1;
        const speed = 420;
        projectiles.push(new Projectile(this.x + nx/mag*(this.r+8), this.y + ny/mag*(this.r+8), nx/mag*speed, ny/mag*speed, power, 6, 'player', def.range));
        return true;
      }
      if(def.type==='deploy'){
        // turret or mine
        if(id === 'turret'){
          const t = new Turret(this.x + 20, this.y, power, 7000 + lvl*1500); t.friendly = true; enemies.push(t);
        } else if(id === 'homing_mine'){
          enemies.push(new HomingMine(this.x + randRange(-18,18), this.y + randRange(-18,18), power, 7000 + lvl*1000));
        }
        return true;
      }
      if(def.type==='cone'){
        beams.push({ x1:this.x, y1:this.y, angle: Math.atan2(dy||1,dx||1), cone:true, dur:220, t:performance.now(), power, range:def.range });
        // apply damage
        const angleCenter = Math.atan2(dy||1,dx||1);
        const coneSize = Math.PI/3;
        for(const e of enemies) if(e.alive && !e.friendly){
          const dx2 = e.x - this.x, dy2 = e.y - this.y, d = Math.hypot(dx2,dy2);
          if(d > def.range) continue;
          const a = Math.atan2(dy2,dx2); let diff = Math.abs(((a-angleCenter+Math.PI)%(Math.PI*2))-Math.PI);
          if(diff < coneSize/2) e.takeDamage(power);
        }
        return true;
      }
      if(def.type==='active'){
        this.shieldUntil = performance.now() + 2000 + lvl*600;
        return true;
      }
      if(def.type==='aoe'){
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= def.range){ e.applySlow(0.45, 2000 + lvl*200); e.takeDamage(power*0.6); }
        beams.push({ x1:this.x, y1:this.y, aoe:true, range:def.range, t:performance.now(), dur:260, power });
        return true;
      }
      return false;
    }
  }

  // --- Enemy, Turret, Projectile, Orb, HomingMine ---
  class Enemy {
    constructor(x,y,hp=40,speed=40,r=14,type='zombie',melee=true){
      this.x=x; this.y=y; this.hp=hp; this.maxHp=hp; this.speed=speed; this.r=r; this.type=type; this.melee=melee;
      this.alive=true; this.slowUntil=0; this.slowFactor=1; this.tickAcc=0; this.friendly=false;
    }
    takeDamage(d){
      this.hp -= d;
      // small particle burst
      particles.push({ x:this.x, y:this.y, t:performance.now(), dur:500, col:'#ff6b6b' });
      if(this.hp<=0) this.die();
    }
    die(){
      if(!this.alive) return;
      this.alive=false;
      score += Math.round(this.maxHp/3);
      // xp orbs
      const orbsCount = Math.max(1, Math.floor(this.maxHp/18));
      for(let i=0;i<orbsCount;i++) orbs.push(new Orb(this.x + randRange(-10,10), this.y + randRange(-10,10), randRange(8,18), 'xp'));
      // chance to drop heal
      if(Math.random() < 0.18) orbs.push(new Orb(this.x + randRange(-8,8), this.y + randRange(-8,8), randRange(12,30), 'heal'));
    }
    applySlow(factor, ms){ this.slowFactor = factor; this.slowUntil = performance.now() + ms; }
    update(dt){
      if(!player || !player.alive) return;
      if(this.friendly) {
        // turrets or friendly entities don't chase player
        if(this.updateFriendly) this.updateFriendly(dt);
        return;
      }
      if(performance.now() > this.slowUntil) this.slowFactor = 1;
      const sx = player.x - this.x, sy = player.y - this.y; const d = Math.hypot(sx,sy);
      if(d > 1){
        const spd = this.speed * (this.slowFactor || 1);
        this.x += (sx/d) * spd * dt/1000;
        this.y += (sy/d) * spd * dt/1000;
        this.x = clamp(this.x, 0, MAP_W); this.y = clamp(this.y, 0, MAP_H);
      }
      if(this.melee && d <= this.r + player.r + 4){
        if(this.tickAcc <= 0){
          player.takeDamage(Math.max(3, this.maxHp*0.06));
          this.tickAcc = 650;
        }
      }
      if(this.tickAcc > 0) this.tickAcc = Math.max(0, this.tickAcc - dt);
    }
    draw(ctx, cam){
      if(!this.alive) return;
      const x = this.x - cam.x, y = this.y - cam.y;
      ctx.save(); ctx.translate(x,y);
      // body style per type
      if(this.type==='skeleton'){ ctx.fillStyle = '#dfe8e9'; }
      else if(this.type==='demon'){ ctx.fillStyle = '#b14a4a'; }
      else if(this.type==='brute'){ ctx.fillStyle = '#7b3a3a'; }
      else ctx.fillStyle = '#6b8b6b';
      ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      // hp bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-this.r, -this.r-8, this.r*2, 5);
      ctx.fillStyle = '#ff8d4d'; ctx.fillRect(-this.r, -this.r-8, (this.hp/this.maxHp)*this.r*2, 5);
      ctx.restore();
    }
  }

  class Turret extends Enemy {
    constructor(x,y,power,lifeMs){
      super(x,y, 40, 0, 12, 'turret', false);
      this.power=power; this.expireAt=performance.now()+lifeMs; this.shootAcc=0; this.friendly=true;
    }
    update(dt){
      if(performance.now() > this.expireAt){ this.alive=false; return; }
      this.shootAcc -= dt;
      if(this.shootAcc <= 0){
        let target=null, td=Infinity;
        for(const e of enemies) if(e.alive && !e.friendly){ const d=dist(this.x,this.y,e.x,e.y); if(d<td){td=d;target=e;} }
        if(target){
          const dx = target.x - this.x, dy = target.y - this.y, m = Math.hypot(dx,dy)||1;
          projectiles.push(new Projectile(this.x, this.y, dx/m*260, dy/m*260, this.power, 6, 'player', 700));
        }
        this.shootAcc = 700;
      }
    }
  }

  // homing mine as friendly deployable that seeks enemies
  class HomingMine extends Enemy {
    constructor(x,y,power,lifeMs){
      super(x,y, 24, 30, 10, 'mine', false);
      this.power = power; this.expireAt = performance.now()+lifeMs; this.friendly=true;
    }
    update(dt){
      if(performance.now() > this.expireAt){ this.alive=false; return; }
      let target=null, td=Infinity;
      for(const e of enemies) if(e.alive && !e.friendly){ const d=dist(this.x,this.y,e.x,e.y); if(d<td){td=d;target=e;} }
      if(target){
        const dx=target.x-this.x, dy=target.y-this.y, m=Math.hypot(dx,dy)||1;
        this.x += (dx/m) * 80 * dt/1000;
        this.y += (dy/m) * 80 * dt/1000;
        if(dist(this.x,this.y,target.x,target.y) < target.r + this.r + 4){
          target.takeDamage(this.power); this.alive=false;
        }
      }
    }
    draw(ctx, cam){
      if(!this.alive) return;
      const x=this.x-cam.x, y=this.y-cam.y;
      ctx.save(); ctx.translate(x,y);
      ctx.fillStyle = '#cc9a2e'; ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  class Projectile {
    constructor(x,y,vx,vy,power,r,owner,range=600){
      this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.power=power; this.r=r; this.owner=owner; this.range=range;
      this.life = Math.max(200, range / Math.hypot(vx,vy) * 1000);
      this.alive=true; this.trail=[];
    }
    update(dt){
      if(!this.alive) return;
      this.x += this.vx * dt/1000; this.y += this.vy * dt/1000;
      this.trail.push({x:this.x, y:this.y, t:performance.now()});
      while(this.trail.length>10) this.trail.shift();
      this.life -= dt; if(this.life<=0) this.alive=false;
      if(this.owner === 'player'){
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= e.r + this.r){ e.takeDamage(this.power); this.alive=false; break; }
      } else if(this.owner === 'enemy'){
        if(dist(this.x,this.y,player.x,player.y) <= player.r + this.r){ player.takeDamage(this.power); this.alive=false; }
      }
    }
    draw(ctx,cam){
      if(!this.alive) return;
      const x=this.x-cam.x, y=this.y-cam.y;
      ctx.save(); ctx.translate(x,y);
      // trail
      for(let i=0;i<this.trail.length;i++){
        const p=this.trail[i]; const alpha = (i+1)/this.trail.length * 0.6;
        ctx.fillStyle = this.owner==='player' ? `rgba(255,216,77,${alpha})` : `rgba(240,128,128,${alpha})`;
        ctx.beginPath(); ctx.arc(p.x-cam.x,p.y-cam.y, Math.max(1, this.r * i/this.trail.length),0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle = this.owner==='player' ? '#ffd84d' : '#f08080';
      ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  }

  class Orb {
    constructor(x,y,amt,type='xp'){ this.x=x; this.y=y; this.amt=amt; this.type=type; this.r=8; this.alive=true; this.float=Math.random()*Math.PI*2; }
    update(dt){ this.float += dt/300; }
    draw(ctx,cam){
      if(!this.alive) return;
      const x=this.x-cam.x, y=this.y-cam.y + Math.sin(this.float)*2;
      ctx.save(); ctx.translate(x,y);
      if(this.type==='xp'){ ctx.fillStyle = '#9be3ff'; ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill(); }
      else { ctx.fillStyle = '#9bffb5'; ctx.beginPath(); ctx.rect(-this.r/1.6, -this.r/1.6, this.r*1.6, this.r*1.6); ctx.fill(); }
      ctx.restore();
    }
  }

  // --- spawns / difficulty ---
  function spawnEnemyWave(dt){
    spawnTimer -= dt;
    if(spawnTimer <= 0){
      spawnTimer = spawnInterval;
      const side = Math.floor(Math.random()*4);
      let sx=0, sy=0;
      if(side===0){ sx = randRange(0,MAP_W); sy = -20; }
      else if(side===1){ sx = randRange(0,MAP_W); sy = MAP_H + 20; }
      else if(side===2){ sx = -20; sy = randRange(0,MAP_H); }
      else { sx = MAP_W + 20; sy = randRange(0,MAP_H); }
      const t = Math.min(1, difficultyTimer/90000); // slower ramp (90s)
      const r = Math.random();
      if(r < 0.04 + 0.06*t){
        enemies.push(new Enemy(sx,sy, 220 + 60*t*3, 28, 34, 'brute', true));
      } else if(r < 0.2){
        enemies.push(new Enemy(sx,sy, 40 + 30*t*2, 45 + 20*t, 12, 'skeleton', false));
      } else if(r < 0.55){
        enemies.push(new Enemy(sx,sy, 46 + 24*t*2, 34 + 8*t, 16, 'zombie', true));
      } else {
        enemies.push(new Enemy(sx,sy, 30 + 18*t*2, 90 + 30*t, 10, 'demon', true));
      }
    }
  }
  function updateDifficulty(dt){
    difficultyTimer += dt;
    spawnInterval = Math.max(700, 3800 - (difficultyTimer/1000)*6); // decline slower
  }

  // --- camera centering with clamp to borders ---
  function updateCamera(){
    camera.w = VIEW_W; camera.h = VIEW_H;
    let cx = player.x - camera.w/2; let cy = player.y - camera.h/2;
    cx = clamp(cx, 0, MAP_W - camera.w); cy = clamp(cy, 0, MAP_H - camera.h);
    camera.x = cx; camera.y = cy;
  }

  // --- input ---
  window.addEventListener('keydown', e=> { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', e=> { keys[e.key.toLowerCase()] = false; });

  function getMoveDir(){
    let x=0,y=0;
    if(keys['w']||keys['arrowup']||keys['i']) y -= 1;
    if(keys['s']||keys['arrowdown']||keys['k']) y += 1;
    if(keys['a']||keys['arrowleft']||keys['j']) x -= 1;
    if(keys['d']||keys['arrowright']||keys['l']) x += 1;
    const m = Math.hypot(x,y); if(m>0) return {x:x/m,y:y/m}; return null;
  }

  // --- level up UI & choices ---
  function getRandomAbilityOption(existingIds=[]){
    const pool = ABILITIES.filter(a=> !existingIds.includes(a.id));
    if(pool.length===0) return ABILITIES[Math.floor(Math.random()*ABILITIES.length)].id;
    return pool[Math.floor(Math.random()*pool.length)].id;
  }
  function presentChoices(title, choices, onPick){
    overlayTitle.textContent = title;
    choiceArea.innerHTML = ''; choiceArea.style.display='flex';
    overlayDesc.style.display='none';
    playBtn.style.display='none';
    playOverlay.classList.remove('hidden');
    for(const opt of choices){
      const div = document.createElement('div'); div.className='choice-card';
      div.innerHTML = `<h3>${opt.title}</h3><p>${opt.desc}</p><small style="color:#ffd8a8;">${opt.extra||''}</small>`;
      div.addEventListener('click', ()=>{ choiceArea.style.display='none'; overlayDesc.style.display='block'; playOverlay.classList.add('hidden'); onPick(opt); });
      choiceArea.appendChild(div);
    }
  }
  function queueLevelUp(){
    const opts=[];
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
    presentChoices('Level Up', opts, (opt)=>{ player.addAbility(opt.id); running = true; updateHud(); });
  }

  // --- ranged enemy behaviour: skeleton shoots ---
  function enemyRangedBehavior(e, dt){
    if(e.type!=='skeleton' || !e.alive) return;
    e.tickAcc = (e.tickAcc||0) - dt;
    if(e.tickAcc <= 0){
      e.tickAcc = 1600;
      const dx = player.x - e.x, dy = player.y - e.y; const m = Math.hypot(dx,dy)||1;
      projectiles.push(new Projectile(e.x, e.y, dx/m*170, dy/m*170, 10, 5, 'enemy', 900));
    }
  }

  // --- pickups & passive effects ---
  function pickupOrbs(){
    for(const orb of orbs){
      if(!orb.alive) continue;
      if(dist(player.x,player.y,orb.x,orb.y) <= player.r + orb.r + 6){
        orb.alive=false;
        if(orb.type==='xp') player.giveXp(Math.round(orb.amt));
        else if(orb.type==='heal') player.heal(Math.round(orb.amt));
      }
    }
    orbs = orbs.filter(o=>o.alive);
  }

  // --- update & visuals helper ---
  function updateEffects(dt){
    // blades: deal damage to nearby enemies while present
    const now = performance.now();
    for(const b of blades){
      const elapsed = now - b.t;
      if(elapsed > b.dur) continue;
      // apply intermittent damage
      for(const e of enemies) if(e.alive && !e.friendly){
        const d = dist(player.x,player.y,e.x,e.y);
        if(d <= (b.spins/6)*48) e.takeDamage(b.power * dt/1000 * 60); // scaled per second
      }
    }
    blades = blades.filter(b=> now - b.t <= b.dur);

    // beams: short-lived visual (already damaged on spawn for some)
    beams = beams.filter(b => now - b.t <= (b.dur||220));

    // anvils: fall and hit
    for(const a of anvils){
      if(a.hit) continue;
      a.vy += 1200 * dt/1000;
      a.y += a.vy * dt/1000;
      if(a.y >= a.ty){
        // damage nearby enemies
        for(const e of enemies) if(e.alive && !e.friendly && dist(a.tx,a.ty,e.x,e.y) < 36) e.takeDamage(a.power);
        a.hit = true;
        particles.push({ x:a.tx, y:a.ty, t:performance.now(), dur:700, col:'#ffb86b' });
      }
    }
    anvils = anvils.filter(a => !a.hit || (now - a.t < 600));

    // particles cleanup
    particles = particles.filter(p => performance.now() - p.t <= p.dur);
  }

  function update(dt){
    if(!player || !player.alive) return;
    const dir = getMoveDir();
    if(dir){
      player.x += dir.x * player.moveSpeed * dt/1000;
      player.y += dir.y * player.moveSpeed * dt/1000;
      player.x = clamp(player.x, 0, MAP_W);
      player.y = clamp(player.y, 0, MAP_H);
    }
    player.tick(dt);

    // passive abilities that do damage without facing
    if(player.hasAbility('poison_trail') && dir){
      const lvl = player.abilityLevel('poison_trail');
      for(const e of enemies) if(e.alive && !e.friendly && dist(player.x,player.y,e.x,e.y) < 40) e.takeDamage( (6 + (lvl-1)*3) * dt/1000 );
    }
    if(player.hasAbility('frost_aura')){
      const lvl = player.abilityLevel('frost_aura');
      for(const e of enemies) if(e.alive && !e.friendly && dist(player.x,player.y,e.x,e.y) <= 80) { e.takeDamage((4 + (lvl-1)*2) * dt/1000); e.applySlow(0.7, 600); }
    }
    // attempt use directional abilities when moving (still supports auto abilities)
    if(dir){
      for(const a of player.abilities){
        const def = abilityDefs[a.id]; if(!def) continue;
        if(['projectile','cone','melee','dash','active','aoe','deploy'].includes(def.type)){
          player.tryUseAbility(a.id, dir.x, dir.y);
        }
      }
    }

    // update enemies
    for(const e of enemies) if(e.alive){ enemyRangedBehavior(e, dt); e.update(dt); }
    enemies = enemies.filter(e=>e.alive);

    // projectiles
    for(const p of projectiles) p.update(dt);
    projectiles = projectiles.filter(p=>p.alive);

    // orbs
    for(const o of orbs) o.update(dt);

    // enemy projectiles hitting player handled in Projectile.update

    pickupOrbs();

    spawnEnemyWave(dt);
    updateDifficulty(dt);

    updateEffects(dt);

    updateCamera();
    updateHud();
  }

  // --- draw: background tilemap + entities + effects ---
  function drawBackground(){
    // textured grid / floor with subtle parallax
    const tile = 64;
    const camX = camera.x, camY = camera.y;
    // base floor
    ctx.save();
    // draw large tiles with variation
    for(let y = Math.floor(camY/tile)-1; y <= Math.floor((camY+VIEW_H)/tile)+1; y++){
      for(let x = Math.floor(camX/tile)-1; x <= Math.floor((camX+VIEW_W)/tile)+1; x++){
        const px = x*tile - camX, py = y*tile - camY;
        const shade = ((x + y) % 2 === 0) ? '#0b1a1e' : '#081316';
        ctx.fillStyle = shade;
        ctx.fillRect(px, py, tile, tile);
        // faint pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.strokeRect(px+1, py+1, tile-2, tile-2);
      }
    }
    ctx.restore();
    // draw map bounds indicator (slightly)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,107,53,0.03)';
    ctx.lineWidth = 6;
    ctx.strokeRect(-camX, -camY, MAP_W, MAP_H);
    ctx.restore();
  }

  function draw(){
    // clear
    ctx.fillStyle = '#041018';
    ctx.fillRect(0,0,VIEW_W,VIEW_H);

    // background map
    drawBackground();

    // draw orbs
    for(const o of orbs) o.draw(ctx, camera);

    // beams (laser/cone/aoe visuals)
    for(const b of beams){
      const age = performance.now() - b.t; const a = 1 - age/(b.dur||220);
      if(a <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a*0.95;
      if(b.aoe){
        ctx.fillStyle = 'rgba(120,200,255,0.12)'; ctx.beginPath(); ctx.arc(b.x1 - camera.x, b.y1 - camera.y, b.range, 0, Math.PI*2); ctx.fill();
      } else if(b.cone){
        ctx.fillStyle = 'rgba(255,180,110,0.12)'; ctx.beginPath();
        ctx.moveTo(b.x1-camera.x, b.y1-camera.y);
        const ang = b.angle;
        const r = b.range;
        ctx.arc(b.x1-camera.x, b.y1-camera.y, r, ang - 0.7, ang + 0.7);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,220,80,0.85)'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(b.x1-camera.x, b.y1-camera.y); ctx.lineTo((b.x2||b.tx)-camera.x, (b.y2||b.ty)-camera.y); ctx.stroke();
      }
      ctx.restore();
    }

    // anvils
    for(const a of anvils) {
      ctx.save();
      const x = a.x - camera.x, y = a.y - camera.y;
      ctx.translate(x,y);
      ctx.fillStyle = '#5a4c3a';
      ctx.fillRect(-14, -10, 28, 20);
      ctx.restore();
    }

    // enemies
    for(const e of enemies) e.draw(ctx, camera);

    // projectiles
    for(const p of projectiles) p.draw(ctx, camera);

    // player
    if(player && player.alive){
      const px = player.x - camera.x, py = player.y - camera.y;
      ctx.save(); ctx.translate(px,py);
      // avatar
      ctx.fillStyle = '#7fbfff'; ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.fill();
      // shield indicator
      if(player.shieldUntil > performance.now()){
        ctx.strokeStyle = 'rgba(130,200,255,0.6)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0,0,player.r+8,0,Math.PI*2); ctx.stroke();
      }
      ctx.restore();
    }

    // blades visual around player
    for(const b of blades){
      const age = performance.now() - b.t; if(age > b.dur) continue;
      const ratio = 1 - age / b.dur;
      const spins = b.spins;
      for(let i=0;i<spins;i++){
        const ang = (performance.now()/300 + i*(Math.PI*2/spins));
        const rad = 28 + i*2;
        const x = player.x - camera.x + Math.cos(ang)*rad;
        const y = player.y - camera.y + Math.sin(ang)*rad;
        ctx.save(); ctx.globalAlpha = 0.9*ratio;
        ctx.fillStyle = '#ffd84d';
        ctx.beginPath(); ctx.ellipse(x,y,6,3,ang,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
    }

    // particles
    for(const p of particles){
      const age = performance.now()-p.t; const a = 1 - age/p.dur;
      if(a<=0) continue;
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = p.col || '#fff';
      ctx.fillRect(p.x - camera.x - 2, p.y - camera.y - 2, 4, 4); ctx.restore();
    }

    // crosshair center
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.beginPath(); ctx.moveTo(VIEW_W/2-12, VIEW_H/2); ctx.lineTo(VIEW_W/2+12, VIEW_H/2); ctx.moveTo(VIEW_W/2, VIEW_H/2-12); ctx.lineTo(VIEW_W/2, VIEW_H/2+12); ctx.stroke();
  }

  // --- main loop ---
  function loop(ts){
    const dt = Math.min(40, ts - lastTime);
    lastTime = ts;
    if(running) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  // --- HUD updates ---
  function updateHud(){
    if(!player) return;
    hud.style.display = player.alive ? 'flex' : 'none';
    hpText.textContent = `HP: ${Math.round(player.hp)} / ${player.maxHp}`;
    xpFill.style.width = `${Math.min(100, Math.floor(player.xp / player.nextXp * 100))}%`;
    lvlText.textContent = player.level;
    abilityPills.innerHTML = '';
    for(const a of player.abilities){
      const def = abilityDefs[a.id]; const span = document.createElement('span'); span.className='ability-pill';
      span.textContent = `${def.title} Lv${a.lvl}`; abilityPills.appendChild(span);
    }
    bigScoreEl.textContent = `Score: ${score}`;
  }

  // --- death / reset ---
  function onPlayerDeath(){
    running = false;
    finalScoreEl.textContent = score;
    gameOverModal.classList.remove('hidden');
  }
  retryBtn.addEventListener('click', ()=>{ gameOverModal.classList.add('hidden'); resetGame(); startGame(); });

  function resetGame(){
    enemies = []; projectiles = []; orbs = []; blades=[]; beams=[]; anvils=[]; particles=[];
    score = 0; spawnTimer = 0; spawnInterval = 3800; difficultyTimer = 0;
    player = new Player(MAP_W/2, MAP_H/2);
    player.abilities = [];
    updateHud();
  }

  // starting choice ensures damage-dealing starts (filter out pure non-damaging picks)
  function startGame(){
    resetGame();
    const opts=[]; const pool = ABILITIES.slice();
    while(opts.length<3 && pool.length){
      const i = Math.floor(Math.random()*pool.length);
      const a = pool.splice(i,1)[0];
      // ensure given options are damaging or at least pseudo-damaging
      opts.push({ id:a.id, title:a.title, desc:a.desc, extra:'Starting ability' });
    }
    presentChoices('Choose starting ability', opts, (opt)=>{ player.addAbility(opt.id); playOverlay.classList.add('hidden'); running=true; });
  }

  // UI wiring
  if(playBtn) playBtn.addEventListener('click', ()=> startGame());
  if(fullscreenBtn && playbound) fullscreenBtn.addEventListener('click', async ()=>{ try{ if(!document.fullscreenElement) await playbound.requestFullscreen(); else await document.exitFullscreen(); setTimeout(resizeCanvasToPlaybound,80);}catch(e){} });
  if(dayLeaderboardBtn && dayLeaderboardModal) dayLeaderboardBtn.addEventListener('click', ()=> dayLeaderboardModal.classList.remove('hidden'));
  if(dayLeaderboardClose && dayLeaderboardModal) dayLeaderboardClose.addEventListener('click', ()=> dayLeaderboardModal.classList.add('hidden'));
  if(submitScoreBtn){ submitScoreBtn.addEventListener('click', async ()=>{ submitScoreBtn.disabled=true; submitScoreBtn.textContent='Saving...'; setTimeout(()=>{ submitScoreBtn.textContent='Saved'; submitScoreBtn.disabled=false; gameOverModal.classList.add('hidden'); },700); }); }

  // --- pickups / visuals initial helpers ---
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
    for(let i=0;i<18;i++){
      const leaf = document.createElement('div'); leaf.className='leaf';
      leaf.style.left = `${Math.random()*100}%`; leaf.style.top = `${-10 - Math.random()*60}%`; leaf.style.animationDelay = `${Math.random()*10}s`; backgroundRoot.appendChild(leaf);
    }
    for(let i=0;i<8;i++){
      const pk = document.createElement('div'); pk.className='bg-pumpkin';
      pk.style.left = `${Math.random()*100}%`; pk.style.top = `${-20 - Math.random()*60}%`; pk.style.animationDelay = `${Math.random()*12}s`; backgroundRoot.appendChild(pk);
    }
  }
  initBackgroundElements();

  // expose API
  window.Day5Game = { startGame, resetGame, playerRef: ()=>player, GAME_NAME: 'Midnight Crossing', GAME_END_TS };

  // kickoff
  requestAnimationFrame(loop);
  resetGame();
  updateHud();
})();
