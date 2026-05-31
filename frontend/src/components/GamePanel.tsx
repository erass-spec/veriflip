"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatEther, parseEther } from "viem";
import { AnimatePresence, motion, useSpring } from "framer-motion";
import { useWallet } from "@/lib/wallet";
import { useGame, type GameRow } from "@/lib/useGame";
import { fmtEth6, friendlyError } from "@/lib/format";
import { PAYOUT_MULTIPLIER, HOUSE_EDGE, type Side } from "@/lib/contract";
import { sound } from "@/lib/sound";
import { useSound } from "@/lib/useSound";
import CoinAnimation from "./CoinAnimation";
import OnboardingConsole from "./OnboardingConsole";

// Below this native-ETH balance the burner can't reliably cover another tx's gas.
const LOW_GAS_WEI = parseEther("0.0015");

// Trim float noise to a clean, parseable decimal string.
const trim = (n: number) => parseFloat(n.toFixed(8)).toString();

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_4px_rgba(52,211,153,0.8)]">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="#34d399" strokeWidth="2" />
      <circle cx="16.5" cy="12.5" r="1.3" fill="#34d399" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_4px_rgba(34,211,238,0.7)]">
      <rect x="4" y="10" width="16" height="10" rx="2" stroke="#22d3ee" strokeWidth="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// Small uppercase step label that guides the player through the flow.
function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">{children}</div>
  );
}

// Glowing gold coin (Heads) + cyan crystal (Tails) button icons.
function CoinFace() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="drop-shadow-[0_0_5px_rgba(255,210,63,0.9)]" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="#ffd23f" stroke="#fff3c4" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="5" fill="none" stroke="#a9760f" strokeWidth="1.2" strokeOpacity="0.6" />
    </svg>
  );
}
function DiamondFace() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" className="drop-shadow-[0_0_5px_rgba(34,211,238,0.9)]" aria-hidden>
      <path d="M12 3 L20 10 L12 21 L4 10 Z" fill="#22d3ee" stroke="#a5f3fc" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// Futuristic "radar/scope" chamber that sits behind the coin — concentric dashed rings
// rotate at different speeds/directions so the coin reads as suspended in a cryptographic
// magnetic field. Pure decoration (aria-hidden); rotation is CSS so it never re-renders.
// `transformBox: fill-box` makes each ring spin about its own centre inside the SVG.
function RadarScope() {
  const spin = { transformBox: "fill-box", transformOrigin: "center" } as const;
  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[290px] w-[290px] -translate-x-1/2 -translate-y-1/2 opacity-50"
    >
      {/* faint static rings + radial scan grid */}
      <circle cx="100" cy="100" r="94" fill="none" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.18" />
      <circle cx="100" cy="100" r="58" fill="none" stroke="#34d399" strokeWidth="0.4" strokeOpacity="0.14" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#22d3ee" strokeWidth="0.4" strokeOpacity="0.12" />
      {/* rotating dashed scope rings */}
      <g style={spin} className="[animation:spin_22s_linear_infinite]">
        <circle cx="100" cy="100" r="86" fill="none" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 9" />
      </g>
      <g style={spin} className="[animation:spin_15s_linear_infinite_reverse]">
        <circle cx="100" cy="100" r="72" fill="none" stroke="#34d399" strokeWidth="1" strokeOpacity="0.32" strokeDasharray="1 7" />
      </g>
      <g style={spin} className="[animation:spin_30s_linear_infinite]">
        <circle cx="100" cy="100" r="46" fill="none" stroke="#22d3ee" strokeWidth="0.8" strokeOpacity="0.28" strokeDasharray="5 11" />
      </g>
      {/* edge crosshair ticks */}
      {[
        [100, 6, 100, 18],
        [100, 182, 100, 194],
        [6, 100, 18, 100],
        [182, 100, 194, 100],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#22d3ee" strokeWidth="0.8" strokeOpacity="0.3" />
      ))}
    </svg>
  );
}

