"use client";

import { useEffect, useState } from "react";
import { sound } from "./sound";

// v2 key: invalidates any stale pre-existing "unmuted" preference so every visitor
// re-defaults to MUTED on next load, then persists their fresh choice going forward.
const KEY = "veriflip_muted_v2";

/**
 * Mute state for the SFX engine, persisted in localStorage.
 * Muted by DEFAULT for first-time visitors (respects browser autoplay policy, never startles).
 * Returning visitors get whatever they last chose. SSR-safe: the initial render is always
 * muted (deterministic — no hydration drift), then the stored preference is applied on mount.
 */
export function useSound() {
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    const initial = stored === null ? true : stored === "true"; // new visitor → muted
    setMuted(initial);
    sound.setMuted(initial);
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    try {
      localStorage.setItem(KEY, next ? "true" : "false");
    } catch {
      /* ignore */
    }
    if (!next) sound.click(); // gesture to unlock the audio context + confirm un-mute
  };

  return { muted, toggle };
}
