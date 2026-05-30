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
        <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-slate-950/60 px-3 py-1.5 text-xs text-white/70 backdrop-blur sm:flex">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
          </span>
          {network?.label}
          {mode === "mock" && <span className="text-cyan-400">· demo</span>}
        </span>
        <div className="rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 font-mono text-sm backdrop-blur">
          {isOwner && <span className="mr-1 text-neon-gold">👑</span>}
          <span className="hidden sm:inline">{shortAddr(account)}</span>
          <span className="sm:hidden">…{account.slice(-4)}</span>
        </div>
        <button onClick={disconnect} title="Disconnect" className="btn-ghost px-3 py-2 text-sm">
          <span className="hidden sm:inline">Disconnect</span>
          <span className="sm:hidden">✕</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        className="btn-primary whitespace-nowrap px-4"
        disabled={connecting}
        onClick={() => setOpen((o) => !o)}
      >
        {connecting ? "Connecting…" : <><span className="sm:hidden">Connect</span><span className="hidden sm:inline">Connect Wallet</span></>}
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