// State-aware ambient glow behind the coin. Keyed per state so transitions remount cleanly
// (idle breathing cyan, flipping fast amber, win bright→halo, loss dim red fade).
type GlowState = "idle" | "flipping" | "win" | "loss";
const GLOW: Record<GlowState, { color: string; initial: Record<string, unknown>; animate: Record<string, unknown>; transition: Record<string, unknown> }> = {
  idle: {
    color: "bg-cyan-500/25",
    initial: { opacity: 0.5, scale: 1 },
    animate: { opacity: [0.4, 0.7, 0.4], scale: [1, 1.06, 1] },
    transition: { duration: 3.2, repeat: Infinity, ease: "easeInOut" },
  },
  flipping: {
    color: "bg-amber-400/30",
    initial: { opacity: 0.6, scale: 1 },
    animate: { opacity: [0.5, 0.95, 0.5], scale: [1, 1.13, 1] },
    transition: { duration: 0.85, repeat: Infinity, ease: "easeInOut" },
  },
  win: {
    color: "bg-emerald-500/35",
    initial: { opacity: 1, scale: 1.4 },
    animate: { opacity: 0.6, scale: 1 },
    transition: { duration: 0.8, ease: "easeOut" },
  },
  loss: {
    color: "bg-red-800/30",
    initial: { opacity: 0.55, scale: 1.12 },
    animate: { opacity: 0.3, scale: 1 },
    transition: { duration: 1.0, ease: "easeOut" },
  },
};

