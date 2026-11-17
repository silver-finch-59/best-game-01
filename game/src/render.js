// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Everything is drawn from the world's state and its
// elapsed time, so the same state always paints the same frame.

import { ENEMY, FIELD, FONT, MAX_HEARTS, PALETTE, PICKUP } from './config.js';
import { KIND_BOSS, KIND_DARTER, KIND_DRIFTER, KIND_SPITTER } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

const PANEL = { width: 720, top: 150, line: 32, bottom: 76 };

/** Fixed rocks and stars: hashed from their index, so the scene never changes. */
const ROCKS = [];
for (let i = 0; i < 14; i += 1) {
  const h = ((i * 2654435761) >>> 0) / 4294967296;
  const h2 = ((i * 40503 + 7) % 1000) / 1000;
  ROCKS.push({ x: 40 + h * (FIELD.width - 80), y: 90 + h2 * (FIELD.height - 180), r: 8 + h * 18 });
}
const STARS = [];
for (let i = 0; i < 70; i += 1) {
  const h = ((i * 2246822519) >>> 0) / 4294967296;
  const h2 = ((i * 3266489917) >>> 0) / 4294967296;
  STARS.push({ x: h * FIELD.width, y: h2 * FIELD.height * 0.55, r: 0.6 + h2 * 1.4, tw: i % 5 });
}

