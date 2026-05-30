"use client";

import { motion } from "framer-motion";

/**
 * VeriFlip brand mark: an inline SVG glowing coin/helix in neon green→cyan that gently
 * "spins" (rotateY) like a flipping coin, beside the gradient wordmark.
 */
export default function BrandLogo({ size = 32, showWordmark = true }: { size?: number; showWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div style={{ width: size, height: size, perspective: 400 }}>
        <motion.svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
        >
          <defs>
            <linearGradient id="vf-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#34d399" />
              <stop offset="0.55" stopColor="#22d3ee" />
              <stop offset="1" stopColor="#3b82f6" />
            </linearGradient>
            <radialGradient id="vf-disc" cx="0.38" cy="0.34" r="0.75">
              <stop stopColor="#0b1220" />
              <stop offset="1" stopColor="#05070d" />
            </radialGradient>
            <filter id="vf-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.4" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* coin disc */}
          <circle cx="24" cy="24" r="21" fill="url(#vf-disc)" stroke="url(#vf-grad)" strokeWidth="2.5" filter="url(#vf-glow)" />
          {/* inner neon ring */}
          <circle cx="24" cy="24" r="15.5" stroke="url(#vf-grad)" strokeWidth="1" strokeOpacity="0.5" />
          {/* double-helix / flip motif: two opposing arcs */}
          <path d="M16 15 C 31 19, 31 29, 16 33" stroke="url(#vf-grad)" strokeWidth="2.6" strokeLinecap="round" filter="url(#vf-glow)" />
          <path d="M32 15 C 17 19, 17 29, 32 33" stroke="url(#vf-grad)" strokeWidth="2.6" strokeLinecap="round" strokeOpacity="0.85" />
          {/* center spark */}
          <circle cx="24" cy="24" r="2.2" fill="#7dffb0" filter="url(#vf-glow)" />
        </motion.svg>
      </div>
      {showWordmark && (
        <span className="text-2xl font-extrabold tracking-tight gradient-text">VeriFlip</span>
      )}
    </div>
  );
}
