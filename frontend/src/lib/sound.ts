/**
 * Lightweight synthesized SFX via the Web Audio API — no external audio files.
 * One shared AudioContext, created lazily inside a user gesture (autoplay-safe).
 * Mute state is mirrored here and gated per-play; the React layer persists it.
 */

let ctx: AudioContext | null = null;
let muted = false;

// spin lifecycle
let spinOsc: OscillatorNode | null = null;
let spinGain: GainNode | null = null;
let spinTimer: ReturnType<typeof setInterval> | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(c: AudioContext, freq: number, when: number, dur: number, type: OscillatorType, peak: number) {
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.03);
}

export const sound = {
  setMuted(m: boolean) {
    muted = m;
    if (m) sound.stopSpin();
  },
  isMuted() {
    return muted;
  },

  // Sharp, high mechanical click for selections.
  click() {
    if (muted) return;
    const c = ensureCtx();
    if (c) blip(c, 1180, 0, 0.045, "square", 0.05);
  },

  // Triumphant ascending major arpeggio C-E-G-C with a warm echo.
  win() {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((f, i) => blip(c, f, i * 0.1, 0.55, "triangle", 0.16));
    // warm echo
    notes.forEach((f, i) => blip(c, f, 0.34 + i * 0.1, 0.5, "sine", 0.06));
  },

  // Soft descending minor hum — a close try.
  loss() {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    [440, 349.23, 293.66].forEach((f, i) => blip(c, f, i * 0.13, 0.42, "sine", 0.09));
  },

  // Tense rising sweep that loops until stopped (mining can take ~12s + retries).
  startSpin() {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    sound.stopSpin();
    spinOsc = c.createOscillator();
    spinGain = c.createGain();
    spinOsc.type = "sawtooth";
    spinGain.gain.setValueAtTime(0.035, c.currentTime);
    spinOsc.connect(spinGain);
    spinGain.connect(c.destination);
    const sweep = () => {
      if (!ctx || !spinOsc) return;
      const t = ctx.currentTime;
      spinOsc.frequency.cancelScheduledValues(t);
      spinOsc.frequency.setValueAtTime(300, t);
      spinOsc.frequency.exponentialRampToValueAtTime(900, t + 0.42);
    };
    sweep();
    spinTimer = setInterval(sweep, 460);
    spinOsc.start();
  },

  stopSpin() {
    if (spinTimer) {
      clearInterval(spinTimer);
      spinTimer = null;
    }
    if (spinGain && ctx) {
      spinGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
    }
    if (spinOsc && ctx) {
      try {
        spinOsc.stop(ctx.currentTime + 0.1);
      } catch {
        /* already stopped */
      }
    }
    spinOsc = null;
    spinGain = null;
  },
};
