"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatEther, parseEther } from "viem";
import { useWallet } from "@/lib/wallet";
import type { useGame } from "@/lib/useGame";
import { fmtEth6, friendlyError } from "@/lib/format";
import { toastSuccess } from "@/lib/toast";

const PRESETS = ["0.002", "0.005", "0.01"];

// Leave a little native ETH in the wallet so the user can still pay the deposit gas fee.
const GAS_RESERVE = parseEther("0.003");

// Truncate (never round up) a wei amount to 6 dp — clean input values that can't exceed balance.
function trimTo6(wei: bigint): string {
  const [int, frac = ""] = formatEther(wei).split(".");
  const t = frac.slice(0, 6).replace(/0+$/, "");
  return t ? `${int}.${t}` : int;
}

type Tab = "deposit" | "withdraw";

function Spinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function FlowBox({ icon, label, value, accent }: { icon: string; label: string; value: string; accent: "cyan" | "violet" | null }) {
  const ring =
    accent === "cyan"
      ? "border-cyan-400/50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.8)]"
      : accent === "violet"
      ? "border-violet-400/50 shadow-[0_0_20px_-6px_rgba(139,92,246,0.8)]"
      : "border-white/10";
  return (
    <div className={`flex-1 rounded-xl border bg-slate-950/60 px-2 py-2.5 text-center transition-all duration-300 ${ring}`}>
      <div className="text-lg leading-none">{icon}</div>
      <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-white/40">{label}</div>
      <div className="font-mono text-xs font-bold text-white/85">{value} ETH</div>
    </div>
  );
}

function FlowArrows({ tab }: { tab: Tab }) {
  const deposit = tab === "deposit";
  const glyph = deposit ? "›" : "‹";
  const color = deposit ? "text-cyan-400" : "text-violet-400";
  return (
    <div className={`flex shrink-0 items-center px-1 ${color}`} aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="animate-pulse text-2xl font-bold leading-none"
          style={{ animationDelay: `${(deposit ? i : 2 - i) * 0.18}s`, textShadow: "0 0 10px currentColor" }}
        >
          {glyph}
        </span>
      ))}
    </div>
  );
}

