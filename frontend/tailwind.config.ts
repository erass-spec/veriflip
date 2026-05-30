import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Premium dark iGaming palette (Stake/Roobet inspired)
        ink: {
          900: "#0a0e1a",
          800: "#0f1424",
          700: "#151b30",
          600: "#1d2640",
        },
        neon: {
          green: "#00e701",
          cyan: "#21d4fd",
          violet: "#7b61ff",
          gold: "#ffd23f",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 40px -8px rgba(0,231,1,0.45)",
        "glow-cyan": "0 0 40px -8px rgba(33,212,253,0.5)",
        "glow-violet": "0 0 40px -8px rgba(123,97,255,0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "pulse-glow": {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.55" },
        },
        breathe: {
          "0%,100%": { boxShadow: "0 0 22px -8px rgba(0,231,1,0.55)" },
          "50%": { boxShadow: "0 0 46px -4px rgba(0,231,1,0.9)" },
        },
        "breathe-cyan": {
          "0%,100%": { boxShadow: "0 0 22px -8px rgba(34,211,238,0.6)" },
          "50%": { boxShadow: "0 0 46px -4px rgba(34,211,238,0.95)" },
        },
        "breathe-violet": {
          "0%,100%": { boxShadow: "0 0 22px -8px rgba(139,92,246,0.6)" },
          "50%": { boxShadow: "0 0 46px -4px rgba(139,92,246,0.95)" },
        },
        "flow-right": {
          "0%": { opacity: "0.25", transform: "translateX(-3px)" },
          "50%": { opacity: "1" },
          "100%": { opacity: "0.25", transform: "translateX(3px)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "badge-pulse": {
          "0%,100%": { boxShadow: "0 0 0 0 rgba(52,211,153,0.45), inset 0 0 12px rgba(52,211,153,0.35)" },
          "50%": { boxShadow: "0 0 0 6px rgba(52,211,153,0), inset 0 0 18px rgba(34,211,238,0.5)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-glow": "pulse-glow 1.8s ease-in-out infinite",
        breathe: "breathe 2.6s ease-in-out infinite",
        "breathe-cyan": "breathe-cyan 2.2s ease-in-out infinite",
        "breathe-violet": "breathe-violet 2.2s ease-in-out infinite",
        "flow-right": "flow-right 1.4s ease-in-out infinite",
        float: "float 3.6s ease-in-out infinite",
        "badge-pulse": "badge-pulse 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
