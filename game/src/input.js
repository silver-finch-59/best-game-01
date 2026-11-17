// Keyboard and mouse input. Held keys give a move direction; one-shot presses
// (start, restart, pause, mute) are queued as bit flags and taken once by the loop,
// so a press between two frames is never lost and never counted twice. The mouse
// aims: the loop reads aim() in playfield coordinates, falling back to the move
// direction when the mouse has never moved.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(canvas, toField) {
  let up = false;
  let down = false;
  let left = false;
  let right = false;
  let firing = false;
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let hasMouse = false;

  function keyDown(event) {
    if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      firing = true;
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else return;
    event.preventDefault();
  }

  function keyUp(event) {
    if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
    else if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (CONFIRM.has(event.code)) firing = false;
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', () => {
    up = false;
    down = false;
    left = false;
    right = false;
    firing = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const point = toField(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
    hasMouse = true;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const point = toField(event.clientX, event.clientY);
    mouseX = point.x;
    mouseY = point.y;
    hasMouse = true;
    firing = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    firing = false;
  });

  return {
    /** Move direction as {x, y}, each -1, 0 or 1, normalized by the caller. */
    direction() {
      return { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
    },
    /** True while the mouse button or Space is held. */
    get firing() {
      return firing;
    },
    set firing(value) {
      firing = value;
    },
    /** Aim point in playfield coordinates, or null before the mouse has moved. */
    aim() {
      return hasMouse ? { x: mouseX, y: mouseY } : null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
