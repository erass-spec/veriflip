"use client";

import { motion } from "framer-motion";

/** One face of the futuristic VeriFlip token, built entirely from inline SVG. */
function TokenFace({ v }: { v: "heads" | "tails" }) {
  const accent = v === "heads" ? "#34d399" : "#3b82f6";
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`disc-${v}`} cx="0.4" cy="0.32" r="0.85">
          <stop offset="0" stopColor="#16233f" />
          <stop offset="0.6" stopColor="#0b1426" />
          <stop offset="1" stopColor="#05070d" />
        </radialGradient>
        <linearGradient id={`ring-${v}`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
          <stop stopColor="#34d399" />
          <stop offset="0.5" stopColor="#22d3ee" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
        <filter id={`glow-${v}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id={`spec-${v}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* outer glowing ring */}
      <circle cx="100" cy="100" r="94" fill={`url(#disc-${v})`} stroke={`url(#ring-${v})`} strokeWidth="5" filter={`url(#glow-${v})`} />
      {/* ticked coin edge */}
      <circle cx="100" cy="100" r="86" fill="none" stroke={`url(#ring-${v})`} strokeWidth="3" strokeOpacity="0.55" strokeDasharray="1.5 7" />
      {/* inner neon ring */}
      <circle cx="100" cy="100" r="74" fill="none" stroke={`url(#ring-${v})`} strokeWidth="1.2" strokeOpacity="0.5" />
      {/* top specular highlight for depth */}
      <ellipse cx="84" cy="68" rx="52" ry="34" fill={`url(#spec-${v})`} />

      {v === "heads" ? (
        // Etched Ethereum diamond
        <g filter={`url(#glow-${v})`} stroke={`url(#ring-${v})`} strokeLinejoin="round" fill="none">
          <path d="M100 44 L132 102 L100 122 L68 102 Z" strokeWidth="4" />
          <path d="M68 110 L100 132 L132 110 L100 156 Z" strokeWidth="4" />
          <path d="M100 44 L100 122" strokeWidth="1.5" strokeOpacity="0.6" />
        </g>
      ) : (
        // Stylized VeriFlip "V" / flip motif
        <g filter={`url(#glow-${v})`} stroke={`url(#ring-${v})`} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M64 60 L100 142 L136 60" strokeWidth="7" />
          <path d="M78 64 C 118 78, 118 122, 78 136" strokeWidth="2.4" strokeOpacity="0.45" />
        </g>
      )}
      <circle cx="100" cy="100" r="3" fill={accent} filter={`url(#glow-${v})`} />
    </svg>
  );
}

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
