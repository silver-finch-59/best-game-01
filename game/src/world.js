// The game's rules and state, with no drawing and no browser in it: the Keeper,
// the pools of bullets, enemies, dark orbs, pickups and particles, the five waves
// and the Gloomwarden, spawning, collisions, score, hearts and the win and loss.
// step() advances one fixed step and returns what happened as bit flags, so the
// caller can react (sound, announcements) without the world knowing about screens
// or sound. Nothing here allocates after createWorld returns.

import {
  BULLET_DAMAGE, ENEMY, FIELD, MAX_HEARTS, ORB, PICKUP, PLAYER, POOL, POWER,
  STEP, WAVES, WAVE_CLEAR_BONUS, WIN_TIME_BONUS_PER_SECOND,
} from './config.js';

export const KIND_DRIFTER = 'drifter';
export const KIND_DARTER = 'darter';
export const KIND_SPITTER = 'spitter';
export const KIND_BOSS = 'boss';

export const EVENT_HIT = 1;
export const EVENT_PICKUP = 2;
export const EVENT_DIE = 4;
export const EVENT_OVER = 8;
export const EVENT_WIN = 16;
export const EVENT_WAVE = 32;
export const EVENT_BOSS = 64;
export const EVENT_SHOOT = 128;

const BANNER_SECONDS = 2.0;
const INTERMISSION_SECONDS = 3.0;