export default function VaultPanel({ api }: { api: ReturnType<typeof useGame> }) {
  const { account, network } = useWallet();
  const { state, deposit, withdraw, refreshState, busy } = api;
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("0.005");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeposit = tab === "deposit";
  const walletEth = state.gas; // native ETH in the connected wallet
  const gameBal = state.balance; // funds inside the contract vault
  const available = isDeposit ? walletEth : gameBal;

  let amtWei: bigint | null = null;
  try {
    if (amount && Number(amount) > 0) amtWei = parseEther(amount as `${number}`);
  } catch {
    amtWei = null;
  }
  const emptyOrZero = !amount || Number(amount) <= 0;
  const exceeds = amtWei !== null && amtWei > available;
  const valid = amtWei !== null && !exceeds;
  const locked = pending || busy; // any in-flight tx (incl. a flip) locks the vault

  // Smart MAX: deposit reserves a little gas; withdraw cashes out the full vault (0 fees).
  const maxWei = isDeposit ? (walletEth > GAS_RESERVE ? walletEth - GAS_RESERVE : 0n) : gameBal;
  const canMax = !locked && maxWei > 0n;
  const setMax = () => setAmount(trimTo6(maxWei));

  async function submit() {
    setError(null);
    if (!valid) return;
    const sent = amount; // snapshot before we clear the field
    setPending(true);
    try {
      const hash = tab === "deposit" ? await deposit(sent) : await withdraw(sent);
      // Auto-clear so a stale value can't trigger a false "Exceeds available balance".
      setAmount("");
      const verb = tab === "deposit" ? "Deposited" : "Withdrew";
      toastSuccess(
        `${verb} ${sent} ETH!`,
        network?.explorer && hash ? { href: `${network.explorer}/tx/${hash}`, linkLabel: "View on Etherscan" } : undefined
      );
    } catch (e) {
      setError(friendlyError(e));
      refreshState();
    } finally {
      setPending(false);
    }
  }

  if (!account) return null;

  return (
    <div className="card p-5 shadow-2xl transition-all duration-500 hover:border-emerald-500/10">
      <h3 className="mb-4 flex items-center gap-2 text-lg font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]">
          <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#34d399" strokeWidth="2" />
          <circle cx="12" cy="12" r="3.2" stroke="#34d399" strokeWidth="2" />
          <path d="M12 12v3.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="gradient-text">Your Secure Vault</span>
      </h3>

      {/* Wallet → Vault flow diagram */}
      <div className="mb-4 flex items-center gap-1.5">
        <FlowBox icon="🦊" label="Wallet" value={fmtEth6(walletEth)} accent={isDeposit ? null : "violet"} />
        <FlowArrows tab={tab} />
        <FlowBox icon="🏦" label="Game Vault" value={fmtEth6(gameBal)} accent={isDeposit ? "cyan" : null} />
      </div>

      {/* Plain-English explainer */}
      <p className="mb-4 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs leading-relaxed text-white/60">
        <span className="font-semibold text-white/80">How the Vault works:</span> To play, deposit test ETH from your
        connected MetaMask into the secure VeriFlip smart contract. Your funds are protected on-chain, and you can
        withdraw your entire balance back to your wallet instantly at any time with <span className="text-emerald-400">0 fees</span>.
      </p>

      {/* Tabs */}
      <div className="mb-3 grid grid-cols-2 gap-2">
        {(["deposit", "withdraw"] as Tab[]).map((t) => {
          const active = tab === t;
          const accent = t === "deposit" ? "cyan" : "violet";
          return (
            <button
              key={t}
              onClick={() => !locked && setTab(t)}
              disabled={locked}
              className={`rounded-xl border py-2 text-sm font-semibold capitalize transition-all duration-300 disabled:opacity-50 ${
                active
                  ? accent === "cyan"
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300 shadow-[0_0_16px_-4px_rgba(34,211,238,0.8)]"
                    : "border-violet-400/60 bg-violet-400/10 text-violet-300 shadow-[0_0_16px_-4px_rgba(139,92,246,0.8)]"
                  : "border-white/10 text-white/40 hover:text-white/70"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Amount */}
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/40">
        {isDeposit ? "Enter amount to deposit" : "Enter amount to withdraw"}
      </div>
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          // Normalize locale decimal commas to periods so parseEther never reverts.
          onChange={(e) => setAmount(e.target.value.replace(/,/g, "."))}
          disabled={locked}
          placeholder="0.000000"
          className={`w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 font-mono text-lg outline-none transition placeholder:text-white/25 focus:shadow-[0_0_0_3px_rgba(255,255,255,0.06)] ${
            isDeposit ? "focus:border-cyan-400/60" : "focus:border-violet-400/60"
          }`}
        />
        <button
          onClick={setMax}
          disabled={!canMax}
          title={isDeposit ? "Deposit your wallet balance (less a little gas)" : "Withdraw your full vault balance"}
          className="rounded-xl border border-emerald-400/40 bg-emerald-400/5 px-3 py-3 text-xs font-bold text-emerald-300 shadow-[0_0_14px_-3px_rgba(52,211,153,0.7)] transition hover:bg-emerald-400/15 hover:shadow-[0_0_20px_-2px_rgba(52,211,153,0.9)] disabled:opacity-40 disabled:shadow-none"
        >
          MAX
        </button>
        <span className="text-white/40">ETH</span>
      </div>

      {/* Presets */}
      <div className="mb-1 flex gap-2">
        {PRESETS.map((p) => {
          const active = !!amount && Math.abs(Number(amount) - Number(p)) < 1e-12;
          return (
            <button
              key={p}
              onClick={() => setAmount(p)}
              disabled={locked}
              className={`flex-1 rounded-lg border py-1.5 font-mono text-xs transition-all duration-200 disabled:opacity-50 ${
                active
                  ? isDeposit
                    ? "border-cyan-400/60 bg-cyan-400/10 text-cyan-300"
                    : "border-violet-400/60 bg-violet-400/10 text-violet-300"
                  : "border-white/10 text-white/60 hover:border-white/25 hover:bg-white/5"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
      <div className="mb-3 mt-1 text-right text-[11px] text-white/30">
        Available: {fmtEth6(available)} ETH
        {exceeds && <span className="ml-2 font-semibold text-red-400">⚠ Exceeds available</span>}
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action button */}
      <button
        onClick={submit}
        disabled={!valid || locked}
        className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
          isDeposit
            ? "bg-cyan-500 text-ink-900 shadow-[0_0_24px_-6px_rgba(34,211,238,0.9)] hover:brightness-110"
            : "bg-violet-500 text-white shadow-[0_0_24px_-6px_rgba(139,92,246,0.9)] hover:brightness-110"
        } ${pending ? (isDeposit ? "animate-breathe-cyan" : "animate-breathe-violet") : ""}`}
      >
        {pending ? (
          <>
            <Spinner />
            {isDeposit ? "Securing transaction on-chain…" : "Withdrawing to MetaMask…"}
          </>
        ) : emptyOrZero ? (
          "Enter an Amount"
        ) : exceeds ? (
          "Exceeds available balance"
        ) : isDeposit ? (
          `Deposit ${amount} ETH to Vault`
        ) : (
          `Withdraw ${amount} ETH to Wallet`
        )}
      </button>

      {/* Decentralized network footnote */}
      <p className="mt-3 text-center text-[10px] leading-relaxed text-white/30">
        Note: Transactions on Sepolia are processed by decentralized validators. Network gas fees go to Ethereum
        miners, not VeriFlip.
      </p>
    </div>
  );
}
