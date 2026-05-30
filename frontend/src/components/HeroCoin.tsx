"use client";

import { motion } from "framer-motion";

/**
 * Landing-hero coin: gently levitates forever, and on hover does a fast, smooth 3D
 * Y-axis flip with a subtle scale-up, easing back to floating on leave.
 * Reuses the .coin / .coin-face 3D CSS (heads at rotateY 0, tails at .coin-back 180°).
 */
export default function HeroCoin({ size = 220 }: { size?: number }) {
  const faceStyle = (bg: string, glow: string): React.CSSProperties => ({
    fontSize: size * 0.42,
    background: bg,
    boxShadow: `inset 0 0 ${size * 0.15}px rgba(0,0,0,0.35), 0 0 ${size * 0.2}px ${glow}`,
    color: "#0a0e1a",
    border: `${size * 0.03}px solid rgba(255,255,255,0.25)`,
  });

  return (
    <div className="coin-scene cursor-pointer" style={{ width: size, height: size }}>
      <motion.div
        className="coin"
        style={{ width: size, height: size }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{
          rotateY: 360,
          scale: 1.08,
          transition: { rotateY: { duration: 0.9, ease: "easeInOut" }, scale: { duration: 0.3 } },
        }}
      >
        {/* Heads (front, rotateY 0) */}
        <div
          className="coin-face"
          style={faceStyle(
            "radial-gradient(circle at 35% 30%, #ffe57a, #ffd23f 45%, #d99e1a)",
            "rgba(255,210,63,0.6)"
          )}
        >
          🪙
        </div>
        {/* Tails (back, rotateY 180) */}
        <div
          className="coin-face coin-back"
          style={faceStyle(
            "radial-gradient(circle at 35% 30%, #8fe9ff, #21d4fd 45%, #1597c0)",
            "rgba(33,212,253,0.6)"
          )}
        >
          💎
        </div>
      </motion.div>
    </div>
  );
}
