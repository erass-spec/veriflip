"use client";

import { useWallet } from "@/lib/wallet";

// Compact, softly-pulsing badge that makes the active connection mode obvious to judges.
// Renders nothing until a wallet is connected (deterministic on the server → no hydration drift).
export default function ModeBadge() {
  const { account, mode } = useWallet();
  if (!account) return null;
  const demo = mode === "mock";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] backdrop-blur ${
        demo
          ? "animate-breathe border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
          : "animate-breathe-cyan border-cyan-400/50 bg-cyan-400/10 text-cyan-200"
      }`}
    >
      {demo ? "⚡ Demo Mode" : "🦊 MetaMask"}
    </span>
  );
}
