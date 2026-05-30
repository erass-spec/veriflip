"use client";

import type { GameRow } from "@/lib/useGame";
import { fmtEth, shortAddr } from "@/lib/format";
import { sideLabel } from "@/lib/fair";

export default function RecentGames({
  games,
  onSelect,
  compact = false,
}: {
  games: GameRow[];
  onSelect?: (g: GameRow) => void;
  compact?: boolean;
}) {
  if (games.length === 0) {
    return (
      <div className="card flex h-full min-h-[160px] items-center justify-center p-6 text-center text-sm text-white/40">
        No flips yet — be the first to play. 🎲
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <h3 className="font-bold">🕒 Recent Flips</h3>
        <span className="flex items-center gap-1.5 text-xs text-white/40">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
          </span>
          live from on-chain events
        </span>
      </div>
      <div className={`scroll-thin divide-y divide-white/5 overflow-y-auto ${compact ? "max-h-72" : "max-h-[28rem]"}`}>
        {games.map((g) => (
          <button
            key={`${g.txHash}-${g.gameId}`}
            onClick={() => onSelect?.(g)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                g.won ? "bg-neon-green/15 text-neon-green" : "bg-white/5 text-white/50"
              }`}
            >
              {g.won ? "W" : "L"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-white/70">{shortAddr(g.player)}</span>
                <span className="text-white/30">·</span>
                <span className="text-white/60">
                  picked {sideLabel(g.choice)} → {sideLabel(g.result)}
                </span>
              </div>
              <div className="text-xs text-white/40">
                bet {fmtEth(g.betAmount)} ETH · #{g.gameId.toString()}
              </div>
            </div>
            <span className={`shrink-0 text-sm font-semibold ${g.won ? "text-neon-green" : "text-white/40"}`}>
              {g.won ? `+${fmtEth(g.payout - g.betAmount)}` : `−${fmtEth(g.betAmount)}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
