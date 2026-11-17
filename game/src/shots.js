// The screenshot scenes behind ?shot=start|play|boss|win. Each one plays the real
// rules forward from a fresh world for a fixed number of steps, steered by a simple
// autopilot (chase the nearest foe at a safe range, dodge dark orbs, fire always),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { FIELD, PLAYER, STEP } from './config.js';
import { EVENT_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 20;
const BOSS_SECONDS = 12;
const WIN_LIMIT_SECONDS = 90;

/** Steer the Keeper: chase the nearest foe, keep a safe range, dodge dark orbs. */
function autopilot(state) {
  const player = state.player;
  let nearest = null;
  let nearestD2 = Infinity;
  for (const e of state.enemies) {
    if (!e.active) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < nearestD2) {
      nearestD2 = d2;
      nearest = e;
    }
  }
  let mx = 0;
  let my = 0;
  let aim = { x: FIELD.width / 2, y: FIELD.height / 2 - 100 };
  if (nearest !== null) {
    aim = { x: nearest.x, y: nearest.y };
    const d = Math.sqrt(nearestD2) || 1;
    const want = nearest.kind === 'boss' ? 240 : 190;
    const toward = d > want + 30 ? 1 : d < want - 60 ? -1 : 0;
    mx = ((nearest.x - player.x) / d) * toward;
    my = ((nearest.y - player.y) / d) * toward;
    // Drift sideways so the Keeper does not walk straight into a foe.
    mx += -((nearest.y - player.y) / d) * 0.4;
    my += ((nearest.x - player.x) / d) * 0.4;
  }
  // Dodge dark orbs that are close.
  for (const orb of state.orbs) {
    if (!orb.active) continue;
    const dx = player.x - orb.x;
    const dy = player.y - orb.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 140 * 140) {
      const d = Math.sqrt(d2) || 1;
      mx += (dx / d) * 1.2;
      my += (dy / d) * 1.2;
    }
  }
  // Keep out of a foe's touch range.
  for (const e of state.enemies) {
    if (!e.active) continue;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d2 = dx * dx + dy * dy;
    if (d2 < 70 * 70) {
      const d = Math.sqrt(d2) || 1;
      mx += (dx / d) * 1.5;
      my += (dy / d) * 1.5;
    }
  }
  const len = Math.hypot(mx, my);
  if (len > 1) {
    mx /= len;
    my /= len;
  }
  return { move: { x: mx, y: my }, aim, firing: true };
}

function simulate(world, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const pilot = autopilot(world.state);
    const events = world.step(STEP, pilot.move, pilot.aim, pilot.firing, false);
    if (events & EVENT_OVER) return 'over';
    if (events & EVENT_WIN) return 'win';
  }
  return 'play';
}

/**
 * Set `world` to the named scene (start, play, boss or win; any other name is
 * start) and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'play') {
    world.reset();
    simulate(world, PLAY_SECONDS);
    const over = world.state.player.hearts === 0;
    return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'boss') {
    world.jumpToWave(5, 1250);
    simulate(world, BOSS_SECONDS);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'win') {
    world.jumpToWave(5, 1450);
    // The win scene stands in for a full run: the Keeper has already fought
    // four waves, so the victory stats read like a real one, not a fresh run.
    world.state.kills = 34;
    world.state.elapsed = 178;
    if (world.state.boss !== null) world.state.boss.hp = 4;
    let result = simulate(world, WIN_LIMIT_SECONDS);
    if (result !== 'win' && world.state.boss !== null) {
      world.state.boss.hp = 1;
      result = simulate(world, 20);
    }
    const won = world.state.phase === 'won';
    return { screen: won ? SCREEN_WIN : SCREEN_PLAY, best: world.state.score };
  }
  // start (and anything else): the title over a live tide.
  world.reset();
  for (let i = 0; i < START_SECONDS / STEP; i += 1) {
    world.step(STEP, { x: 0, y: 0 }, null, false, true);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}
