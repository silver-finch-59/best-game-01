// Lumen Tide — every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display rate. */
export const STEP = 1 / 60;

/** How many hearts the Keeper starts with; a heart pickup restores one. */
export const MAX_HEARTS = 5;

export const PLAYER = {
  radius: 14,
  speed: 320,
  fireInterval: 0.22,
  bulletSpeed: 640,
  bulletRadius: 5,
  invulnerable: 1.2,
};

export const BULLET_DAMAGE = 1;

/** Five waves; the fifth is the Gloomwarden. Counts are spawned over the wave. */
export const WAVES = [
  { drifters: 6, darters: 0, spitters: 0, interval: 1.0 },
  { drifters: 8, darters: 4, spitters: 0, interval: 0.9 },
  { drifters: 10, darters: 6, spitters: 3, interval: 0.85 },
  { drifters: 12, darters: 8, spitters: 5, interval: 0.8 },
  { drifters: 4, darters: 3, spitters: 2, interval: 0.9 },
];

export const WAVE_CLEAR_BONUS = 250;
export const WIN_TIME_BONUS_PER_SECOND = 10;

export const ENEMY = {
  drifter: { hp: 2, speed: 72, radius: 16, score: 50, touch: 1 },
  darter: { hp: 1, speed: 155, radius: 12, score: 80, touch: 1 },
  spitter: { hp: 2, speed: 56, radius: 14, score: 120, touch: 1, range: 280, shotInterval: 2.2 },
  boss: { hp: 60, speed: 46, radius: 42, score: 1000, touch: 1, burstInterval: 3.0, spawnInterval: 8.0 },
};

export const ORB = { speed: 230, radius: 7 };

export const PICKUP = {
  radius: 13,
  lifetime: 10,
  magnetRadius: 90,
  dropHeart: 0.08,
  dropSpread: 0.08,
  dropShield: 0.06,
  starScore: 25,
};

export const POWER = {
  spreadSeconds: 12,
  shieldSeconds: 6,
};

/** How many bullets, orbs, pickups and particles can exist at once; pools are allocated once. */
export const POOL = { bullets: 96, orbs: 64, pickups: 24, particles: 256, enemies: 48 };

export const PALETTE = {
  backdrop: '#070d1a',
  seaDeep: '#0a1a2e',
  sea: '#0e2a44',
  seaLight: '#14395c',
  shore: '#1d4a6b',
  player: '#ffe9a3',
  playerCore: '#fff6d8',
  bullet: '#ffd76a',
  drifter: '#7fb069',
  darter: '#e07a5f',
  spitter: '#b388eb',
  boss: '#8d3b5e',
  orb: '#c77dff',
  heart: '#ff6b81',
  spread: '#4fc3f7',
  shield: '#7ce7c4',
  star: '#f2c94c',
  panel: '#101a2c',
  panelEdge: '#2a4a6b',
  text: '#eef4ff',
  muted: '#93a7c4',
  danger: '#ff5d5d',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'lumen-tide.best';
