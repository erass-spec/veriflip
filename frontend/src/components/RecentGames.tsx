"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { GameRow } from "@/lib/useGame";
import { fmtEth, shortAddr } from "@/lib/format";
import { sideLabel } from "@/lib/fair";

function TerminalHeader() {
  return (
    <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
        </span>
        <span className="ml-1 font-mono text-xs text-white/40">veriflip@sepolia — live feed</span>
      </div>
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-white/40">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        live
      </span>
    </div>
  );
}

export default function RecentGames({
  games,
  onSelect,
  compact = false,
}: {
  games: GameRow[];
  onSelect?: (g: GameRow) => void;
  compact?: boolean;
}) {
  return (
    <div className="glass overflow-hidden hover:border-emerald-500/30">
      <TerminalHeader />
      <div className={`scroll-thin overflow-y-auto bg-black/20 font-mono ${compact ? "max-h-72" : "max-h-[28rem]"}`}>
        {games.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-white/40">
            <span className="text-emerald-400/70">$</span> awaiting on-chain events… be the first to flip 🎲
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {games.map((g, i) => (
              <motion.button
                key={`${g.txHash}-${g.gameId}`}
                layout
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i, 8) * 0.03 }}
                onClick={() => onSelect?.(g)}
                className="flex w-full items-center gap-2.5 border-b border-white/5 px-4 py-2.5 text-left text-xs transition hover:bg-emerald-500/5"
              >
                <span className={g.won ? "text-emerald-400" : "text-white/30"}>{">"}</span>
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold ${
                    g.won ? "bg-emerald-400/15 text-emerald-400" : "bg-white/5 text-white/40"
                  }`}
                >
                  {g.won ? "W" : "L"}
                </span>
                <span className="text-cyan-300/80">{shortAddr(g.player)}</span>
                <span className="text-white/40">
                  {sideLabel(g.choice).toUpperCase()}→{sideLabel(g.result).toUpperCase()}
                </span>
                <span className="ml-auto shrink-0 text-white/30">#{g.gameId.toString()}</span>
                <span className={`shrink-0 font-semibold ${g.won ? "text-emerald-400" : "text-white/40"}`}>
                  {g.won ? `+${fmtEth(g.payout - g.betAmount)}` : `−${fmtEth(g.betAmount)}`}
                </span>
              </motion.button>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
