// Changes: landscape aspect, fullscreen aspect-preserve + restore, more abilities/enemies/bosses,
// knockback, nerfs, visual-only abilities removed, end-game button, heal-drop nerf, fixed duplicates.

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

  // logical canvas resolution — landscape default
  const VIEW_W = 900, VIEW_H = 540; // landscape
  canvas.width = VIEW_W; canvas.height = VIEW_H;

  // map size large multiple of view
  const MAP_W = VIEW_W * 6;
  const MAP_H = VIEW_H * 4;

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
  let spawnInterval = 3800;
  let score = 0;
  let abilityDefs = {};

  // visual effect arrays
  let blades = [];
  let beams = [];
  let anvils = [];
  let particles = [];
  let poisonTrails = []; // visual trail segments
  const ENEMY_PROJECTILE_CAP = 12; // cap simultaneous enemy projectiles

  // --- ability definitions (all abilities have visible effects) ---
  const ABILITIES = [
    // melee reduced, visible blades
    { id:'blade_spin', title:'Blade Spin', desc:'Rotating blades around you (auto).', type:'auto', basePower:10, cooldown:900, range:72, upgradePow:(lv)=>10 + lv*3 },
    // dash: small damage and visible streak, knockback
    { id:'dash_strike', title:'Dash Strike', desc:'Dash and damage enemies in path.', type:'dash', basePower:18, cooldown:2600, range:160, upgradePow:(lv)=>18+lv*6 },
    // projectile: fireball with explosion visual
    { id:'fireball', title:'Fireball', desc:'Fire a projectile that explodes on impact.', type:'projectile', basePower:20, cooldown:900, range:480, upgradePow:(lv)=>20+lv*6 },
    // multi_arrow spread
    { id:'multi_arrow', title:'Multi Arrow', desc:'Spread arrows in movement direction.', type:'projectile', basePower:12, cooldown:1100, range:520, upgradePow:(lv)=>12+lv*4 },
    // siphon passive: deals damage on hit and heals small — visible as particle
    { id:'siphon', title:'Siphon', desc:'On-hit heal.', type:'passive', basePower:5, cooldown:0, range:40, upgradePow:(lv)=>5+lv*2 },
    // turret (friendly) — visual bullets
    { id:'turret', title:'Turret', desc:'Place a turret that shoots at on-screen enemies.', type:'deploy', basePower:10, cooldown:5000, range:0, upgradePow:(lv)=>10+lv*4 },
    // homing mine — visible seeker
    { id:'homing_mine', title:'Homing Mine', desc:'Spawn a homing mine that seeks enemies.', type:'deploy', basePower:14, cooldown:4000, range:0, upgradePow:(lv)=>14+lv*6 },
    // cone: visible cone shock but nerfed damage
    { id:'shockwave', title:'Shockwave', desc:'Cone shock forward.', type:'cone', basePower:12, cooldown:2500, range:220, upgradePow:(lv)=>12+lv*5 },
  // (removed poison_trail and frost_aura — deprecated)
    // shield visible
    { id:'shield', title:'Shield', desc:'Temporary damage reduction.', type:'active', basePower:0.3, cooldown:8000, range:0, upgradePow:(lv)=>0.3+lv*0.06 },
    // time slow visible aoe
    { id:'time_slown', title:'Time Slow', desc:'Slow enemies in visible radius.', type:'aoe', basePower:0.45, cooldown:10000, range:260, upgradePow:(lv)=>0.45+lv*0.05 },

    // auto special (only hit on-screen)
    { id:'auto_laser', title:'Auto Laser', desc:'Auto-aim laser at nearest on-screen enemy).', type:'auto', basePower:18, cooldown:1400, range:700, upgradePow:(lv)=>18+lv*6 },
    { id:'anvil_drop', title:'Anvil Drop', desc:'Drop an anvil on a enemy.', type:'auto', basePower:36, cooldown:7000, range:700, upgradePow:(lv)=>36+lv*12 },

    // extra projectile/area abilities (visible)
    { id:'poison_bomb', title:'Poison Bomb', desc:'Throws a bomb that spawns a poison patch.', type:'projectile', basePower:10, cooldown:2600, range:420, upgradePow:(lv)=>10+lv*3 },
  // orbital removed (duplicate / deprecated)
    { id:'chain_lightning', title:'Chain Lightning', desc:'Strikes an enemy and chains to nearby enemies.', type:'projectile', basePower:16, cooldown:3200, range:540, upgradePow:(lv)=>16+lv*5 },
    { id:'meteor', title:'Meteor', desc:'Calls down a meteor that deals huge explosion (long cooldown).', type:'projectile', basePower:60, cooldown:14000, range:900, upgradePow:(lv)=>60+lv*24 }
  ];
  ABILITIES.forEach(a=> abilityDefs[a.id]=a);

  // --- utilities ---
  function randRange(a,b){ return a + Math.random()*(b-a); }
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function dist(ax,ay,bx,by){ const dx=ax-bx, dy=ay-by; return Math.hypot(dx,dy); }
  function choose(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
  function onScreen(x,y){
    return x >= camera.x - 16 && x <= camera.x + VIEW_W + 16 && y >= camera.y - 16 && y <= camera.y + VIEW_H + 16;
  }

  // --- Player ---
  class Player {
    constructor(x,y){
      this.x=x; this.y=y; this.r=18;
      this.hp=120; this.maxHp=120;
      this.xp=0; this.level=1;
      this.nextXp = 50;
      this.abilities = [];
      this.moveSpeed = 180;
      this.shieldUntil = 0;
      this.alive = true;
      this.lastAuto = {};
      this.lastDir = { x:1, y:0 };
      this.trailPoints = [];
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
      // trailPoints reserved for visual movement trail (no passive poison trail support)
      this.trailPoints = [];
    }
    triggerAuto(id){
      const def = abilityDefs[id];
      const lvl = this.abilityLevel(id);
      const power = def.upgradePow ? def.upgradePow(lvl-1) : def.basePower;
      if(id === 'blade_spin'){
        blades.push({ t: performance.now(), dur: 700, power, spins: 6 + lvl*2 });
      } else if(id === 'auto_laser'){
        const target = enemies.filter(e=>e.alive && !e.friendly && onScreen(e.x,e.y)).sort((a,b)=>dist(this.x,this.y,a.x,a.y)-dist(this.x,this.y,b.x,b.y))[0];
        if(target) {
          beams.push({ x1:this.x, y1:this.y, x2:target.x, y2:target.y, t:performance.now(), dur:220, power });
          target.takeDamage(power);
          // small knockback from laser
          const dx = target.x - this.x, dy = target.y - this.y, m=Math.hypot(dx,dy)||1;
          target.vx = (target.vx||0) + (dx/m)*20;
          target.vy = (target.vy||0) + (dy/m)*20;
        }
      } else if(id === 'anvil_drop'){
        const pool = enemies.filter(e=>e.alive && !e.friendly && onScreen(e.x,e.y));
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
        this.nextXp = Math.floor(50 * Math.pow(1.28, this.level-1)); // easier leveling
        queueLevelUp();
      }
    }
    tryUseAbility(id, dx, dy){
      const def = abilityDefs[id]; if(!def) return false;
      const slot = this.abilities.find(a=>a.id===id); if(!slot) return false;
      if(slot.cd>0) return false;
      slot.lastUsed = performance.now();
        // effective cooldown decreases with ability level (upgrades reduce cooldown)
        slot.cd = def.cooldown ? Math.max(0, Math.round(def.cooldown * Math.pow(0.85, slot.lvl - 1))) : 0;
      const lvl = slot.lvl;
      const power = def.upgradePow ? def.upgradePow(lvl-1) : def.basePower;

      // resolve direction: prefer argument, fall back to lastDir
      const dirx = (typeof dx === 'number') ? dx : this.lastDir.x;
      const diry = (typeof dy === 'number') ? dy : this.lastDir.y;
      const mag = Math.hypot(dirx, diry) || 1;

      if(def.type==='melee' || def.type==='aura'){
        // reduced melee power; visible blades already handled by auto/melee combining to blades
        blades.push({ t:performance.now(), dur:520, power, spins: 4 + lvl });
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= (def.range||72)){
          e.takeDamage(power);
          // knockback small
          const dx2 = e.x - this.x, dy2 = e.y - this.y, m2 = Math.hypot(dx2,dy2)||1;
          e.vx = (e.vx||0) + (dx2/m2)*28;
          e.vy = (e.vy||0) + (dy2/m2)*28;
        }
        return true;
      }
      if(def.type==='dash'){
        const nx = (dirx/mag), ny = (diry/mag);
        const targetX = this.x + nx*def.range, targetY = this.y + ny*def.range;
        // visible streak
        particles.push({ x:this.x + nx*(this.r+6), y:this.y + ny*(this.r+6), t:performance.now(), dur:420, col:'#ffd8a0' });
        this.x = clamp(targetX, this.r, MAP_W - this.r);
        this.y = clamp(targetY, this.r, MAP_H - this.r);
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= this.r + e.r + 8){
          e.takeDamage(power);
          // strong knockback
          const dx2=e.x-this.x, dy2=e.y-this.y, m2=Math.hypot(dx2,dy2)||1;
          e.vx=(e.vx||0)+(dx2/m2)*60; e.vy=(e.vy||0)+(dy2/m2)*60;
        }
        return true;
      }
      if(def.type==='projectile'){
        if(id === 'multi_arrow'){
          // number of arrows scales with level
          const spread = 3 + Math.max(0, lvl-1);
          for(let i=0;i<spread;i++){
            const a = (i - Math.floor(spread/2)) * 0.12;
            const ang = Math.atan2(diry,dirx) + a;
            const nx = Math.cos(ang), ny = Math.sin(ang);
            projectiles.push(new Projectile(this.x + nx*(this.r+8), this.y + ny*(this.r+8), nx*420, ny*420, power, 6, 'player', def.range, { type:'arrow' }));
          }
        } else if(id === 'poison_bomb'){
          const nx = dirx/mag, ny = diry/mag;
          projectiles.push(new Projectile(this.x + nx*(this.r+8), this.y + ny*(this.r+8), nx*300, ny*300, power, 8, 'player', def.range, {
            onExpire: (px,py)=> {
              beams.push({ x1:px, y1:py, aoe:true, range:80, t:performance.now(), dur:260, power: power*0.6, poison:true });
              poisonTrails.push({ x:px, y:py, r:80, t:performance.now(), dur:4500, power:power*0.5 });
            },
            visual:'poison'
          }));
        } else if(id === 'chain_lightning'){
          const nx = dirx/mag, ny = diry/mag;
          const chains = 1 + Math.floor((lvl-1)/2) + 1; // more chains with levels
          projectiles.push(new Projectile(this.x + nx*(this.r+8), this.y + ny*(this.r+8), nx*420, ny*420, power, 6, 'player', def.range, {
            onHit: (enemy)=>{
              // chain arcs: create beams from hit to nearest other enemies
              const targets = enemies.filter(e=>e.alive && !e.friendly && e !== enemy).sort((a,b)=>dist(enemy.x,enemy.y,a.x,a.y)-dist(enemy.x,enemy.y,b.x,b.y)).slice(0, Math.max(1, chains));
              let last = enemy;
              targets.forEach(tg=>{
                beams.push({ x1:last.x, y1:last.y, x2:tg.x, y2:tg.y, t:performance.now(), dur:220, power: power*0.7 });
                tg.takeDamage(power*0.7);
                last = tg;
              });
            },
            visual:'spark'
          }));
        } else if(id === 'meteor'){
          const nx = dirx/mag, ny = diry/mag;
          // meteor: spawn falling marker then impact after short delay
          const tx = this.x + nx * Math.min(def.range, 420);
          const ty = this.y + ny * Math.min(def.range, 420);
          // visible telegraph
          beams.push({ x1:tx, y1:ty, aoe:true, range:80, t:performance.now(), dur:800, power:0, meteor:true });
          setTimeout(()=> {
            // impact
            beams.push({ x1:tx, y1:ty, aoe:true, range:140, t:performance.now(), dur:420, power });
            for(const e of enemies) if(e.alive && !e.friendly && dist(tx,ty,e.x,e.y) <= 140){ e.takeDamage(power); e.vx=(e.x-tx)/Math.max(1,dist(tx,ty,e.x,e.y))*80; e.vy=(e.y-ty)/Math.max(1,dist(tx,ty,e.x,e.y))*80; }
            particles.push({ x:tx, y:ty, t:performance.now(), dur:900, col:'#ffb86b' });
          }, 700);
        } else {
          // default projectile (fireball)
          const nx = dirx/mag, ny = diry/mag;
          projectiles.push(new Projectile(this.x + nx*(this.r+8), this.y + ny*(this.r+8), nx*420, ny*420, power, 7, 'player', def.range, {
            onHit: (enemy)=>{
              // explosion visual + small AoE
              beams.push({ x1:enemy.x, y1:enemy.y, aoe:true, range:42, t:performance.now(), dur:260, power: power*0.6 });
              for(const e of enemies) if(e.alive && !e.friendly && dist(enemy.x,enemy.y,e.x,e.y)<=42){ e.takeDamage(power*0.35); e.vx=(e.x-enemy.x)/Math.max(1,dist(enemy.x,enemy.y,e.x,e.y))*26; e.vy=(e.y-enemy.y)/Math.max(1,dist(enemy.x,enemy.y,e.x,e.y))*26; }
            },
            visual:'fire'
          }));
        }
        return true;
      }
      if(def.type==='deploy'){
        if(id === 'turret'){
          const t = new Turret(this.x + 20, this.y, power, 7000 + lvl*1500); t.friendly = true; enemies.push(t);
        } else if(id === 'homing_mine'){
          enemies.push(new HomingMine(this.x + randRange(-18,18), this.y + randRange(-18,18), power, 7000 + lvl*1000));
        }
        return true;
      }
      if(def.type==='cone'){
        beams.push({ x1:this.x, y1:this.y, angle: Math.atan2(diry,dirx), cone:true, dur:260, t:performance.now(), power, range:def.range });
        const angleCenter = Math.atan2(diry,dirx);
        const coneSize = Math.PI/3;
        for(const e of enemies) if(e.alive && !e.friendly){
          const dx2 = e.x - this.x, dy2 = e.y - this.y, d = Math.hypot(dx2,dy2);
          if(d > def.range) continue;
          const a = Math.atan2(dy2,dx2); let diff = Math.abs(((a-angleCenter+Math.PI)%(Math.PI*2))-Math.PI);
          if(diff < coneSize/2){ e.takeDamage(power); e.vx=(e.x-this.x)/Math.max(1,d)*30; e.vy=(e.y-this.y)/Math.max(1,d)*30; }
        }
        return true;
      }
      if(def.type==='active'){
        this.shieldUntil = performance.now() + 2000 + lvl*600;
        return true;
      }
      if(def.type==='aoe'){
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= def.range){ e.applySlow(0.45, 2000 + lvl*200); e.takeDamage(power*0.6); e.vx=(e.x-this.x)/Math.max(1,dist(this.x,this.y,e.x,e.y))*18; e.vy=(e.y-this.y)/Math.max(1,dist(this.x,this.y,e.x,e.y))*18; }
        beams.push({ x1:this.x, y1:this.y, aoe:true, range:def.range, t:performance.now(), dur:320, power });
        return true;
      }
      return false;
    }
  }

  // --- Enemy, Turret, Projectile, Orb, HomingMine, Boss, Necromancer ---
  class Enemy {
    constructor(x,y,hp=40,speed=40,r=14,type='zombie',melee=true,xpValue=10){
      this.x=x; this.y=y; this.hp=hp; this.maxHp=hp; this.speed=speed; this.r=r; this.type=type; this.melee=melee;
      this.alive=true; this.slowUntil=0; this.slowFactor=1; this.tickAcc=0; this.friendly=false; this.xpValue = xpValue;
      this.vx = 0; this.vy = 0; // for knockback
    }
    takeDamage(d){
      this.hp -= d;
      particles.push({ x:this.x, y:this.y, t:performance.now(), dur:520, col:'#ff6b6b' });
      if(this.hp<=0) this.die();
    }
    die(){
      if(!this.alive) return;
      this.alive=false;
      score += Math.round(this.xpValue);
      const orbsCount = Math.max(1, Math.floor(this.xpValue/6));
      for(let i=0;i<orbsCount;i++) orbs.push(new Orb(this.x + randRange(-10,10), this.y + randRange(-10,10), randRange(6,16), 'xp'));
      // nerfed heal chance
      if(Math.random() < 0.08) orbs.push(new Orb(this.x + randRange(-8,8), this.y + randRange(-8,8), randRange(12,30), 'heal'));
    }
    applySlow(factor, ms){ this.slowFactor = factor; this.slowUntil = performance.now() + ms; }
    update(dt){
      if(!player || !player.alive) return;
      if(this.friendly) {
        if(this.updateFriendly) this.updateFriendly(dt);
        // friendly can still have vx vy applied
        this.applyVelocity(dt);
        return;
      }
      if(performance.now() > this.slowUntil) this.slowFactor = 1;
      const sx = player.x - this.x, sy = player.y - this.y; const d = Math.hypot(sx,sy);
      if(d > 1){
        const spd = this.speed * (this.slowFactor || 1);
        this.x += (sx/d) * spd * dt/1000;
        this.y += (sy/d) * spd * dt/1000;
      }
      // apply knockback velocity
      this.applyVelocity(dt);

      this.x = clamp(this.x, 0, MAP_W); this.y = clamp(this.y, 0, MAP_H);

      if(this.melee && d <= this.r + player.r + 4){
        if(this.tickAcc <= 0){
          player.takeDamage(Math.max(3, this.maxHp*0.06));
          this.tickAcc = 750;
        }
      }
      if(this.tickAcc > 0) this.tickAcc = Math.max(0, this.tickAcc - dt);
    }
    applyVelocity(dt){
      // simple damping
      this.x += this.vx * dt/1000;
      this.y += this.vy * dt/1000;
      this.vx *= Math.pow(0.2, dt/1000); // quickly damp
      this.vy *= Math.pow(0.2, dt/1000);
    }
    draw(ctx, cam){
      if(!this.alive) return;
      const x = this.x - cam.x, y = this.y - cam.y;
      ctx.save(); ctx.translate(x,y);
      // style by type
      if(this.type==='skeleton'){ ctx.fillStyle = '#dfe8e9'; }
      else if(this.type==='demon'){ ctx.fillStyle = '#b14a4a'; }
      else if(this.type==='brute'){ ctx.fillStyle = '#7b3a3a'; }
      else if(this.type==='wolf'){ ctx.fillStyle = '#88aacc'; }
      else if(this.type==='mini'){ ctx.fillStyle = '#ffc968'; }
      else if(this.type==='boss'){ ctx.fillStyle = '#ff6b6b'; }
      else if(this.type==='necromancer'){ ctx.fillStyle = '#9a6bd1'; }
      else ctx.fillStyle = '#6b8b6b';
      ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      // hp bar
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(-this.r, -this.r-8, this.r*2, 5);
      ctx.fillStyle = '#ff8d4d'; ctx.fillRect(-this.r, -this.r-8, (this.hp/this.maxHp)*this.r*2, 5);
      ctx.restore();
    }
  }

  class Necromancer extends Enemy {
    constructor(x,y,lvl){
      super(x,y, 70 + lvl*18, 16 + lvl*1.2, 14, 'necromancer', false, 36 + lvl*4);
      this.summonAcc = 2200 - lvl*60;
    }
    update(dt){
      Enemy.prototype.update.call(this,dt);
      this.summonAcc -= dt;
      if(this.summonAcc <= 0){
        this.summonAcc = 2200 + Math.random()*700;
        // summon a skeleton nearby (only if on-screen so not unfair)
        if(onScreen(this.x,this.y)){
          const s = new Enemy(this.x + randRange(-30,30), this.y + randRange(-30,30), 26 + this.xpValue/2, 40, 10, 'skeleton', false, 8 + Math.floor(this.xpValue/3));
          enemies.push(s);
          particles.push({ x:this.x, y:this.y, t:performance.now(), dur:520, col:'#9b8cff' });
        }
      }
    }
  }

  class Boss extends Enemy {
    constructor(x,y,lvl){
      super(x,y, 900 + (lvl-5)*200, 0, 42, 'boss', true, 400 + lvl*30);
      this.dashAcc = 3000 - lvl*120;
      this.phase = 0;
    }
    update(dt){
      // boss chases slowly but occasionally performs fast dash
      const px = player.x - this.x, py = player.y - this.y, d=Math.hypot(px,py)||1;
      if(this.dashAcc <= 0){
        this.dashAcc = 2800 + Math.random()*1400;
        // dash towards player with big stun/damage
        const nx = px/d, ny = py/d;
        this.vx += nx * 420;
        this.vy += ny * 420;
        // damage nearby on impact after short delay
        setTimeout(()=>{
          for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) < 120) e.takeDamage(90);
          if(dist(this.x,this.y,player.x,player.y) < 120) player.takeDamage(80);
          particles.push({ x:this.x, y:this.y, t:performance.now(), dur:900, col:'#ff9b6b' });
        }, 300);
      }
      this.dashAcc -= dt;
      Enemy.prototype.applyVelocity.call(this, dt);
      // small passive regen so boss persists
      if(this.hp < this.maxHp && Math.random() < 0.002) this.hp += 6;
      // keep within map
      this.x = clamp(this.x, 0, MAP_W); this.y = clamp(this.y, 0, MAP_H);
    }
  }

  class Turret extends Enemy {
    constructor(x,y,power,lifeMs){
      super(x,y, 40, 0, 12, 'turret', false, 8);
      this.power=power; this.expireAt=performance.now()+lifeMs; this.shootAcc=0; this.friendly=true;
    }
    update(dt){
      if(performance.now() > this.expireAt){ this.alive=false; return; }
      this.shootAcc -= dt;
      if(this.shootAcc <= 0){
        this.shootAcc = 700;
        let target=null, td=Infinity;
        for(const e of enemies) if(e.alive && !e.friendly && onScreen(e.x,e.y)){ const d=dist(this.x,this.y,e.x,e.y); if(d<td){td=d;target=e;} }
        if(target){
          const enemyProjCount = projectiles.filter(p=>p.owner === 'enemy').length;
          if(enemyProjCount < ENEMY_PROJECTILE_CAP){
            const dx = target.x - this.x, dy = target.y - this.y, m = Math.hypot(dx,dy)||1;
            projectiles.push(new Projectile(this.x, this.y, dx/m*220, dy/m*220, this.power, 6, 'enemy', 420));
          }
        }
      }
      Enemy.prototype.applyVelocity.call(this, dt);
    }
  }

  class HomingMine extends Enemy {
    constructor(x,y,power,lifeMs){
      super(x,y, 24, 30, 10, 'mine', false, 10);
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
      Enemy.prototype.applyVelocity.call(this, dt);
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
    constructor(x,y,vx,vy,power,r,owner,range=600,opt={}){
      this.x=x; this.y=y; this.vx=vx; this.vy=vy; this.power=power; this.r=r; this.owner=owner; this.range=range;
      this.life = Math.max(200, range / Math.hypot(vx,vy) * 1000);
      this.alive=true; this.trail=[]; this.opt = opt;
    }
    update(dt){
      if(!this.alive) return;
      this.x += this.vx * dt/1000; this.y += this.vy * dt/1000;
      this.trail.push({x:this.x, y:this.y, t:performance.now()});
      while(this.trail.length>14) this.trail.shift();
      this.life -= dt;
      if(this.life<=0){
        this.alive=false;
        if(this.opt.onExpire) this.opt.onExpire(this.x, this.y);
      }
      if(this.owner === 'player'){
        for(const e of enemies) if(e.alive && !e.friendly && dist(this.x,this.y,e.x,e.y) <= e.r + this.r){
          // apply damage and visual/hit callbacks
          e.takeDamage(this.power);
          if(this.opt.onHit) this.opt.onHit(e);
          // siphon: heal player a small fraction on hit
          try{ if(window && window.Day5Game && typeof window.Day5Game.playerRef === 'function'){ const pl = window.Day5Game.playerRef(); if(pl && pl.hasAbility && pl.hasAbility('siphon')) pl.heal(Math.max(1, Math.floor(this.power * 0.12))); } }catch(ex){}
          // knockback from projectile
          const nx = (e.x - this.x) || 1, ny = (e.y - this.y) || 1, m = Math.hypot(nx,ny)||1;
          e.vx = (e.vx||0) + (nx/m) * Math.min(140, this.power*4);
          e.vy = (e.vy||0) + (ny/m) * Math.min(140, this.power*4);
          this.alive=false; break;
        }
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
        const p=this.trail[i]; const alpha = (i+1)/this.trail.length * 0.55;
        ctx.fillStyle = this.owner==='player' ? `rgba(255,216,77,${alpha})` : `rgba(240,128,128,${alpha})`;
        ctx.beginPath(); ctx.arc(p.x-cam.x,p.y-cam.y, Math.max(1, this.r * i/this.trail.length),0,Math.PI*2); ctx.fill();
      }
      // visual by opt type
      if(this.opt.type === 'arrow'){
        ctx.fillStyle = '#c9f2ff'; ctx.beginPath(); ctx.ellipse(0,0,this.r*1.2,this.r*0.6, Math.atan2(this.vy,this.vx),0,Math.PI*2); ctx.fill();
      } else if(this.opt.visual === 'poison'){
        ctx.fillStyle = '#6fbf6b'; ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      } else if(this.opt.visual === 'spark'){
        ctx.fillStyle = '#f2f9ff'; ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle = this.owner==='player' ? '#ffd84d' : '#f08080';
        ctx.beginPath(); ctx.arc(0,0,this.r,0,Math.PI*2); ctx.fill();
      }
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

  // --- spawns: scale by player.level and unlock types by level ---
  function findSpawnPoint(minDist, maxDist){
    const cx = player.x, cy = player.y;
    const maxAttempts = 24;
    for(let i=0;i<maxAttempts;i++){
      const ang = Math.random()*Math.PI*2;
      const rad = randRange(minDist, maxDist);
      const sx = clamp(cx + Math.cos(ang)*rad, 0, MAP_W);
      const sy = clamp(cy + Math.sin(ang)*rad, 0, MAP_H);
      // ensure not inside visible viewport (+margin)
      const margin = 48;
      if(sx < camera.x - margin || sx > camera.x + VIEW_W + margin || sy < camera.y - margin || sy > camera.y + VIEW_H + margin) return {sx, sy};
    }
    // fallback: place just outside viewport
    return { sx: clamp(player.x + (VIEW_W/2 + 80), 0, MAP_W), sy: clamp(player.y + (VIEW_H/2 + 80), 0, MAP_H) };
  }

  function spawnInitialWave(){
    // early game: only 2-3 normal zombies, outside visible area
    const count = 2 + Math.floor(Math.random()*2); // 2 or 3
    const minDist = Math.max(VIEW_W, VIEW_H)/2 + 60;
    const maxDist = minDist + 180;
    for(let i=0;i<count;i++){
      const pt = findSpawnPoint(minDist, maxDist);
      enemies.push(new Enemy(pt.sx, pt.sy, 28 + 1*6, 28 + 1*1.5, 16, 'zombie', true, 14 + 1*2));
    }
  }

  function spawnEnemyWave(dt){
    if(!player) return;
    spawnTimer -= dt;
    if(spawnTimer > 0) return;
    // dynamic cap of enemies based on level
    const lvl = Math.max(1, player.level);
    const maxEnemies = Math.max(3, Math.min(28, 3 + Math.floor(lvl * 1.2)));
    if(enemies.length >= maxEnemies) { spawnTimer = 300; return; }

    // set next timer scaled by level
    spawnTimer = clamp(600 + Math.max(0, 1600 - player.level*60), 180, 3200);

    // early game should remain mild
    if(lvl <= 1){
      // only spawn small zombies occasionally (1 at a time)
      const pt = findSpawnPoint(Math.max(VIEW_W, VIEW_H)/2 + 60, Math.max(VIEW_W, VIEW_H)/2 + 180);
      enemies.push(new Enemy(pt.sx, pt.sy, 28 + lvl*5, 28 + lvl*1.5, 16, 'zombie', true, 14 + lvl*2));
      return;
    }

    // normal spawn group scales with level
    const count = Math.min(1 + Math.floor(1 + lvl/3), 8);
    for(let i=0;i<count && enemies.length < maxEnemies;i++){
      const pt = findSpawnPoint( Math.max(VIEW_W, VIEW_H)/2 + 60, Math.max(VIEW_W, VIEW_H)/2 + 380 );
      const r = Math.random();
      if(lvl >= 10 && Math.random() < 0.02){ enemies.push(new Boss(pt.sx,pt.sy,lvl)); continue; }
      if(lvl >= 6 && Math.random() < 0.04){ enemies.push(new Necromancer(pt.sx,pt.sy,lvl)); continue; }
      if(lvl >=5 && Math.random() < 0.03){ enemies.push(new Enemy(pt.sx,pt.sy, 120 + lvl*30, 22, 26, 'mini', true, 100 + lvl*10)); continue; }

      if(r < 0.2){ enemies.push(new Enemy(pt.sx,pt.sy, 30 + lvl*6, 30 + lvl*1.2, 14, 'zombie', true, 12 + lvl*2)); }
      else if(r < 0.45){ enemies.push(new Enemy(pt.sx,pt.sy, 28 + lvl*6, 36, 12, 'skeleton', false, 18 + lvl*3)); }
      else if(r < 0.7){ enemies.push(new Enemy(pt.sx,pt.sy, 60 + lvl*10, 22 + lvl*1.2, 28, 'brute', true, 40 + lvl*6)); }
      else { enemies.push(new Enemy(pt.sx,pt.sy, 24 + lvl*5, 86 + lvl*4, 10, 'demon', true, 18 + lvl*3)); }
    }
  }

  // --- camera centering ---
  function updateCamera(){
    camera.w = VIEW_W; camera.h = VIEW_H;
    let cx = player.x - camera.w/2; let cy = player.y - camera.h/2;
    cx = clamp(cx, 0, MAP_W - camera.w); cy = clamp(cy, 0, MAP_H - camera.h);
    camera.x = cx; camera.y = cy;
  }

  // --- input ---
  window.addEventListener('keydown', e=> { keys[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', e=> { keys[e.key.toLowerCase()] = false; });

  // space / click bindings: allow player to activate a primary ability with Space or click to fire projectiles
  window.addEventListener('keydown', (e)=>{
    if(e.code === 'Space'){ e.preventDefault();
      if(!player) return;
      // prioritize dash, then melee, then projectile, then active
      if(player.hasAbility('dash_strike')) player.tryUseAbility('dash_strike');
      else {
        // try first available damaging ability
        const pref = player.abilities.find(a=>{ const d=abilityDefs[a.id]; return d && ['melee','projectile','cone','auto','dash','aoe'].includes(d.type); });
        if(pref) player.tryUseAbility(pref.id);
      }
    }
  });

  if(canvas){
    canvas.addEventListener('pointerdown', (ev)=>{
      if(!player) return;
      const rect = canvas.getBoundingClientRect();
      const sx = (ev.clientX - rect.left) * (VIEW_W / rect.width) + camera.x;
      const sy = (ev.clientY - rect.top) * (VIEW_H / rect.height) + camera.y;
      const dx = sx - player.x, dy = sy - player.y; const m = Math.hypot(dx,dy)||1;
      // Prefer projectile abilities on click
      const proj = player.abilities.find(a=>{ const d=abilityDefs[a.id]; return d && d.type==='projectile'; });
      if(proj) player.tryUseAbility(proj.id, dx/m, dy/m);
      else if(player.hasAbility('dash_strike')) player.tryUseAbility('dash_strike', dx/m, dy/m);
    });
  }

  function getMoveDir(){
    let x=0,y=0;
    if(keys['w']||keys['arrowup']||keys['i']) y -= 1;
    if(keys['s']||keys['arrowdown']||keys['k']) y += 1;
    if(keys['a']||keys['arrowleft']||keys['j']) x -= 1;
    if(keys['d']||keys['arrowright']||keys['l']) x += 1;
    const m = Math.hypot(x,y); if(m>0) return {x:x/m,y:y/m}; return null;
  }

  // --- level up UI & choices (no duplicates) ---
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
    const used = new Set();
    const candidates = [];
    // upgrades first
    for(const a of player.abilities) candidates.push({ id:a.id, title:abilityDefs[a.id].title + ' (Upgrade)', desc:abilityDefs[a.id].desc, upgrade:true });
    // new ability candidates
    ABILITIES.forEach(a=> candidates.push({ id:a.id, title:a.title, desc:a.desc }));
    // shuffle
    for(let i=candidates.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [candidates[i], candidates[j]]=[candidates[j], candidates[i]]; }
    for(const c of candidates){
      if(opts.length>=3) break;
      if(used.has(c.id)) continue;
      opts.push({ id:c.id, title:c.title, desc:c.desc, extra: c.upgrade ? 'Upgrade' : (player.hasAbility(c.id) ? 'Upgrade' : 'New ability') });
      used.add(c.id);
    }
    running = false;
    presentChoices('Level Up', opts, (opt)=>{ player.addAbility(opt.id); running = true; updateHud(); });
  }

  // --- ranged enemy behaviour: skeleton shoots, only on-screen and weaker --- 
  function enemyRangedBehavior(e, dt){
    if(e.type!=='skeleton' || !e.alive) return;
    e.tickAcc = (e.tickAcc||0) - dt;
    if(e.tickAcc <= 0){
      e.tickAcc = 1800 + player.level*90;
      const dx = player.x - e.x, dy = player.y - e.y; const m = Math.hypot(dx,dy)||1;
      if(onScreen(e.x,e.y) && onScreen(player.x,player.y)){
        // limit enemy projectiles
        const enemyProjCount = projectiles.filter(p=>p.owner === 'enemy').length;
        if(enemyProjCount < ENEMY_PROJECTILE_CAP){
          // shorter range / slower for enemy projectiles
          projectiles.push(new Projectile(e.x, e.y, dx/m*160, dy/m*160, Math.max(6, 6 + Math.floor(player.level*0.5)), 5, 'enemy', 420));
        }
      }
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
    const now = performance.now();
    // blades applying reduced DPS
    for(const b of blades){
      const elapsed = now - b.t;
      if(elapsed > b.dur) continue;
      for(const e of enemies) if(e.alive && !e.friendly){
        const d = dist(player.x,player.y,e.x,e.y);
        if(d <= (b.spins/6)*42){
          // nerfed melee: lower DPS multiplier
          const dmg = b.power * dt/1000 * 8;
          e.takeDamage(dmg);
          // siphon (on-hit heal) — small percent of damage
          if(player && player.hasAbility && player.hasAbility('siphon')){
            player.heal(Math.max(1, Math.floor(dmg * 0.12)));
          }
        }
      }
    }
    blades = blades.filter(b=> now - b.t <= b.dur);

    beams = beams.filter(b => now - b.t <= (b.dur||220));

    for(const a of anvils){
      if(a.hit) continue;
      a.vy += 1200 * dt/1000;
      a.y += a.vy * dt/1000;
      if(a.y >= a.ty){
        for(const e of enemies) if(e.alive && !e.friendly && dist(a.tx,a.ty,e.x,e.y) < 36) { e.takeDamage(a.power); e.vx=(e.x-a.tx)/Math.max(1,dist(a.tx,a.ty,e.x,e.y))*60; e.vy=(e.y-a.ty)/Math.max(1,dist(a.tx,a.ty,e.x,e.y))*60; }
        a.hit = true;
        particles.push({ x:a.tx, y:a.ty, t:performance.now(), dur:700, col:'#ffb86b' });
      }
    }
    anvils = anvils.filter(a => !a.hit || (now - a.t < 600));

    for(const p of poisonTrails){
      const elapsed = now - p.t;
      if(elapsed > p.dur) continue;
      for(const e of enemies) if(e.alive && !e.friendly && dist(p.x,p.y,e.x,e.y) <= p.r) e.takeDamage(p.power * dt/1000);
    }
    poisonTrails = poisonTrails.filter(p => now - p.t <= p.dur);

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
      player.lastDir = dir;
      // no passive trails (deprecated)
    }

    player.tick(dt);

    // passives: (poison_trail and frost_aura removed)

    // directional abilities use lastDir when stopped and will fire with cooldowns
    for(const a of player.abilities){
      const def = abilityDefs[a.id]; if(!def) continue;
      if(['projectile','cone','dash','deploy','aoe','active','melee'].includes(def.type)){
        const useDir = dir ? {x:dir.x,y:dir.y} : {x:player.lastDir.x, y:player.lastDir.y};
        // projectiles and cone are allowed to auto-trigger when cd available (player desires auto)
        if(def.type === 'projectile' || def.type === 'cone' || def.type === 'dash'){
          player.tryUseAbility(a.id, useDir.x, useDir.y);
        }
      }
    }

    // update enemies & special behaviors
    for(const e of enemies) if(e.alive){
      if(e.type === 'skeleton') enemyRangedBehavior(e, dt);
      e.update(dt);
    }
    enemies = enemies.filter(e=>e.alive);

    // projectiles
    for(const p of projectiles) p.update(dt);
    projectiles = projectiles.filter(p=>p.alive);

    for(const o of orbs) o.update(dt);

    pickupOrbs();

    spawnEnemyWave(dt);

    updateEffects(dt);

    updateCamera();
    updateHud();
  }

  // --- draw: background tilemap + entities + effects + player health bar ---
  function drawBackground(){
    const tile = 64;
    const camX = camera.x, camY = camera.y;
    ctx.save();
    for(let y = Math.floor(camY/tile)-1; y <= Math.floor((camY+VIEW_H)/tile)+1; y++){
      for(let x = Math.floor(camX/tile)-1; x <= Math.floor((camX+VIEW_W)/tile)+1; x++){
        const px = x*tile - camX, py = y*tile - camY;
        const shade = ((x + y) % 2 === 0) ? '#0b1a1e' : '#081316';
        ctx.fillStyle = shade;
        ctx.fillRect(px, py, tile, tile);
        ctx.strokeStyle = 'rgba(255,255,255,0.02)';
        ctx.strokeRect(px+1, py+1, tile-2, tile-2);
      }
    }
    ctx.restore();
    ctx.save();
    ctx.strokeStyle = 'rgba(255,107,53,0.03)';
    ctx.lineWidth = 6;
    ctx.strokeRect(-camX, -camY, MAP_W, MAP_H);
    ctx.restore();
  }

  function draw(){
    ctx.fillStyle = '#041018';
    ctx.fillRect(0,0,VIEW_W,VIEW_H);

    drawBackground();

    for(const o of orbs) o.draw(ctx, camera);

    for(const b of beams){
      const age = performance.now() - b.t; const a = 1 - age/(b.dur||220);
      if(a <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a*0.95;
      if(b.meteor){
        ctx.fillStyle = 'rgba(255,120,60,0.12)'; ctx.beginPath(); ctx.arc(b.x1 - camera.x, b.y1 - camera.y, b.range || 80, 0, Math.PI*2); ctx.fill();
      } else if(b.aoe){
        ctx.fillStyle = 'rgba(120,200,255,0.12)'; ctx.beginPath(); ctx.arc(b.x1 - camera.x, b.y1 - camera.y, b.range || 80, 0, Math.PI*2); ctx.fill();
      } else if(b.cone){
        ctx.fillStyle = 'rgba(255,180,110,0.12)'; ctx.beginPath();
        ctx.moveTo(b.x1-camera.x, b.y1-camera.y);
        const ang = b.angle;
        const r = b.range || 180;
        ctx.arc(b.x1-camera.x, b.y1-camera.y, r, ang - 0.7, ang + 0.7);
        ctx.closePath(); ctx.fill();
      } else {
        ctx.strokeStyle = 'rgba(255,220,80,0.95)'; ctx.lineWidth = 3;
        ctx.shadowBlur = 14; ctx.shadowColor = 'rgba(255,200,80,0.6)';
        ctx.beginPath(); ctx.moveTo(b.x1-camera.x, b.y1-camera.y); ctx.lineTo((b.x2||b.tx)-camera.x, (b.y2||b.ty)-camera.y); ctx.stroke();
        ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
      }
      ctx.restore();
    }

    for(const a of anvils) {
      ctx.save();
      const x = a.x - camera.x, y = a.y - camera.y;
      ctx.translate(x,y);
      ctx.fillStyle = '#5a4c3a';
      ctx.fillRect(-14, -10, 28, 20);
      ctx.restore();
    }

    for(const e of enemies) e.draw(ctx, camera);

    for(const p of projectiles) p.draw(ctx, camera);

    if(player && player.trailPoints && player.trailPoints.length){
      for(let i=0;i<player.trailPoints.length;i++){
        const t = player.trailPoints[i]; const age = performance.now() - t.t;
        const alpha = 1 - (age/1200);
        if(alpha <= 0) continue;
        ctx.save(); ctx.globalAlpha = alpha*0.6; ctx.fillStyle = '#7fbf3f';
        ctx.beginPath(); ctx.arc(t.x - camera.x, t.y - camera.y, 6, 0, Math.PI*2); ctx.fill(); ctx.restore();
      }
    }

    if(player && player.alive){
      const px = player.x - camera.x, py = player.y - camera.y;
      ctx.save(); ctx.translate(px,py);
      ctx.fillStyle = '#7fbfff'; ctx.beginPath(); ctx.arc(0,0,player.r,0,Math.PI*2); ctx.fill();
      if(player.shieldUntil > performance.now()){
        ctx.strokeStyle = 'rgba(130,200,255,0.6)'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0,0,player.r+8,0,Math.PI*2); ctx.stroke();
      }
      const barW = 72; const barH = 8;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(-barW/2, -player.r - 22, barW, barH);
      ctx.fillStyle = '#ff6b6b'; ctx.fillRect(-barW/2, -player.r - 22, barW * (player.hp/player.maxHp), barH);
      ctx.strokeStyle = '#00000055'; ctx.lineWidth = 1; ctx.strokeRect(-barW/2, -player.r - 22, barW, barH);
      ctx.restore();
    }

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

    for(const p of particles){
      const age = performance.now()-p.t; const a = 1 - age/p.dur;
      if(a<=0) continue;
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = p.col || '#fff';
      ctx.fillRect(p.x - camera.x - 2, p.y - camera.y - 2, 4, 4); ctx.restore();
    }

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
    // show XP instead of health in small HUD (per request)
    hpText.textContent = `XP: ${Math.round(player.xp)} / ${player.nextXp}`;
    xpFill.style.width = `${Math.min(100, Math.floor(player.xp / player.nextXp * 100))}%`;
    lvlText.textContent = player.level;
    // hide pill list to reduce clutter (showing only on level-up overlay)
    if(abilityPills) abilityPills.style.display = 'none';
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
    enemies = []; projectiles = []; orbs = []; blades=[]; beams=[]; anvils=[]; particles=[]; poisonTrails=[];
    score = 0; spawnTimer = 0; spawnInterval = 3800;
    player = new Player(MAP_W/2, MAP_H/2);
    player.abilities = [];
    // ensure quick initial spawn and small starting wave
    updateHud();
    updateCamera();
    spawnInitialWave();
    // next full wave delayed a bit
    spawnTimer = 900;
  }

  // starting choice: guaranteed damaging and unique
  function startGame(){
    resetGame();
    const damageCandidates = ABILITIES.filter(a => ['projectile','auto','melee','cone','aura','deploy','aoe','dash'].includes(a.type));
    const pool = damageCandidates.slice();
    const opts = [];
    while(opts.length < 3 && pool.length){
      const idx = Math.floor(Math.random()*pool.length); const a = pool.splice(idx,1)[0];
      opts.push({ id:a.id, title:a.title, desc:a.desc, extra:'Starting ability' });
    }
    presentChoices('Choose starting ability', opts, (opt)=>{ player.addAbility(opt.id); playOverlay.classList.add('hidden'); running=true; updateHud(); });
  }

  // UI wiring + leaderboard save (uses firebase objects exposed on window)
  if(playBtn) playBtn.addEventListener('click', ()=> startGame());

  // --- aspect ratio & fullscreen handling ---
  let prevPlayboundStyles = null;
  function preserveAspectFitToWindow(){
    const ratio = VIEW_W / VIEW_H;
    let ww = window.innerWidth, wh = window.innerHeight;
    let w = ww, h = Math.round(w / ratio);
    if(h > wh){ h = wh; w = Math.round(h * ratio); }
    // set canvas size to keep ratio
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    // center canvas
    if(playbound){
      playbound.style.display = 'flex';
      playbound.style.justifyContent = 'center';
      playbound.style.alignItems = 'center';
    }
  }
  async function toggleFullscreen(){
    try{
      if(!document.fullscreenElement){
        // save previous inline styles so we can restore later
        prevPlayboundStyles = {
          width: playbound.style.width || '',
          height: playbound.style.height || '',
          display: playbound.style.display || '',
          justifyContent: playbound.style.justifyContent || '',
          alignItems: playbound.style.alignItems || '',
        };
        await playbound.requestFullscreen();
        preserveAspectFitToWindow();
      } else {
        await document.exitFullscreen();
        // restore styles
        if(prevPlayboundStyles){
          playbound.style.width = prevPlayboundStyles.width;
          playbound.style.height = prevPlayboundStyles.height;
          playbound.style.display = prevPlayboundStyles.display;
          playbound.style.justifyContent = prevPlayboundStyles.justifyContent;
          playbound.style.alignItems = prevPlayboundStyles.alignItems;
        }
        // revert canvas to fill playbound while keeping aspect (resize helper)
        resizeCanvasToPlaybound();
      }
    }catch(e){}
  }
  if(fullscreenBtn && playbound) fullscreenBtn.addEventListener('click', toggleFullscreen);
  window.addEventListener('fullscreenchange', ()=>{
    // if user toggles with F11 or ESC, ensure aspect preserved or restored
    if(document.fullscreenElement){
      preserveAspectFitToWindow();
    } else {
      if(prevPlayboundStyles){
        playbound.style.width = prevPlayboundStyles.width;
        playbound.style.height = prevPlayboundStyles.height;
        playbound.style.display = prevPlayboundStyles.display;
      }
      // ensure we clear any inline canvas sizing left from fullscreen
      if(canvas){
        canvas.style.width = '';
        canvas.style.height = '';
      }
      // revert canvas to fill playbound while keeping aspect (resize helper)
      resizeCanvasToPlaybound();
    }
  });

  if(dayLeaderboardBtn && dayLeaderboardModal) dayLeaderboardBtn.addEventListener('click', ()=> {
    dayLeaderboardModal.classList.remove('hidden');
    if(window.firebaseReady){
      const db = window.firebaseDb;
      // use day5_scores collection and order by 'score' desc (same pattern as day_3)
      const col = window.firebaseCollection(db, 'day5_scores');
      const q = window.firebaseQuery(col, window.firebaseOrderBy('score', 'desc'));
      window.firebaseGetDocs(q).then(snap => {
        dayLeaderboardBody.innerHTML = '';
        let rank = 1;
        snap.forEach(docSnap => {
          const d = docSnap.data();
          // apply rank classes for top three
          const cls = rank===1 ? 'rank-1' : rank===2 ? 'rank-2' : rank===3 ? 'rank-3' : '';
          const when = d.ts ? new Date(d.ts).toLocaleString() : (d.when ? new Date(d.when).toLocaleString() : '');
          const tr = document.createElement('tr');
          tr.className = cls;
          tr.innerHTML = `<td>${rank++}</td><td>${d.playerName||d.name||'Guest'}</td><td>${d.score}</td><td>${when}</td><td>${d.withinEvent?'Yes':''}</td>`;
          dayLeaderboardBody.appendChild(tr);
        });
      }).catch(()=>{});
    }
  });
  if(dayLeaderboardClose && dayLeaderboardModal) dayLeaderboardClose.addEventListener('click', ()=> dayLeaderboardModal.classList.add('hidden'));

  if(submitScoreBtn){
    // Replace previous submission logic with the same flow from day_3 adapted to day5.
    async function submitScoreToFirestoreDocs(entry){
      try{
        if(!window.firebaseDb || !window.firebaseDoc || !window.firebaseSetDoc) return { ok:false, reason:'no-firebase' };
        const id = entry.uid ? entry.uid : `${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
        const docRef = window.firebaseDoc(window.firebaseDb, 'day5_scores', id);
        if(entry.uid && window.firebaseGetDoc){
          const existing = await window.firebaseGetDoc(docRef);
          if(existing && existing.exists && existing.exists()){
            const data = existing.data();
            if((data.score||0) < entry.score){
              await window.firebaseSetDoc(docRef, entry);
            }
          } else {
            await window.firebaseSetDoc(docRef, entry);
          }
        } else {
          await window.firebaseSetDoc(docRef, entry);
        }

        // update user's aggregated scores in users / scores.day5
        if(entry.uid && window.firebaseGetDoc && window.firebaseSetDoc){
          const userDocRef = window.firebaseDoc(window.firebaseDb, 'users', entry.uid);
          const snap = await window.firebaseGetDoc(userDocRef);
          let docData = {};
          if(snap && snap.exists && snap.exists()) docData = snap.data();
          else docData = { username: entry.playerName, email:'', createdAt:new Date(), scores:{ day1:0,day2:0,day3:0,day4:0,day5:0, total:0 } };
          docData.scores = docData.scores || {};
          docData.scores.day5 = Math.max(docData.scores.day5 || 0, entry.score);
          const s = docData.scores;
          docData.scores.total = (s.day1||0)+(s.day2||0)+(s.day3||0)+(s.day4||0)+(s.day5||0);
          await window.firebaseSetDoc(userDocRef, docData);
        }

        return { ok:true };
      } catch(err){
        console.error('save error', err);
        return { ok:false, reason: err && err.message || 'unknown' };
      }
    }

    async function handleSubmitScore(){
      if(!window.firebaseReady){ submitScoreBtn.textContent='No Firebase'; setTimeout(()=>submitScoreBtn.textContent='Save Score',900); return; }
      submitScoreBtn.disabled = true;
      submitScoreBtn.textContent = 'Saving...';
      try{
        const db = window.firebaseDb;
        const auth = window.firebaseAuth;
        const user = auth && auth.currentUser;
        let uid = user ? user.uid : null;
        let playerName = user ? (user.displayName||user.email||'Player') : 'Guest';
        const entry = { score, playerName, uid, ts: Date.now(), withinEvent: Date.now() <= GAME_END_TS };

        if(!uid){
          if(window.firebaseSignInWithPopup && window.firebaseAuth && window.googleProvider){
            try{
              const res = await window.firebaseSignInWithPopup(window.firebaseAuth, window.googleProvider);
              const u = res.user;
              uid = u.uid;
              playerName = u.displayName || (u.email ? u.email.split('@')[0] : 'User');
              entry.uid = uid; entry.playerName = playerName;
            } catch(e){
              submitScoreBtn.textContent = 'Sign-in failed';
              setTimeout(()=>{ submitScoreBtn.textContent='Save Score'; submitScoreBtn.disabled=false; }, 900);
              return;
            }
          } else {
            submitScoreBtn.textContent = 'Sign-in unavailable';
            setTimeout(()=>{ submitScoreBtn.textContent='Save Score'; submitScoreBtn.disabled=false; }, 900);
            return;
          }
        }

        const r = await submitScoreToFirestoreDocs(entry);
        if(!r.ok){
          submitScoreBtn.textContent = 'Error';
          setTimeout(()=>{ submitScoreBtn.textContent='Save Score'; submitScoreBtn.disabled=false; }, 900);
          return;
        }

        submitScoreBtn.textContent = 'Saved';
        // reset the game and immediately start a new run (per request)
        setTimeout(()=>{ gameOverModal.classList.add('hidden'); submitScoreBtn.textContent='Save Score'; submitScoreBtn.disabled=false; resetGame(); startGame(); }, 700);
      }catch(e){
        submitScoreBtn.textContent = 'Error';
        setTimeout(()=>{ submitScoreBtn.textContent='Save Score'; submitScoreBtn.disabled=false; }, 900);
      }
    }

    submitScoreBtn.addEventListener('click', handleSubmitScore);
  }

  // --- resize / background helpers (keeps aspect ratio inside playbound) ---
  function resizeCanvasToPlaybound(){
    if(!canvas || !playbound) return;
    const rect = playbound.getBoundingClientRect();
    const ratio = VIEW_W / VIEW_H;
    let maxW = rect.width, maxH = rect.height;
    let w = maxW, h = Math.round(w / ratio);
    if(h > maxH){ h = maxH; w = Math.round(h * ratio); }
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }
  window.addEventListener('resize', resizeCanvasToPlaybound);
  resizeCanvasToPlaybound();

  // init background decorations
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

  // --- end-game button (kills player) ---
  (function addEndGameButton(){
    const btn = document.createElement('button');
    btn.textContent = 'End Game';
    btn.title = 'Instantly end this run';
    btn.style.cssText = 'position:absolute;right:12px;bottom:12px;z-index:600; padding:6px 8px;border-radius:6px;background:rgba(0,0,0,0.6);color:#ffdca8;border:2px solid #ff6b35;cursor:pointer;';
    btn.addEventListener('click', ()=>{ if(player) player.takeDamage(player.hp + 9999); });
    if(playbound) playbound.appendChild(btn);
  })();

  // expose API
  window.Day5Game = { startGame, resetGame, playerRef: ()=>player, GAME_NAME: 'Midnight Crossing', GAME_END_TS };

  // kickoff
  requestAnimationFrame(loop);
  resetGame();
  updateHud();
})();
