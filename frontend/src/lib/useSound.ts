"use client";

import { useEffect, useState } from "react";
import { sound } from "./sound";

const KEY = "vf_muted";

/** Mute state for the SFX engine, persisted in localStorage. SSR-safe (defaults unmuted). */
export function useSound() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" && localStorage.getItem(KEY) === "1";
    setMuted(stored);
    sound.setMuted(stored);
  }, []);

  const toggle = () => {
    const next = !muted;
    setMuted(next);
    sound.setMuted(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
    if (!next) sound.click(); // gesture to unlock the audio context + confirm un-mute
  };

  return { muted, toggle };
}