function cachedLabel(prefix) {
  let value = -1;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const scoreLabel = cachedLabel('Score ');
  const bestLabel = cachedLabel('Best ');
  const waveLabel = cachedLabel('Wave ');
  const finalLabel = cachedLabel('Score ');
  const killsLabel = cachedLabel('Foes lit ');
  const timeLabel = cachedLabel('Time ');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  /** Convert a browser pointer position to playfield coordinates. */
  function toField(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const cssScale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const offsetX = (rect.width - FIELD.width * cssScale) / 2;
    const offsetY = (rect.height - FIELD.height * cssScale) / 2;
    return {
      x: (clientX - rect.left - offsetX) / cssScale,
      y: (clientY - rect.top - offsetY) / cssScale,
    };
  }

  const fonts = new Map();
  function text(value, x, y, size, color, align) {
    if (!fonts.has(size)) fonts.set(size, `bold ${size}px ${FONT}`);
    context.font = fonts.get(size);
    context.fillStyle = color;
    context.textAlign = align;
    context.fillText(value, x, y);
  }

  function drawHeart(x, y, size, color) {
    context.fillStyle = color;
    context.beginPath();
    context.moveTo(x, y + size * 0.9);
    context.bezierCurveTo(x - size * 1.2, y, x - size * 0.6, y - size * 0.9, x, y - size * 0.25);
    context.bezierCurveTo(x + size * 0.6, y - size * 0.9, x + size * 1.2, y, x, y + size * 0.9);
    context.fill();
  }

  function drawStar(x, y, r, color) {
    context.fillStyle = color;
    context.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? r : r * 0.45;
      const px = x + Math.cos(angle) * rad;
      const py = y + Math.sin(angle) * rad;
      if (i === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
  }

  function drawField(state) {
    const t = state.elapsed;
    const grad = context.createLinearGradient(0, 0, 0, FIELD.height);
    grad.addColorStop(0, PALETTE.seaDeep);
    grad.addColorStop(0.6, PALETTE.sea);
    grad.addColorStop(1, PALETTE.seaLight);
    context.fillStyle = grad;
    context.fillRect(0, 0, FIELD.width, FIELD.height);

    // Stars, twinkling on the fixed elapsed time.
    for (const s of STARS) {
      const alpha = 0.35 + 0.35 * Math.sin(t * 1.5 + s.tw);
      context.globalAlpha = Math.max(0.1, alpha);
      context.fillStyle = '#cfe4ff';
      context.beginPath();
      context.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;

    // Slow tide lines.
    context.strokeStyle = 'rgba(120, 190, 230, 0.14)';
    context.lineWidth = 3;
    for (let row = 0; row < 4; row += 1) {
      const y = 140 + row * 140;
      context.beginPath();
      for (let x = 0; x <= FIELD.width; x += 32) {
        const yy = y + Math.sin(x * 0.01 + t * 0.8 + row * 1.7) * 10;
        if (x === 0) context.moveTo(x, yy);
        else context.lineTo(x, yy);
      }
      context.stroke();
    }

    // Rocks.
    for (const rock of ROCKS) {
      context.fillStyle = '#16324a';
      context.beginPath();
      context.arc(rock.x, rock.y, rock.r, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#1d4a6b';
      context.beginPath();
      context.arc(rock.x - rock.r * 0.25, rock.y - rock.r * 0.25, rock.r * 0.55, 0, Math.PI * 2);
      context.fill();
    }

    // Pickups.
    for (const p of state.pickups) {
      if (!p.active) continue;
      const bob = Math.sin(t * 4 + p.x) * 3;
      const pulse = 0.75 + 0.25 * Math.sin(t * 5);
      context.globalAlpha = p.life < 3 ? (Math.floor(t * 6) % 2 === 0 ? 0.4 : 1) : 1;
      if (p.kind === 'heart') drawHeart(p.x, p.y + bob, 10, PALETTE.heart);
      else if (p.kind === 'spread') { context.fillStyle = PALETTE.spread; context.beginPath(); context.arc(p.x, p.y + bob, 11 * pulse, 0, Math.PI * 2); context.fill(); context.fillStyle = '#06283d'; context.font = `bold 14px ${FONT}`; context.textAlign = 'center'; context.fillText('x3', p.x, p.y + bob + 5); }
      else if (p.kind === 'shield') { context.strokeStyle = PALETTE.shield; context.lineWidth = 3; context.beginPath(); context.arc(p.x, p.y + bob, 11 * pulse, 0, Math.PI * 2); context.stroke(); context.fillStyle = PALETTE.shield; context.beginPath(); context.arc(p.x, p.y + bob, 4, 0, Math.PI * 2); context.fill(); }
      else drawStar(p.x, p.y + bob, 11 * pulse, PALETTE.star);
    }
    context.globalAlpha = 1;

    // Dark orbs.
    for (const orb of state.orbs) {
      if (!orb.active) continue;
      context.fillStyle = PALETTE.orb;
      context.beginPath();
      context.arc(orb.x, orb.y, 9, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#e9d5ff';
      context.beginPath();
      context.arc(orb.x, orb.y, 3.5, 0, Math.PI * 2);
      context.fill();
    }

    // Enemies.
    for (const e of state.enemies) {
      if (!e.active) continue;
      if (e.kind === KIND_DRIFTER) {
        context.fillStyle = PALETTE.drifter;
        context.beginPath();
        context.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#0b2b16';
        context.beginPath();
        context.arc(e.x - 5, e.y - 3, 2.5, 0, Math.PI * 2);
        context.arc(e.x + 5, e.y - 3, 2.5, 0, Math.PI * 2);
        context.fill();
      } else if (e.kind === KIND_DARTER) {
        context.save();
        context.translate(e.x, e.y);
        context.rotate(Math.atan2(state.player.y - e.y, state.player.x - e.x));
        context.fillStyle = PALETTE.darter;
        context.beginPath();
        context.moveTo(e.radius + 4, 0);
        context.lineTo(-e.radius, -e.radius);
        context.lineTo(-e.radius * 0.5, 0);
        context.lineTo(-e.radius, e.radius);
        context.closePath();
        context.fill();
        context.restore();
      } else if (e.kind === KIND_SPITTER) {
        context.save();
        context.translate(e.x, e.y);
        context.rotate(Math.PI / 4 + Math.sin(t * 2) * 0.2);
        context.fillStyle = PALETTE.spitter;
        context.fillRect(-e.radius * 0.8, -e.radius * 0.8, e.radius * 1.6, e.radius * 1.6);
        context.restore();
        context.fillStyle = '#efe6ff';
        context.beginPath();
        context.arc(e.x, e.y, 4, 0, Math.PI * 2);
        context.fill();
      } else if (e.kind === KIND_BOSS) {
        const glow = context.createRadialGradient(e.x, e.y, 10, e.x, e.y, e.radius + 26);
        glow.addColorStop(0, 'rgba(255, 90, 140, 0.5)');
        glow.addColorStop(1, 'rgba(255, 90, 140, 0)');
        context.fillStyle = glow;
        context.beginPath();
        context.arc(e.x, e.y, e.radius + 26, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = PALETTE.boss;
        context.beginPath();
        context.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#3d0f26';
        for (let i = 0; i < 6; i += 1) {
          const a = (i / 6) * Math.PI * 2 + t * 0.4;
          context.beginPath();
          context.arc(e.x + Math.cos(a) * e.radius * 0.7, e.y + Math.sin(a) * e.radius * 0.7, 5, 0, Math.PI * 2);
          context.fill();
        }
        context.fillStyle = '#ffd76a';
        context.beginPath();
        context.arc(e.x - 12, e.y - 6, 5, 0, Math.PI * 2);
        context.arc(e.x + 12, e.y - 6, 5, 0, Math.PI * 2);
        context.fill();
      }
      // Small health bar for tougher foes.
      if ((e.kind === KIND_SPITTER || e.kind === KIND_BOSS) && e.hp < e.maxHp) {
        const w = e.kind === KIND_BOSS ? 84 : 30;
        context.fillStyle = 'rgba(0,0,0,0.5)';
        context.fillRect(e.x - w / 2, e.y - e.radius - 14, w, 6);
        context.fillStyle = PALETTE.danger;
        context.fillRect(e.x - w / 2, e.y - e.radius - 14, w * (e.hp / e.maxHp), 6);
      }
    }

    // Bullets: short gold streaks.
    context.strokeStyle = PALETTE.bullet;
    context.lineWidth = 4;
    context.lineCap = 'round';
    for (const b of state.bullets) {
      if (!b.active) continue;
      context.beginPath();
      context.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
      context.lineTo(b.x, b.y);
      context.stroke();
    }

    // Particles.
    for (const p of state.particles) {
      if (!p.active) continue;
      context.globalAlpha = Math.max(0, p.life / p.maxLife);
      context.fillStyle = p.color;
      context.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    context.globalAlpha = 1;

    // The Keeper: a glowing wisp with a lantern cone toward the aim.
    const player = state.player;
    if (player.invulnerable === 0 || Math.floor(player.invulnerable * 10) % 2 === 1) {
      const glow = context.createRadialGradient(player.x, player.y, 2, player.x, player.y, 46);
      glow.addColorStop(0, 'rgba(255, 233, 163, 0.55)');
      glow.addColorStop(1, 'rgba(255, 233, 163, 0)');
      context.fillStyle = glow;
      context.beginPath();
      context.arc(player.x, player.y, 46, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = PALETTE.playerCore;
      context.beginPath();
      context.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.player;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(player.x, player.y, PLAYER_RADIUS + 4, 0, Math.PI * 2);
      context.stroke();
      // Aim tick.
      context.fillStyle = PALETTE.bullet;
      context.beginPath();
      context.arc(player.x + Math.cos(player.aimAngle) * 22, player.y + Math.sin(player.aimAngle) * 22, 4, 0, Math.PI * 2);
      context.fill();
      // Shield ring.
      if (player.shieldTimer > 0) {
        context.strokeStyle = PALETTE.shield;
        context.lineWidth = 3;
        context.beginPath();
        context.arc(player.x, player.y, PLAYER_RADIUS + 12 + Math.sin(t * 6) * 2, 0, Math.PI * 2);
        context.stroke();
      }
    }
  }

  const PLAYER_RADIUS = 14;

  function drawHud(state, best) {
    context.textBaseline = 'top';
    // Hearts, top left.
    for (let i = 0; i < MAX_HEARTS; i += 1) {
      drawHeart(30 + i * 30, 34, 9, i < state.player.hearts ? PALETTE.heart : '#26344a');
    }
    text(scoreLabel(state.score), 24, 56, 26, PALETTE.text, 'left');
    text(waveLabel(state.wave), FIELD.width / 2, 20, 26, PALETTE.text, 'center');
    let remaining = state.queue.drifters + state.queue.darters + state.queue.spitters;
    for (const e of state.enemies) if (e.active) remaining += 1;
    text(`Foes left ${remaining}`, FIELD.width / 2, 52, 18, PALETTE.muted, 'center');
    text(bestLabel(best), FIELD.width - 24, 20, 22, PALETTE.muted, 'right');
    text('M mute · P pause', FIELD.width - 24, 48, 16, PALETTE.muted, 'right');
    // Power timers.
    let ty = 92;
    if (state.player.spreadTimer > 0) {
      text(`Triple shot ${Math.ceil(state.player.spreadTimer)}s`, 24, ty, 18, PALETTE.spread, 'left');
      ty += 24;
    }
    if (state.player.shieldTimer > 0) {
      text(`Shield ${Math.ceil(state.player.shieldTimer)}s`, 24, ty, 18, PALETTE.shield, 'left');
    }
    // Boss bar.
    if (state.boss !== null && state.boss.active) {
      const w = 420;
      const x = (FIELD.width - w) / 2;
      const y = FIELD.height - 44;
      text('THE GLOOMWARDEN', FIELD.width / 2, y - 26, 18, '#ff8fb0', 'center');
      context.fillStyle = 'rgba(0,0,0,0.55)';
      context.fillRect(x, y, w, 14);
      context.fillStyle = PALETTE.boss;
      context.fillRect(x, y, w * (state.boss.hp / state.boss.maxHp), 14);
      context.strokeStyle = '#ff8fb0';
      context.lineWidth = 2;
      context.strokeRect(x, y, w, 14);
    }
    // Wave banner.
    if (state.phase === 'banner' || state.phase === 'intermission') {
      context.textBaseline = 'alphabetic';
      text(state.bannerText, FIELD.width / 2, 200, 44, PALETTE.text, 'center');
    }
    // Low hearts pulse.
    if (state.player.hearts === 1) {
      context.globalAlpha = 0.12 + 0.08 * Math.sin(state.elapsed * 6);
      context.fillStyle = PALETTE.danger;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      context.globalAlpha = 1;
    }
  }

  function drawPanel(title, lines, prompt) {
    const height = PANEL.top + lines.length * PANEL.line + PANEL.bottom;
    const x = (FIELD.width - PANEL.width) / 2;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(4, 8, 18, 0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    context.fillRect(x, y, PANEL.width, height);
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.strokeRect(x, y, PANEL.width, height);
    context.textBaseline = 'alphabetic';
    text(title, FIELD.width / 2, y + 76, 46, PALETTE.text, 'center');
    for (let index = 0; index < lines.length; index += 1) {
      text(lines[index], FIELD.width / 2, y + PANEL.top + index * PANEL.line, 21, PALETTE.muted, 'center');
    }
    text(prompt, FIELD.width / 2, y + height - 38, 23, PALETTE.star, 'center');
  }

  /** Paint one frame: the field, then the HUD or a panel for the screen the game is on. */
  function draw(state, screen, best, muted) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    const shakeX = state.shake > 0 ? (Math.sin(state.elapsed * 91) * state.shake) : 0;
    const shakeY = state.shake > 0 ? (Math.cos(state.elapsed * 113) * state.shake) : 0;
    context.setTransform(view.scale, 0, 0, view.scale, view.x + shakeX * view.scale, view.y + shakeY * view.scale);
    drawField(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('LUMEN TIDE', [
        'Hold the light through 5 waves.',
        'Beat the Gloomwarden to win.',
        'Move: WASD or arrows · Aim: mouse',
        'Fire: hold click or Space · Dodge the dark orbs.',
        'Catch hearts, triple shot and shields.',
        muted ? 'Sound: off (M to turn on)' : 'Sound: on (M to mute)',
        bestLabel(best),
      ], 'Press Space or click to start');
      return;
    }
    drawHud(state, best);
    if (state.flash > 0) {
      context.globalAlpha = state.flash * 1.6;
      context.fillStyle = PALETTE.danger;
      context.fillRect(0, 0, FIELD.width, FIELD.height);
      context.globalAlpha = 1;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('Paused', ['The tide waits for you.', muted ? 'Sound: off (M to turn on)' : 'Sound: on (M to mute)'], 'Press P to resume');
    } else if (screen === SCREEN_OVER) {
      drawPanel('The light goes out', [
        finalLabel(state.score),
        bestLabel(best),
        killsLabel(state.kills),
        `Reached wave ${state.wave} of 5`,
      ], 'Press Space or click to play again');
    } else if (screen === SCREEN_WIN) {
      drawPanel('YOU LIT THE TIDE!', [
        finalLabel(state.score),
        bestLabel(best),
        killsLabel(state.kills),
        timeLabel(`${Math.floor(state.elapsed)}s`),
      ], 'Press Space or click to play again');
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw, toField };
}
