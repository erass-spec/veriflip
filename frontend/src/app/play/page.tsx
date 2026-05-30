"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { useGame, type GameRow } from "@/lib/useGame";
import WalletButton from "@/components/WalletButton";
import BrandLogo from "@/components/BrandLogo";
import GamePanel from "@/components/GamePanel";
import VerifyPanel from "@/components/VerifyPanel";
import RecentGames from "@/components/RecentGames";

export default function PlayPage() {
  const { account, error, clearError } = useWallet();
  const api = useGame();
  const [selected, setSelected] = useState<GameRow | null>(null);

  // Keep the verify panel pointed at the most recent game by default.
  useEffect(() => {
    if (!selected && api.games.length > 0) setSelected(api.games[0]);
  }, [api.games, selected]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="sticky top-3 z-50 mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 shadow-lg backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2">
          <BrandLogo />
          <span className="font-mono text-xs text-white/30">/ play</span>
        </Link>
        <WalletButton />
      </header>

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <span>{error}</span>
          <button onClick={clearError} className="text-amber-200/60 hover:text-amber-200">
            ✕
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <GamePanel api={api} onSettled={(g) => setSelected(g)} />
          {selected && <VerifyPanel game={selected} />}
        </div>
        <div className="space-y-6">
          <RecentGames games={api.games} onSelect={(g) => setSelected(g)} />
          {account && (
            <div className="card p-4 text-xs text-white/40">
              <div className="mb-2 font-semibold text-white/60">This session</div>
              Total flips on contract: {api.state.totalFlips.toString()}
              <div className="mt-2">
                Pick a row in <b>Recent Flips</b> to re-verify any past outcome.
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
