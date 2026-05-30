"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

type Status = "idle" | "spinning" | "settled";

export default function CoinAnimation({
  status,
  result,
  size = 200,
}: {
  status: Status;
  result?: 0 | 1; // 0 = Heads, 1 = Tails
  size?: number;
}) {
  const controls = useAnimation();
  const spinRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (status === "spinning") {
        // Fast continuous flips while the tx is pending.
        spinRef.current += 1440;
        controls.start({
          rotateX: spinRef.current,
          transition: { duration: 1.1, ease: "linear", repeat: Infinity },
        });
      } else if (status === "settled" && result !== undefined) {
        // Land on the correct face: Heads at 0°, Tails at 180° (mod 360).
        const base = Math.ceil((spinRef.current + 720) / 360) * 360;
        const target = base + (result === 1 ? 180 : 0);
        spinRef.current = target;
        if (!cancelled)
          await controls.start({
            rotateX: target,
            transition: { duration: 1.4, ease: [0.2, 0.8, 0.2, 1] },
          });
      } else {
        controls.start({ rotateX: spinRef.current, transition: { duration: 0.3 } });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [status, result, controls]);

  const faceStyle = (bg: string, glow: string): React.CSSProperties => ({
    fontSize: size * 0.42,
    background: bg,
    boxShadow: `inset 0 0 ${size * 0.15}px rgba(0,0,0,0.35), 0 0 ${size * 0.2}px ${glow}`,
    color: "#0a0e1a",
    border: `${size * 0.03}px solid rgba(255,255,255,0.25)`,
  });

  return (
    <div className="coin-scene" style={{ width: size, height: size }}>
      <motion.div className="coin" style={{ width: size, height: size }} animate={controls}>
        {/* Heads */}
        <div className="coin-face" style={faceStyle("radial-gradient(circle at 35% 30%, #ffe57a, #ffd23f 45%, #d99e1a)", "rgba(255,210,63,0.6)")}>
          🪙
        </div>
        {/* Tails */}
        <div className="coin-face coin-back" style={faceStyle("radial-gradient(circle at 35% 30%, #8fe9ff, #21d4fd 45%, #1597c0)", "rgba(33,212,253,0.6)")}>
          💎
        </div>
      </motion.div>
    </div>
  );
}
