"use client";

import { useMemo } from "react";
import type { GameRow } from "@/lib/useGame";
import { recomputeResult, sideLabel } from "@/lib/fair";
import { useWallet } from "@/lib/wallet";

function Field({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-1 border-b border-white/5 py-2 last:border-0">
      <span className="text-xs uppercase tracking-wide text-white/40">{label}</span>
      <span className={`break-all text-sm ${mono ? "font-mono text-white/80" : "text-white"}`}>
        {value}
      </span>
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
    <div className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-bold">🔍 Provably Fair — verify it yourself</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${
            matches ? "bg-neon-green/15 text-neon-green" : "bg-red-500/15 text-red-400"
          }`}
        >
          {matches ? "✓ VERIFIED" : "✗ MISMATCH"}
        </span>
      </div>

      <p className="mb-4 text-sm text-white/50">
        Outcome = <span className="font-mono text-neon-cyan">keccak256(prevrandao, player, seed, nonce) % 2</span>.
        Every input below is public on-chain. We recomputed it right here in your browser:
      </p>

      <Field label="Block prevrandao" value={game.prevrandao.toString()} />
      <Field label="Player address" value={game.player} />
      <Field label="Player seed (bytes32)" value={game.seed} />
      <Field label="Nonce" value={game.nonce.toString()} />
      <Field label="Recomputed keccak256" value={hash} />

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-white/10 bg-ink-900/60 p-3 text-center">
          <div className="text-xs text-white/40">Recomputed result</div>
          <div className="text-lg font-bold text-neon-cyan">{sideLabel(result)}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-ink-900/60 p-3 text-center">
          <div className="text-xs text-white/40">On-chain result</div>
          <div className="text-lg font-bold">{sideLabel(game.result)}</div>
        </div>
      </div>

      {explorer && (
        <a
          href={`${explorer}/tx/${game.txHash}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 block text-center text-sm text-neon-cyan hover:underline"
        >
          View transaction on Etherscan ↗
        </a>
      )}
      {!explorer && (
        <div className="mt-4 break-all text-center font-mono text-xs text-white/40">
          tx: {game.txHash}
        </div>
      )}
    </div>
  );
}
