"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";
import TokenFace from "./TokenFace";

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

  return (
    <div className="coin-scene" style={{ width: size, height: size }}>
      <motion.div className="coin" style={{ width: size, height: size }} animate={controls}>
        {/* Heads (front) */}
        <div className="coin-face">
          <TokenFace v="heads" />
        </div>
        {/* Tails (back) — flipped on the X axis to match the rotateX spin */}
        <div className="coin-face" style={{ transform: "rotateX(180deg)" }}>
          <TokenFace v="tails" />
        </div>
      </motion.div>
    </div>
  );
}
