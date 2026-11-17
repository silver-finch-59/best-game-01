// All sound is synthesized with WebAudio: short oscillator blips, no audio files.
// The context is created on the first user gesture, so a page that only shows the
// title stays silent; M toggles mute. Every call is guarded, so a browser with no
// audio still plays the game.

export function createAudio() {
  let context = null;
  let muted = false;
  let master = null;

  function ensure() {
    if (context !== null) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = 0.16;
      master.connect(context.destination);
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, dur, type, slideTo, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (ctx === null || master === null) return;
    try {
      if (ctx.state === 'suspended') void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t0 = ctx.currentTime + when;
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      gain.gain.setValueAtTime(0.9, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Sound is garnish: a failed blip never breaks the game.
    }
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    shoot() {
      tone(920, 0.07, 'square', 420);
    },
    hit() {
      tone(220, 0.18, 'sawtooth', 90);
    },
    enemyDie() {
      tone(320, 0.12, 'triangle', 90);
    },
    pickup() {
      tone(660, 0.09, 'sine', 990);
    },
    heart() {
      tone(520, 0.12, 'sine', 780);
      tone(780, 0.14, 'sine', 1040, 0.09);
    },
    waveClear() {
      tone(523, 0.12, 'triangle');
      tone(659, 0.12, 'triangle', undefined, 0.1);
      tone(784, 0.2, 'triangle', undefined, 0.2);
    },
    boss() {
      tone(110, 0.5, 'sawtooth', 55);
    },
    win() {
      const notes = [523, 659, 784, 1047];
      notes.forEach((freq, index) => tone(freq, 0.22, 'triangle', undefined, index * 0.13));
    },
    lose() {
      tone(392, 0.25, 'triangle', 196);
      tone(294, 0.4, 'triangle', 147, 0.22);
    },
  };
}