function dist2(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function createWorld(random) {
  const player = {
    x: FIELD.width / 2, y: FIELD.height / 2, hearts: MAX_HEARTS,
    invulnerable: 0, fireTimer: 0, spreadTimer: 0, shieldTimer: 0, aimAngle: -Math.PI / 2,
  };
  const bullets = [];
  for (let i = 0; i < POOL.bullets; i += 1) bullets.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const enemies = [];
  for (let i = 0; i < POOL.enemies; i += 1) {
    enemies.push({ active: false, kind: KIND_DRIFTER, x: 0, y: 0, vx: 0, vy: 0, hp: 1, maxHp: 1, radius: 16, speed: 70, score: 0, shotTimer: 0, burstTimer: 0, spawnTimer: 0, zig: 0 });
  }
  const orbs = [];
  for (let i = 0; i < POOL.orbs; i += 1) orbs.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const pickups = [];
  for (let i = 0; i < POOL.pickups; i += 1) pickups.push({ active: false, kind: 'star', x: 0, y: 0, vx: 0, vy: 0, life: 0 });
  const particles = [];
  for (let i = 0; i < POOL.particles; i += 1) particles.push({ active: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 3, color: '#ffffff' });

  const state = {
    player, bullets, enemies, orbs, pickups, particles,
    score: 0, kills: 0, wave: 1, phase: 'banner', phaseTimer: BANNER_SECONDS,
    elapsed: 0, shake: 0, flash: 0, bannerText: '', spawnTimer: 0,
    queue: { drifters: 0, darters: 0, spitters: 0 }, boss: null,
  };

  function free(pool) {
    for (let i = 0; i < pool.length; i += 1) if (!pool[i].active) return pool[i];
    return null;
  }

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const p = free(particles);
      if (p === null) return;
      const angle = random() * Math.PI * 2;
      const v = speed * (0.4 + random() * 0.8);
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * v;
      p.vy = Math.sin(angle) * v;
      p.maxLife = 0.4 + random() * 0.4;
      p.life = p.maxLife;
      p.size = 2 + random() * 3;
      p.color = color;
    }
  }

  function edgePoint() {
    const side = Math.floor(random() * 4);
    const margin = 30;
    if (side === 0) return { x: margin + random() * (FIELD.width - margin * 2), y: -24 };
    if (side === 1) return { x: margin + random() * (FIELD.width - margin * 2), y: FIELD.height + 24 };
    if (side === 2) return { x: -24, y: margin + random() * (FIELD.height - margin * 2) };
    return { x: FIELD.width + 24, y: margin + random() * (FIELD.height - margin * 2) };
  }

  function spawnEnemy(kind, x, y) {
    const e = free(enemies);
    if (e === null) return null;
    const def = ENEMY[kind];
    const at = x === undefined ? edgePoint() : { x, y };
    e.active = true;
    e.kind = kind;
    e.x = at.x;
    e.y = at.y;
    e.vx = 0;
    e.vy = 0;
    e.hp = def.hp;
    e.maxHp = def.hp;
    e.radius = def.radius;
    e.speed = def.speed;
    e.score = def.score;
    e.shotTimer = 1 + random() * 1.5;
    e.burstTimer = 2;
    e.spawnTimer = 6;
    e.zig = random() * Math.PI * 2;
    return e;
  }

  function spawnBoss() {
    const boss = spawnEnemy(KIND_BOSS, FIELD.width / 2, -60);
    if (boss === null) return;
    state.boss = boss;
  }

  function beginWave(index) {
    state.wave = index;
    const def = WAVES[index - 1];
    state.queue = { drifters: def.drifters, darters: def.darters, spitters: def.spitters };
    state.spawnTimer = 0.5;
    state.phase = 'banner';
    state.phaseTimer = BANNER_SECONDS;
    state.bannerText = index === 5 ? 'Wave 5 — The Gloomwarden' : `Wave ${index} of 5`;
    if (index === 5) spawnBoss();
  }

  function dropPickup(x, y) {
    const roll = random();
    const p = free(pickups);
    if (p === null) return;
    let kind = 'star';
    if (roll < PICKUP.dropHeart) kind = 'heart';
    else if (roll < PICKUP.dropHeart + PICKUP.dropSpread) kind = 'spread';
    else if (roll < PICKUP.dropHeart + PICKUP.dropSpread + PICKUP.dropShield) kind = 'shield';
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.vx = (random() - 0.5) * 60;
    p.vy = (random() - 0.5) * 60;
    p.life = PICKUP.lifetime;
  }

  function fireOrb(x, y, angle) {
    const orb = free(orbs);
    if (orb === null) return;
    orb.active = true;
    orb.x = x;
    orb.y = y;
    orb.vx = Math.cos(angle) * ORB.speed;
    orb.vy = Math.sin(angle) * ORB.speed;
    orb.life = 4;
  }

  function hurtPlayer(events) {
    if (player.shieldTimer > 0 || player.invulnerable > 0) return events;
    player.hearts -= 1;
    player.invulnerable = PLAYER.invulnerable;
    state.shake = 10;
    state.flash = 0.25;
    burst(player.x, player.y, '#ff6b81', 14, 180);
    events |= EVENT_HIT;
    if (player.hearts <= 0) {
      state.phase = 'over';
      events |= EVENT_OVER;
    }
    return events;
  }

  function killEnemy(e, events) {
    e.active = false;
    state.score += e.score;
    state.kills += 1;
    burst(e.x, e.y, e.kind === KIND_BOSS ? '#ff8fb0' : '#ffe9a3', e.kind === KIND_BOSS ? 40 : 12, 200);
    events |= EVENT_DIE;
    if (e.kind === KIND_BOSS) {
      state.boss = null;
      state.score += Math.max(0, Math.round((300 - state.elapsed) * WIN_TIME_BONUS_PER_SECOND));
      state.phase = 'won';
      events |= EVENT_WIN;
    } else {
      dropPickup(e.x, e.y);
    }
    return events;
  }

  function reset() {
    player.x = FIELD.width / 2;
    player.y = FIELD.height / 2;
    player.hearts = MAX_HEARTS;
    player.invulnerable = 0;
    player.fireTimer = 0;
    player.spreadTimer = 0;
    player.shieldTimer = 0;
    player.aimAngle = -Math.PI / 2;
    for (const pool of [bullets, enemies, orbs, pickups, particles]) for (const item of pool) item.active = false;
    state.score = 0;
    state.kills = 0;
    state.elapsed = 0;
    state.shake = 0;
    state.flash = 0;
    state.boss = null;
    beginWave(1);
  }

  /**
   * One fixed step. `move` is {x, y} in -1..1, `aim` is a field point or null,
   * `firing` is whether the player holds fire. With `harmless` set (the title
   * screen's backdrop) drifters wander, nothing scores and nothing can hurt.
   */
  function step(dt, move, aim, firing, harmless) {
    let events = 0;
    state.elapsed += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 30);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

    if (harmless) {
      // Title backdrop: a few drifters wander the tide, nothing else happens.
      if (random() < dt * 0.7) spawnEnemy(KIND_DRIFTER);
      for (const e of enemies) {
        if (!e.active) continue;
        e.zig += dt;
        e.x += Math.cos(e.zig) * e.speed * 0.4 * dt;
        e.y += Math.sin(e.zig * 0.7) * e.speed * 0.4 * dt + 20 * dt;
        if (e.y > FIELD.height + 40 || e.x < -60 || e.x > FIELD.width + 60) e.active = false;
      }
      return events;
    }

    if (state.phase === 'banner') {
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) state.phase = 'fight';
    } else if (state.phase === 'intermission') {
      state.phaseTimer -= dt;
      if (state.phaseTimer <= 0) beginWave(state.wave + 1);
    }
    if (state.phase === 'won' || state.phase === 'over') {
      updateParticles(dt);
      return events;
    }

    // --- player ---
    const len = Math.hypot(move.x, move.y);
    const nx = len > 0 ? move.x / len : 0;
    const ny = len > 0 ? move.y / len : 0;
    player.x = Math.min(FIELD.width - PLAYER.radius, Math.max(PLAYER.radius, player.x + nx * PLAYER.speed * dt));
    player.y = Math.min(FIELD.height - PLAYER.radius, Math.max(PLAYER.radius, player.y + ny * PLAYER.speed * dt));
    if (aim !== null) player.aimAngle = Math.atan2(aim.y - player.y, aim.x - player.x);
    else if (len > 0) player.aimAngle = Math.atan2(ny, nx);
    if (player.invulnerable > 0) player.invulnerable = Math.max(0, player.invulnerable - dt);
    if (player.spreadTimer > 0) player.spreadTimer = Math.max(0, player.spreadTimer - dt);
    if (player.shieldTimer > 0) player.shieldTimer = Math.max(0, player.shieldTimer - dt);

    player.fireTimer -= dt;
    if (firing && player.fireTimer <= 0 && state.phase === 'fight') {
      player.fireTimer = PLAYER.fireInterval;
      const angles = player.spreadTimer > 0 ? [-0.22, 0, 0.22] : [0];
      for (const off of angles) {
        const b = free(bullets);
        if (b === null) break;
        const a = player.aimAngle + off;
        b.active = true;
        b.x = player.x + Math.cos(a) * (PLAYER.radius + 6);
        b.y = player.y + Math.sin(a) * (PLAYER.radius + 6);
        b.vx = Math.cos(a) * PLAYER.bulletSpeed;
        b.vy = Math.sin(a) * PLAYER.bulletSpeed;
        b.life = 1.2;
      }
      events |= EVENT_SHOOT;
    }

    // --- spawning ---
    if (state.phase === 'fight') {
      const totalQueued = state.queue.drifters + state.queue.darters + state.queue.spitters;
      if (totalQueued > 0) {
        state.spawnTimer -= dt;
        if (state.spawnTimer <= 0) {
          state.spawnTimer = WAVES[state.wave - 1].interval;
          if (state.queue.drifters > 0) { spawnEnemy(KIND_DRIFTER); state.queue.drifters -= 1; }
          else if (state.queue.darters > 0) { spawnEnemy(KIND_DARTER); state.queue.darters -= 1; }
          else if (state.queue.spitters > 0) { spawnEnemy(KIND_SPITTER); state.queue.spitters -= 1; }
        }
      }
    }

    // --- enemies ---
    for (const e of enemies) {
      if (!e.active) continue;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      if (e.kind === KIND_DRIFTER) {
        e.x += ux * e.speed * dt;
        e.y += uy * e.speed * dt;
      } else if (e.kind === KIND_DARTER) {
        e.zig += dt * 6;
        const px = -uy * Math.sin(e.zig);
        const py = ux * Math.sin(e.zig);
        e.x += (ux * 0.8 + px * 0.6) * e.speed * dt;
        e.y += (uy * 0.8 + py * 0.6) * e.speed * dt;
      } else if (e.kind === KIND_SPITTER) {
        if (d > ENEMY.spitter.range) { e.x += ux * e.speed * dt; e.y += uy * e.speed * dt; }
        else if (d < ENEMY.spitter.range * 0.6) { e.x -= ux * e.speed * dt; e.y -= uy * e.speed * dt; }
        e.shotTimer -= dt;
        if (e.shotTimer <= 0 && d < 520) {
          e.shotTimer = ENEMY.spitter.shotInterval;
          fireOrb(e.x, e.y, Math.atan2(dy, dx));
        }
      } else if (e.kind === KIND_BOSS) {
        e.x += ux * e.speed * dt;
        e.y += uy * e.speed * dt;
        e.burstTimer -= dt;
        if (e.burstTimer <= 0) {
          e.burstTimer = ENEMY.boss.burstInterval;
          for (let i = 0; i < 8; i += 1) fireOrb(e.x, e.y, (i / 8) * Math.PI * 2 + random() * 0.4);
        }
        e.spawnTimer -= dt;
        if (e.spawnTimer <= 0) {
          e.spawnTimer = ENEMY.boss.spawnInterval;
          spawnEnemy(KIND_DRIFTER, e.x - 50, e.y);
          spawnEnemy(KIND_DRIFTER, e.x + 50, e.y);
        }
      }
      // Contact with the Keeper: the foe bursts, the Keeper is hurt. A shield
      // shatters small foes on touch; the boss only takes one hit from it.
      if (dist2(e.x, e.y, player.x, player.y) < (e.radius + PLAYER.radius) * (e.radius + PLAYER.radius)) {
        if (player.shieldTimer > 0) {
          if (e.kind === KIND_BOSS) {
            e.hp -= BULLET_DAMAGE;
            burst(e.x, e.y, '#7ce7c4', 8, 140);
            if (e.hp <= 0) events = killEnemy(e, events);
          } else {
            events = killEnemy(e, events);
          }
        } else {
          e.active = false;
          burst(e.x, e.y, '#ff6b81', 10, 160);
          events = hurtPlayer(events);
          if (state.phase === 'over') break;
        }
      }
    }

    // --- bullets ---
    for (const b of bullets) {
      if (!b.active) continue;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.life -= dt;
      if (b.life <= 0 || b.x < -20 || b.x > FIELD.width + 20 || b.y < -20 || b.y > FIELD.height + 20) { b.active = false; continue; }
      for (const e of enemies) {
        if (!e.active) continue;
        if (dist2(b.x, b.y, e.x, e.y) < (e.radius + PLAYER.bulletRadius) * (e.radius + PLAYER.bulletRadius)) {
          b.active = false;
          e.hp -= BULLET_DAMAGE;
          burst(b.x, b.y, '#ffd76a', 4, 120);
          if (e.hp <= 0) events = killEnemy(e, events);
          break;
        }
      }
      if (state.phase === 'won') break;
    }

    // --- dark orbs ---
    for (const orb of orbs) {
      if (!orb.active) continue;
      orb.x += orb.vx * dt;
      orb.y += orb.vy * dt;
      orb.life -= dt;
      if (orb.life <= 0 || orb.x < -30 || orb.x > FIELD.width + 30 || orb.y < -30 || orb.y > FIELD.height + 30) { orb.active = false; continue; }
      if (dist2(orb.x, orb.y, player.x, player.y) < (ORB.radius + PLAYER.radius) * (ORB.radius + PLAYER.radius)) {
        orb.active = false;
        if (player.shieldTimer > 0) burst(orb.x, orb.y, '#7ce7c4', 6, 120);
        else events = hurtPlayer(events);
        if (state.phase === 'over') break;
      }
    }

    // --- pickups ---
    for (const p of pickups) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      const d2 = dist2(p.x, p.y, player.x, player.y);
      if (d2 < PICKUP.magnetRadius * PICKUP.magnetRadius) {
        const d = Math.sqrt(d2) || 1;
        p.x += ((player.x - p.x) / d) * 260 * dt;
        p.y += ((player.y - p.y) / d) * 260 * dt;
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      }
      if (d2 < (PLAYER.radius + PICKUP.radius) * (PLAYER.radius + PICKUP.radius)) {
        p.active = false;
        if (p.kind === 'heart') player.hearts = Math.min(MAX_HEARTS, player.hearts + 1);
        else if (p.kind === 'spread') player.spreadTimer = POWER.spreadSeconds;
        else if (p.kind === 'shield') player.shieldTimer = POWER.shieldSeconds;
        else state.score += PICKUP.starScore;
        burst(p.x, p.y, '#f2c94c', 8, 140);
        events |= EVENT_PICKUP;
      }
    }

    updateParticles(dt);

    // --- wave clear ---
    if (state.phase === 'fight' && state.wave < 5) {
      const queued = state.queue.drifters + state.queue.darters + state.queue.spitters;
      let alive = false;
      for (const e of enemies) if (e.active) { alive = true; break; }
      if (queued === 0 && !alive) {
        state.score += WAVE_CLEAR_BONUS;
        state.phase = 'intermission';
        state.phaseTimer = INTERMISSION_SECONDS;
        state.bannerText = `Wave ${state.wave} clear! +${WAVE_CLEAR_BONUS}`;
        events |= EVENT_WAVE;
      }
    }
    return events;
  }

  function updateParticles(dt) {
    for (const p of particles) {
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) { p.active = false; continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
    }
  }

  /** Jump straight to a wave (used by the screenshot scenes). */
  function jumpToWave(index, score) {
    reset();
    state.score = score;
    beginWave(index);
    state.phase = 'fight';
    state.phaseTimer = 0;
    if (index === 5) {
      const boss = state.boss;
      if (boss !== null) { boss.x = FIELD.width / 2; boss.y = 200; }
    }
  }

  reset();
  return { state, reset, step, beginWave, jumpToWave };
}
