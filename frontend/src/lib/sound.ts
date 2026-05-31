/**
 * Lightweight synthesized SFX via the Web Audio API — no external audio files.
 * One shared AudioContext, created lazily inside a user gesture (autoplay-safe).
 * Mute state is mirrored here and gated per-play; the React layer persists it.
 */

let ctx: AudioContext | null = null;
let muted = true; // muted by default until useSound applies the stored preference

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

  // Single metallic "coin flick" — bright inharmonic ping with a slight downward bend
  // and fast exponential decay to silence (~0.75s). Played once when a flip is dispatched.
  flick() {
    if (muted) return;
    const c = ensureCtx();
    if (!c) return;
    const t0 = c.currentTime;
    const partials: Array<[number, number, OscillatorType]> = [
      [2500, 0.14, "triangle"],
      [3730, 0.06, "sine"],
      [5200, 0.03, "sine"],
    ];
    for (const [f, peak, type] of partials) {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f, t0);
      o.frequency.exponentialRampToValueAtTime(f * 0.86, t0 + 0.7); // subtle flick bend
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + 0.008); // fast attack
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.75); // fast decay to silence
      o.connect(g);
      g.connect(c.destination);
      o.start(t0);
      o.stop(t0 + 0.8);
    }
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
};
