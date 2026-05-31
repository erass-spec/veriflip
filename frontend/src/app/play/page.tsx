"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/lib/wallet";
import { useGame, type GameRow } from "@/lib/useGame";
import { fmtEth6 } from "@/lib/format";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import GamePanel from "@/components/GamePanel";
import VerifyPanel from "@/components/VerifyPanel";
import RecentGames from "@/components/RecentGames";
import Footer from "@/components/Footer";

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
      <Navbar />

      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <span>{error}</span>
          <button onClick={clearError} className="text-amber-200/60 hover:text-amber-200">
            ✕
          </button>
        </div>
      )}

      <PageHeader
        title="🎰 VeriFlip Gaming Console"
        subtitle="Choose side, set wager, and verify outcomes instantly."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <GamePanel api={api} onSettled={(g) => setSelected(g)} />
          {selected && <VerifyPanel game={selected} />}
        </div>
        <div className="space-y-6">
          <RecentGames entries={api.entries} onSelect={(g) => setSelected(g)} />
          {account && (
            <div className="card p-4">
              <div className="mb-3 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-white/50">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
                System diagnostics
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 font-mono text-xs">
                <dt className="text-white/40">total_flips</dt>
                <dd className="text-right text-emerald-300">{api.state.totalFlips.toString()}</dd>
                <dt className="text-white/40">house_pool</dt>
                <dd className="text-right text-white/80">{fmtEth6(api.state.bankroll)} ETH</dd>
                <dt className="text-white/40">bet_range</dt>
                <dd className="text-right text-white/80">
                  {fmtEth6(api.state.minBet)}–{fmtEth6(api.state.maxBet)}
                </dd>
              </dl>
              <p className="mt-3 text-xs leading-relaxed text-white/40">
                Pick a row in <b className="text-white/60">Recent Flips</b> to re-verify any past outcome.
              </p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}
