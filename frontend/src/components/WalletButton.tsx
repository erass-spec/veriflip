"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";
import { INSTANT_SUBLABEL } from "@/lib/contract";

export default function WalletButton() {
  const { account, network, mode, connecting, connectMock, connectInjected, disconnect, isOwner } =
    useWallet();
  const [open, setOpen] = useState(false);

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 sm:flex">
          <span className="h-2 w-2 rounded-full bg-neon-green shadow-glow" />
          {network?.label}
          {mode === "mock" && <span className="text-neon-cyan">· demo</span>}
        </span>
        <div className="rounded-xl border border-white/10 bg-ink-700 px-3 py-2 font-mono text-sm">
          {isOwner && <span className="mr-1 text-neon-gold">👑</span>}
          {shortAddr(account)}
        </div>
        <button onClick={disconnect} className="btn-ghost px-3 py-2 text-sm">
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="btn-primary"
        disabled={connecting}
        onClick={() => setOpen((o) => !o)}
      >
        {connecting ? "Connecting…" : "Connect Wallet"}
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-white/10 bg-ink-800 shadow-2xl">
          <button
            onClick={async () => {
              setOpen(false);
              await connectMock();
            }}
            className="flex w-full flex-col items-start gap-0.5 border-b border-white/5 px-4 py-3 text-left hover:bg-white/5"
          >
            <span className="font-semibold text-neon-cyan">⚡ Instant Play (no wallet)</span>
            <span className="text-xs text-white/50">
              Burner account · {INSTANT_SUBLABEL}. Real on-chain txs, zero setup.
            </span>
          </button>
          <button
            onClick={async () => {
              setOpen(false);
              await connectInjected();
            }}
            className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-white/5"
          >
            <span className="font-semibold text-white">🦊 Browser Wallet</span>
            <span className="text-xs text-white/50">MetaMask on Sepolia or your local chain.</span>
          </button>
        </div>
      )}
    </div>
  );
}
