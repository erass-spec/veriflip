"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { GameRow, LedgerEntry } from "@/lib/useGame";
import { fmtEth6, shortAddr } from "@/lib/format";
import { sideLabel } from "@/lib/fair";
import { useConnectivity, type ConnStatus } from "@/lib/useConnectivity";

// Per-kind terminal styling for the banking rows (matches the Vault deposit/withdraw themes).
const BANK_UI = {
  deposit: {
    icon: "📥",
    label: "DEPOSIT",
    sign: "+",
    prompt: "text-cyan-400",
    iconBox: "bg-cyan-400/15 text-cyan-300",
    accent: "text-cyan-300",
    glow: "[text-shadow:0_0_8px_rgba(34,211,238,0.75)]",
    flash: "rgba(34,211,238,0.20)",
  },
  withdraw: {
    icon: "📤",
    label: "WITHDRAWAL",
    sign: "−",
    prompt: "text-violet-400",
    iconBox: "bg-violet-400/15 text-violet-300",
    accent: "text-violet-300",
    glow: "[text-shadow:0_0_8px_rgba(139,92,246,0.75)]",
    flash: "rgba(139,92,246,0.20)",
  },
} as const;

const ROW = "flex w-full items-center gap-2.5 border-b border-white/5 px-4 py-2.5 text-left text-xs";
const ANIM = {
  layout: true as const,
  animate: { opacity: 1, y: 0, backgroundColor: "rgba(0,0,0,0)" },
  exit: { opacity: 0 },
  transition: { duration: 0.4, backgroundColor: { duration: 1, ease: "easeOut" as const } },
};

const STATUS_UI: Record<ConnStatus, { label: string; text: string; dot: string; ping: string; shadow: string }> = {
  live: {
    label: "live",
    text: "text-emerald-400/70",
    dot: "bg-emerald-500",
    ping: "bg-emerald-500",
    shadow: "shadow-[0_0_8px_rgba(52,211,153,0.9)]",
  },
  reconnecting: {
    label: "reconnecting…",
    text: "text-amber-400/80",
    dot: "bg-amber-400",
    ping: "bg-amber-400",
    shadow: "shadow-[0_0_8px_rgba(251,191,36,0.9)]",
  },
  offline: {
    label: "offline",
    text: "text-red-400/80",
    dot: "bg-red-500",
    ping: "bg-red-500",
    shadow: "shadow-[0_0_8px_rgba(239,68,68,0.9)]",
  },
};

function TerminalHeader() {
  const status = useConnectivity();
  const ui = STATUS_UI[status];
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
      <span className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors duration-500 ${ui.text}`}>
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 transition-colors duration-500 ${ui.ping}`} />
          <span className={`relative inline-flex h-2 w-2 rounded-full transition-colors duration-500 ${ui.dot} ${ui.shadow}`} />
        </span>
        {ui.label}
      </span>
    </div>
  );
}

function BetRow({ g, onSelect }: { g: GameRow; onSelect?: (g: GameRow) => void }) {
  return (
    <motion.button
      {...ANIM}
      initial={{ opacity: 0, y: -14, backgroundColor: "rgba(52,211,153,0.18)" }}
      onClick={() => onSelect?.(g)}
      className={ROW}
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
        {g.won ? `+${fmtEth6(g.payout - g.betAmount)}` : `−${fmtEth6(g.betAmount)}`}
      </span>
    </motion.button>
  );
}

function BankRow({ e }: { e: Extract<LedgerEntry, { kind: "deposit" | "withdraw" }> }) {
  const ui = BANK_UI[e.kind];
  // Banking rows aren't recomputable, so they're non-interactive (a div, not a button).
  return (
    <motion.div {...ANIM} initial={{ opacity: 0, y: -14, backgroundColor: ui.flash }} className={`${ROW} cursor-default`}>
      <span className={ui.prompt}>{">"}</span>
      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] ${ui.iconBox}`}>
        {ui.icon}
      </span>
      <span className="text-cyan-300/80">{shortAddr(e.player)}</span>
      <span className={`font-semibold tracking-wide ${ui.accent} ${ui.glow}`}>{ui.label}</span>
      <span className="ml-auto shrink-0 text-white/30">#{e.txHash.slice(2, 6)}</span>
      <span className={`shrink-0 font-semibold ${ui.accent} ${ui.glow}`}>
        {ui.sign}
        {fmtEth6(e.amount)}
      </span>
    </motion.div>
  );
}

export default function RecentGames({
  entries,
  onSelect,
  compact = false,
}: {
  entries: LedgerEntry[];
  onSelect?: (g: GameRow) => void;
  compact?: boolean;
}) {
  return (
    <div className="glass overflow-hidden hover:border-emerald-500/30">
      <TerminalHeader />
      <div className={`scroll-thin overflow-y-auto bg-black/20 font-mono ${compact ? "max-h-72" : "max-h-[350px]"}`}>
        {entries.length === 0 ? (
          <div className="px-4 py-10 text-center font-mono text-xs text-white/40">
            <span className="text-emerald-400/70">$</span> awaiting on-chain events… be the first to flip 🎲
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {entries.map((e) =>
              e.kind === "bet" ? (
                <BetRow key={e.key} g={e.bet} onSelect={onSelect} />
              ) : (
                <BankRow key={e.key} e={e} />
              )
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
