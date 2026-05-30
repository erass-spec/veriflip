"use client";

import { motion } from "framer-motion";
import TokenFace from "./TokenFace";

/**
 * Hero token: gentle infinite levitation + a fast, smooth 3D Y-flip with scale-up on hover.
 */
export default function HeroCoin({ size = 220 }: { size?: number }) {
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
        <div className="coin-face">
          <TokenFace v="heads" />
        </div>
        <div className="coin-face coin-back">
          <TokenFace v="tails" />
        </div>
      </motion.div>
    </div>
  );
}
