"use client";

import { useEffect, useMemo, useState } from "react";
import { formatEther, parseEther } from "viem";
import { AnimatePresence, motion } from "framer-motion";
import { useWallet } from "@/lib/wallet";
import { useGame, type GameRow } from "@/lib/useGame";
import { fmtEth, friendlyError } from "@/lib/format";
import { PAYOUT_MULTIPLIER, HOUSE_EDGE, type Side } from "@/lib/contract";
import CoinAnimation from "./CoinAnimation";

// Below this native-ETH balance the burner can't reliably cover another tx's gas.
const LOW_GAS_WEI = parseEther("0.0015");

// Trim float noise to a clean, parseable decimal string.
const trim = (n: number) => parseFloat(n.toFixed(8)).toString();

export default function GamePanel({
  api,
  onSettled,
}: {
  api: ReturnType<typeof useGame>;
  onSettled: (g: GameRow) => void;
}) {
  const { account, network, mode } = useWallet();
  const { state, deposit, withdraw, flip, refreshState } = api;
  const [choice, setChoice] = useState<Side>(0);
  const [amount, setAmount] = useState("");
  const [coin, setCoin] = useState<"idle" | "spinning" | "settled">("idle");
  const [last, setLast] = useState<GameRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "flip" | "deposit" | "withdraw">(null);
  const [banking, setBanking] = useState<"deposit" | "withdraw">("deposit");
  const [bankAmt, setBankAmt] = useState("");

  const noContract = !network?.address || network.address === ("0x" as string);

  // Derive controls from the on-chain bet limits so the same UI works on any network
  // (local maxBet 1 ETH vs. Sepolia maxBet 0.002 ETH). Hardcoded values would throw
  // BetOutOfRange / insufficient-gas on the small-limit public demo.
  const maxEth = state.maxBet > 0n ? Number(formatEther(state.maxBet)) : 0;
  const minEth = state.minBet > 0n ? Number(formatEther(state.minBet)) : 0;
  const chips = useMemo(
    () => (maxEth > 0 ? [0.2, 0.5, 0.8, 1].map((f) => trim(maxEth * f)) : ["0.01", "0.05", "0.1", "0.25"]),
    [maxEth]
  );

  useEffect(() => {
    if (maxEth <= 0) return;
    const a = Number(amount);
    if (!(a >= minEth && a <= maxEth)) setAmount(trim(maxEth * 0.5)); // snap bet into range
    const b = Number(bankAmt);
    if (!(b > 0) || b > maxEth * 5) setBankAmt(trim(maxEth * 2)); // gentle, affordable deposit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minEth, maxEth]);

  // --- Bet validation (drives the disabled Flip button + inline warnings). All checks
  // mirror the contract's require()s so a bet can never be sent that would revert. ---
  let betWei: bigint | null = null;
  try {
    if (amount && Number(amount) > 0) betWei = parseEther(amount as `${number}`);
  } catch {
    betWei = null;
  }
  const invalidAmount = betWei === null;
  const insufficientBalance = betWei !== null && betWei > state.balance;
  const belowMin = betWei !== null && state.minBet > 0n && betWei < state.minBet;
  const aboveMax = betWei !== null && state.maxBet > 0n && betWei > state.maxBet;
  // Burner-only: native ETH too low to pay gas for another flip.
  const lowGas = mode === "mock" && state.gas > 0n && state.gas < LOW_GAS_WEI;
  const canFlip = !pending && !invalidAmount && !insufficientBalance && !belowMin && !aboveMax && !lowGas;

  async function onFlip() {
    setError(null);
    // Defensive: the button is disabled in these states, but never send a doomed tx.
    if (!canFlip) return;
    setPending("flip");
    setLast(null);
    setCoin("spinning");
    try {
      const row = await flip(choice, amount);
      setLast(row);
      setCoin("settled");
      onSettled(row);
    } catch (e) {
      console.error("[wibe] flip failed —", (e as any)?.shortMessage || (e as any)?.details || (e as any)?.message, e);
      setCoin("idle");
      setError(friendlyError(e));
      // Re-sync on failure so a stale balance/nonce can't cause a repeat-revert loop.
      refreshState();
    } finally {
      setPending(null);
    }
  }

  async function onBank() {
    setError(null);
    if (!bankAmt || Number(bankAmt) <= 0) return setError("Enter an amount.");
    setPending(banking);
    try {
      if (banking === "deposit") await deposit(bankAmt);
      else await withdraw(bankAmt);
    } catch (e) {
      console.error("[wibe] bank tx failed —", (e as any)?.shortMessage || (e as any)?.message, e);
      setError(friendlyError(e));
      refreshState();
    } finally {
      setPending(null);
    }
  }

  if (!account) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-10 text-center">
        <CoinAnimation status="idle" result={0} size={120} />
        <p className="text-white/60">Connect a wallet to start flipping.</p>
        <p className="text-sm text-white/40">Tip: use ⚡ Instant Play for an instant on-chain demo.</p>
      </div>
    );
  }

  if (noContract) {
    return (
      <div className="card p-8 text-center text-white/60">
        The contract isn’t deployed on <b>{network?.label}</b> yet. Switch to the local chain or Sepolia.
      </div>
    );
  }

  const won = last?.won;

  return (
    <div className="card relative overflow-hidden p-6">
      {/* Balance header */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/40">Your balance</div>
          <div className="text-2xl font-bold text-neon-green">{fmtEth(state.balance)} ETH</div>
        </div>
        <div className="text-right text-xs text-white/40">
          <div>House bankroll: {fmtEth(state.bankroll)} ETH</div>
          <div>
            Edge {HOUSE_EDGE} · win pays <span className="text-neon-gold">{PAYOUT_MULTIPLIER}</span>
          </div>
        </div>
      </div>

      {/* Coin */}
      <div className="relative mb-6 flex flex-col items-center">
        <CoinAnimation status={coin} result={(last?.result ?? choice) as 0 | 1} size={200} />
        <AnimatePresence>
          {coin === "settled" && last && (
            <motion.div
              initial={{ scale: 0.6, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 18 }}
              className={`mt-4 rounded-2xl px-6 py-3 text-center text-xl font-extrabold ${
                won ? "bg-neon-green/15 text-neon-green shadow-glow" : "bg-white/5 text-white/60"
              }`}
            >
              {won ? `🎉 YOU WON +${fmtEth(last.payout - last.betAmount)} ETH` : "😶 House wins this round"}
            </motion.div>
          )}
          {coin === "spinning" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 animate-pulse-glow text-sm text-neon-cyan"
            >
              Flipping on-chain… confirming transaction
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Choice */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {([0, 1] as Side[]).map((s) => (
          <button
            key={s}
            onClick={() => setChoice(s)}
            disabled={!!pending}
            className={`rounded-xl border-2 py-3 font-bold transition ${
              choice === s
                ? s === 0
                  ? "border-neon-gold bg-neon-gold/10 text-neon-gold"
                  : "border-neon-cyan bg-neon-cyan/10 text-neon-cyan"
                : "border-white/10 text-white/50 hover:border-white/25"
            }`}
          >
            {s === 0 ? "🪙 Heads" : "💎 Tails"}
          </button>
        ))}
      </div>

      {/* Amount */}
      <div className="mb-3">
        <div className="mb-2 flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!!pending}
            className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-3 font-mono text-lg outline-none focus:border-neon-green/50"
          />
          <span className="text-white/40">ETH</span>
        </div>
        <div className="flex gap-2">
          {chips.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              disabled={!!pending}
              className="flex-1 rounded-lg border border-white/10 py-1.5 text-xs text-white/60 hover:bg-white/5"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="mt-1 flex items-center justify-between text-xs">
          <span className="text-white/30">
            Limits: {fmtEth(state.minBet)} – {fmtEth(state.maxBet)} ETH
          </span>
          {insufficientBalance ? (
            <span className="font-semibold text-red-400">⚠ Insufficient balance</span>
          ) : aboveMax ? (
            <span className="font-semibold text-red-400">⚠ Above max bet</span>
          ) : belowMin ? (
            <span className="font-semibold text-red-400">⚠ Below min bet</span>
          ) : null}
        </div>
      </div>

      {/* Inline alerts — kept right by the action so they're seen without scrolling */}
      <AnimatePresence>
        {lowGas && (
          <motion.div
            key="lowgas"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
          >
            ⛽ Demo burner wallet is out of gas. Please import your own wallet (🦊 Browser Wallet) or wait for a top-up.
          </motion.div>
        )}
        {error && (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={onFlip} disabled={!canFlip} className="btn-primary w-full text-lg">
        {pending === "flip"
          ? "Flipping…"
          : lowGas
          ? "Demo wallet out of gas"
          : insufficientBalance
          ? "Insufficient balance"
          : aboveMax
          ? "Bet above max"
          : belowMin
          ? "Bet below min"
          : `Flip for ${amount || "0"} ETH`}
      </button>

      {/* Banking */}
      <div className="mt-5 border-t border-white/10 pt-4">
        <div className="mb-2 flex gap-2 text-sm">
          {(["deposit", "withdraw"] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBanking(b)}
              className={`flex-1 rounded-lg py-1.5 font-semibold capitalize ${
                banking === b ? "bg-white/10 text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              {b}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            step="0.1"
            min="0"
            value={bankAmt}
            onChange={(e) => setBankAmt(e.target.value)}
            disabled={!!pending}
            className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-4 py-2.5 font-mono outline-none focus:border-neon-cyan/50"
          />
          <button onClick={onBank} disabled={!!pending} className="btn-ghost whitespace-nowrap capitalize">
            {pending === banking ? "…" : banking}
          </button>
        </div>
      </div>
    </div>
  );
}