export default function GamePanel({
  api,
  onSettled,
}: {
  api: ReturnType<typeof useGame>;
  onSettled: (g: GameRow) => void;
}) {
  const { account, network, mode } = useWallet();
  const { state, flip, refreshState, busy } = api;
  const [choice, setChoice] = useState<Side>(0);
  const [amount, setAmount] = useState("");
  const [coin, setCoin] = useState<"idle" | "spinning" | "settled">("idle");
  const [last, setLast] = useState<GameRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<null | "flip">(null);

  // Gamification state
  const { muted, toggle: toggleMute } = useSound();
  const [history, setHistory] = useState<boolean[]>([]); // this session's results (oldest→newest)
  const [streak, setStreak] = useState(0);
  const [seedWord, setSeedWord] = useState("veriflip");
  const [seedOpen, setSeedOpen] = useState(false);

  // 3D holographic tilt — spring-smoothed, driven from pointer position (never setState).
  const tiltX = useSpring(0, { stiffness: 150, damping: 15 });
  const tiltY = useSpring(0, { stiffness: 150, damping: 15 });
  function onCoinMove(e: React.MouseEvent) {
    const r = e.currentTarget.getBoundingClientRect();
    tiltY.set(((e.clientX - r.left) / r.width - 0.5) * 16);
    tiltX.set(-((e.clientY - r.top) / r.height - 0.5) * 16);
  }
  function onCoinLeave() {
    tiltX.set(0);
    tiltY.set(0);
  }

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
  // `busy` covers any in-flight tx from the hook (incl. a vault deposit/withdraw), so the
  // flip can't fire while the Vault has a pending transaction (avoids burner nonce clashes).
  const canFlip = !pending && !busy && !invalidAmount && !insufficientBalance && !belowMin && !aboveMax && !lowGas;
  const locked = !!pending || busy; // any in-flight tx locks the whole card's controls

  // "Max" = the largest in-range bet you can afford: min(balance, maxBet).
  const maxAffordableWei = state.balance < state.maxBet ? state.balance : state.maxBet;
  const canMax = !locked && maxAffordableWei >= state.minBet && maxAffordableWei > 0n;
  const setMax = () => setAmount(formatEther(maxAffordableWei));

  const chainName = (network?.label || "chain").replace(" (Hardhat)", "");

  // Selecting a side mirrors the coin to that face. After a settled flip, picking a side
  // clears the result so the coin tactilely rotates to the newly chosen face.
  function selectSide(s: Side) {
    if (locked) return;
    sound.click();
    setChoice(s);
    if (coin === "settled") {
      setLast(null);
      setCoin("idle");
    }
  }

  async function onFlip() {
    setError(null);
    // Defensive: the button is disabled in these states, but never send a doomed tx.
    if (!canFlip) return;
    setPending("flip");
    setLast(null);
    setCoin("spinning");
    sound.flick(); // single coin-toss flick at dispatch; the wait stays silent
    try {
      const row = await flip(choice, amount, seedWord);
      setLast(row);
      setCoin("settled");
      onSettled(row);
      // micro-reward + session tracking (once per flip, here — not in a render effect)
      if (row.won) sound.win();
      else sound.loss();
      setHistory((h) => [...h, row.won].slice(-5));
      setStreak((s) => (row.won ? s + 1 : 0));
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

  if (!account) {
    return (
      <OnboardingConsole
        title="Welcome to the VeriFlip Console"
        subtitle="To begin your on-chain provably fair gaming session, please select a connection method below:"
      />
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
  const glowState: GlowState = coin === "spinning" ? "flipping" : coin === "settled" ? (won ? "win" : "loss") : "idle";
  const glow = GLOW[glowState];

  return (
    <div className="card relative overflow-hidden border border-white/10 bg-slate-900/60 bg-[radial-gradient(rgba(255,255,255,0.025)_1px,transparent_1px)] p-6 backdrop-blur-xl animate-float-glow transition-all duration-500 [background-size:20px_20px]">
      {/* Micro-dashboard stats console + integrated mute control */}
      <div className="mb-5 flex items-stretch gap-2">
        <div className="grid flex-1 grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-slate-950/40">
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              <WalletIcon /> Balance
            </div>
            <div className="mt-0.5 font-mono text-base font-bold text-emerald-400">{fmtEth6(state.balance)}</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              <VaultIcon /> House
            </div>
            <div className="mt-0.5 font-mono text-base font-bold text-white/80">{fmtEth6(state.bankroll)}</div>
          </div>
          <div className="px-3 py-2.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-white/40">Edge · Payout</div>
            <div className="mt-0.5 font-mono text-base font-bold text-neon-gold">
              {HOUSE_EDGE} · {PAYOUT_MULTIPLIER}
            </div>
          </div>
        </div>
        {/* Mute — a clean circular console setting, vertically centered against the stats bar */}
        <button
          onClick={toggleMute}
          title={muted ? "Unmute sound effects" : "Mute sound effects"}
          aria-label={muted ? "Unmute" : "Mute"}
          className="flex h-10 w-10 shrink-0 self-center items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm backdrop-blur transition hover:bg-white/10 hover:shadow-[0_0_14px_-2px_rgba(34,211,238,0.6)]"
        >
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Coin */}
      <div className="relative isolate mb-6 flex flex-col items-center">
        {/* State-aware ambient glow engine */}
        <motion.div
          key={glowState}
          aria-hidden
          initial={glow.initial as any}
          animate={glow.animate as any}
          transition={glow.transition as any}
          className={`pointer-events-none absolute left-1/2 top-1/2 -z-10 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl ${glow.color}`}
        />
        {/* Crisp radar/scope chamber sits above the soft glow, behind the coin */}
        <RadarScope />
        <div className="[perspective:800px]" onMouseMove={onCoinMove} onMouseLeave={onCoinLeave}>
          <motion.div style={{ rotateX: tiltX, rotateY: tiltY, transformStyle: "preserve-3d" }}>
            <CoinAnimation status={coin} result={(last?.result ?? choice) as 0 | 1} size={200} />
          </motion.div>
        </div>
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
              {won ? `🎉 YOU WON +${fmtEth6(last.payout - last.betAmount)} ETH` : "😶 House wins this round"}
            </motion.div>
          )}
          {coin === "spinning" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 animate-pulse-glow text-sm text-neon-cyan"
            >
              Mining on {chainName}… confirming transaction
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Session tracker: last 5 results + win streak */}
      {history.length > 0 && (
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="flex items-center gap-1.5" title="Your last 5 flips this session">
            {history.map((w, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full transition-colors ${
                  w ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" : "bg-slate-600"
                }`}
              />
            ))}
          </div>
          {streak >= 2 && (
            <span
              className="rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-1 font-mono text-xs font-bold text-orange-300"
              style={{ boxShadow: `0 0 ${6 + streak * 3}px rgba(251,146,60,${Math.min(0.35 + streak * 0.1, 0.85)})` }}
            >
              🔥 {streak} Win{streak > 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Choice */}
      <StepLabel>1. Choose your side</StepLabel>
      <div className="mb-5 grid grid-cols-2 gap-3">
        {([0, 1] as Side[]).map((s) => {
          const selected = choice === s;
          const heads = s === 0;
          return (
            <button
              key={s}
              onClick={() => selectSide(s)}
              disabled={locked}
              className={`rounded-xl border-2 py-3 font-bold transition-all duration-300 disabled:opacity-50 ${
                selected
                  ? heads
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-300 shadow-[0_0_18px_-4px_rgba(52,211,153,0.8)]"
                    : "border-cyan-400 bg-cyan-400/10 text-cyan-300 shadow-[0_0_18px_-4px_rgba(34,211,238,0.8)]"
                  : "border-white/10 text-white/50 hover:border-white/25"
              }`}
            >
              <span className="inline-flex items-center justify-center gap-2">
                {heads ? <CoinFace /> : <DiamondFace />}
                {heads ? "Heads" : "Tails"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Amount */}
      <div className="mb-3">
        <StepLabel>2. Set your bet amount</StepLabel>
        <div className="mb-3 flex items-center gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={locked}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-lg outline-none transition focus:border-emerald-400/60 focus:shadow-[0_0_0_3px_rgba(52,211,153,0.15)]"
          />
          <button
            onClick={() => {
              sound.click();
              setMax();
            }}
            disabled={!canMax}
            title="Bet the most you can: min(balance, max bet)"
            className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-3 py-3 text-xs font-bold text-emerald-300 shadow-[0_0_14px_-3px_rgba(52,211,153,0.7)] transition hover:bg-emerald-400/15 hover:shadow-[0_0_20px_-2px_rgba(52,211,153,0.9)] disabled:opacity-40 disabled:shadow-none"
          >
            MAX
          </button>
          <span className="text-white/40">ETH</span>
        </div>
        <StepLabel>Quick presets</StepLabel>
        <div className="flex gap-2">
          {chips.map((q, i) => {
            const active = !!amount && Math.abs(Number(amount) - Number(q)) < 1e-12;
            const tag = i === 0 ? "Min" : i === chips.length - 1 ? "Max" : null;
            return (
              <button
                key={q}
                onClick={() => {
                  sound.click();
                  setAmount(q);
                }}
                disabled={locked}
                className={`flex flex-1 flex-col items-center rounded-lg border py-1.5 transition-all duration-200 disabled:opacity-50 ${
                  active
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_-3px_rgba(52,211,153,0.75)]"
                    : "border-white/10 text-white/60 hover:border-white/25 hover:bg-white/5"
                }`}
              >
                <span className="font-mono text-xs">{q}</span>
                {tag && (
                  <span className={`text-[8px] uppercase tracking-wider ${active ? "text-emerald-300/70" : "text-white/30"}`}>
                    {tag}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-white/30">
            Limits: {fmtEth6(state.minBet)} – {fmtEth6(state.maxBet)} ETH
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

      <button
        onClick={onFlip}
        disabled={!canFlip}
        className={`btn-primary w-full text-lg ${pending === "flip" ? "animate-breathe" : ""}`}
      >
        {pending === "flip" ? (
          <span className="inline-flex items-center gap-2">
            <Spinner /> Mining on {chainName}…
          </span>
        ) : lowGas ? (
          "Demo wallet out of gas"
        ) : insufficientBalance ? (
          "Insufficient balance"
        ) : aboveMax ? (
          "Bet above max"
        ) : belowMin ? (
          "Bet below min"
        ) : (
          `Flip for ${amount || "0"} ETH`
        )}
      </button>

      {(insufficientBalance || state.balance === 0n) && (
        <Link
          href="/vault"
          className="mt-3 block text-center text-xs text-cyan-400 transition hover:text-cyan-300 hover:underline"
        >
          Need test ETH? Open your Vault to deposit →
        </Link>
      )}

      {/* Lucky Seed customizer — your provably-fair client seed */}
      <div className="mt-4 border-t border-white/10 pt-3 text-center">
        <button
          onClick={() => {
            sound.click();
            setSeedOpen((o) => !o);
          }}
          className="font-mono text-xs text-white/40 transition hover:text-white/70"
        >
          Lucky Seed: <span className="text-emerald-300/80">&quot;{seedWord || "random"}&quot;</span> ⚙️
        </button>
        <AnimatePresence>
          {seedOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <input
                value={seedWord}
                onChange={(e) => setSeedWord(e.target.value)}
                disabled={locked}
                maxLength={32}
                placeholder="your seed word"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-center font-mono text-xs outline-none transition placeholder:text-white/25 focus:border-emerald-400/60"
              />
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/35">
                Mixed into every flip&apos;s randomness and shown in the verify panel. Empty = a fresh random seed each flip.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
