"use client";

import { useMemo } from "react";
import type { GameRow } from "@/lib/useGame";
import { recomputeResult, sideLabel } from "@/lib/fair";
import { useWallet } from "@/lib/wallet";

function Line({ k, v }: { k: string; v: string }) {
  return (
    <div className="break-all py-1.5 leading-relaxed">
      <span className="text-emerald-400/80">{k}</span>
      <span className="text-white/30"> = </span>
      <span className="text-cyan-200/80">{v}</span>
    </div>
  );
}

export default function VerifyPanel({ game }: { game: GameRow }) {
  const { network } = useWallet();
  const { hash, result } = useMemo(
    () => recomputeResult(game.prevrandao, game.player, game.seed, game.nonce),
    [game]
  );
  const matches = result === game.result;
  const explorer = network?.explorer;

  return (
    <div className="glass overflow-hidden">
      {/* terminal header */}
      <div className="flex items-center justify-between border-b border-white/10 bg-black/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </span>
          <span className="ml-1 font-mono text-xs text-white/40">verify.sh — provably fair</span>
        </div>
        <span
          className={`rounded-md px-2.5 py-1 font-mono text-xs font-bold ${
            matches
              ? "bg-emerald-400/15 text-emerald-300 shadow-[0_0_16px_-2px_rgba(52,211,153,0.9)]"
              : "bg-red-500/15 text-red-400"
          }`}
        >
          {matches ? "✓ VERIFIED" : "✗ MISMATCH"}
        </span>
      </div>

      <div className="bg-black/20 px-4 py-3 font-mono text-xs">
        <div className="mb-2 text-white/35">
          <span className="text-white/25"># </span>
          recomputed in your browser from public on-chain data
        </div>
        <div className="mb-3 text-white/50">
          result = <span className="text-cyan-300">keccak256(prevrandao, player, seed, nonce) % 2</span>
        </div>

        <Line k="prevrandao" v={game.prevrandao.toString()} />
        <Line k="player" v={game.player} />
        <Line k="seed" v={game.seed} />
        <Line k="nonce" v={game.nonce.toString()} />
        <Line k="keccak256" v={hash} />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/35">recomputed</div>
            <div className="text-sm font-bold text-emerald-300">{sideLabel(result)}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-slate-950/60 p-2.5 text-center">
            <div className="text-[10px] uppercase tracking-wider text-white/35">on-chain</div>
            <div className="text-sm font-bold text-cyan-300">{sideLabel(game.result)}</div>
          </div>
        </div>

        {explorer ? (
          <a
            href={`${explorer}/tx/${game.txHash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 block text-center text-cyan-400 hover:underline"
          >
            view transaction on etherscan ↗
          </a>
        ) : (
          <div className="mt-3 break-all text-center text-white/35">tx: {game.txHash}</div>
        )}
      </div>
    </div>
  );
}
