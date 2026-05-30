"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import HeroCoin from "@/components/HeroCoin";
import LiveFeed from "@/components/LiveFeed";
import Navbar from "@/components/Navbar";
import { HOUSE_EDGE, PAYOUT_MULTIPLIER } from "@/lib/contract";

const fade = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5, delay },
});

export default function Landing() {
  return (
    <main className="relative mx-auto max-w-6xl px-4">
      <Navbar />

      {/* Hero — clips its own aurora/grid so main can host a sticky nav without horizontal overflow */}
      <section className="relative grid grid-cols-1 items-center gap-6 overflow-hidden pb-8 pt-4 md:grid-cols-2 md:pb-12 md:pt-8">
        {/* Cyberpunk perspective mesh */}
        <div className="perspective-grid pointer-events-none absolute -inset-x-8 -top-10 -z-20 h-[140%]" />
        {/* Aurora glow behind the hero */}
        <div className="pointer-events-none absolute right-0 top-0 -z-10 h-80 w-80 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="pointer-events-none absolute right-10 top-24 -z-10 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl" />
        <div>
          <motion.div {...fade(0)} className="mb-4 inline-flex items-center gap-2 rounded-full border border-neon-green/30 bg-neon-green/10 px-3 py-1 text-xs font-semibold text-neon-green">
            <span className="h-2 w-2 animate-pulse-glow rounded-full bg-neon-green" />
            On-chain · provably recomputable
          </motion.div>
          <motion.h1 {...fade(0.05)} className="text-4xl font-black leading-tight sm:text-5xl md:text-6xl">
            Flip a coin you can <span className="gradient-text">actually verify</span>.
          </motion.h1>
          <motion.p {...fade(0.1)} className="mt-5 max-w-md text-lg text-white/60">
            A 50/50 coin flip settled entirely on-chain. Every outcome is derived from public
            block data — recompute it yourself and prove the house didn’t cheat. Win pays{" "}
            <span className="font-semibold text-neon-gold">{PAYOUT_MULTIPLIER}</span>.
          </motion.p>
          <motion.div {...fade(0.15)} className="mt-8 flex flex-wrap gap-3">
            <Link href="/play" className="btn-primary animate-breathe text-lg transition-transform duration-300 hover:scale-105">
              ▶ Play now
            </Link>
            <a href="#fair" className="btn-ghost text-lg transition-transform duration-300 hover:scale-105">
              How fairness works
            </a>
          </motion.div>
          <motion.div
            {...fade(0.18)}
            className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.06] px-3.5 py-1.5 text-xs font-medium text-emerald-200/90 shadow-[0_0_26px_-8px_rgba(52,211,153,0.7)]"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_4px_rgba(52,211,153,0.9)]">
              <rect x="4" y="10.5" width="16" height="10" rx="2.5" stroke="#34d399" strokeWidth="2" />
              <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="15.5" r="1.6" fill="#34d399" />
            </svg>
            Secured by OpenZeppelin · Verifiable on-chain
          </motion.div>
          <motion.p {...fade(0.2)} className="mt-4 text-sm text-white/40">
            No tokens? Hit <b>⚡ Instant Play</b> and play a real on-chain flip in one click.
          </motion.p>
        </div>
        <motion.div {...fade(0.1)} className="relative flex justify-center">
          <div className="rounded-3xl border border-white/10 bg-ink-800/50 p-12 shadow-glow-violet">
            <HeroCoin size={220} />
          </div>
        </motion.div>
      </section>

      {/* 3-second value props */}
      <section className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-3">
        {[
          { t: "Bet a coin flip", d: "Pick heads or tails, set your stake, flip. Instant settlement.", i: "🪙" },
          { t: "Settled on-chain", d: "Funds, randomness and payouts live in one audited Solidity contract.", i: "⛓️" },
          { t: "Verify every result", d: `keccak256(prevrandao, player, seed, nonce) % 2 — recompute it yourself.`, i: "🔍" },
        ].map((c, i) => (
          <motion.div
            key={c.t}
            {...fade(i * 0.05)}
            className="card p-5 transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-500/30 hover:shadow-glow"
          >
            <div className="text-3xl">{c.i}</div>
            <div className="mt-2 font-bold">{c.t}</div>
            <div className="mt-1 text-sm text-white/50">{c.d}</div>
          </motion.div>
        ))}
      </section>

      {/* How it works */}
      <section className="py-10">
        <motion.h2 {...fade()} className="mb-6 text-center text-3xl font-bold gradient-text">
          How it works
        </motion.h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            { n: 1, t: "Connect", d: "MetaMask, or the one-click Instant Play for an instant demo." },
            { n: 2, t: "Deposit", d: "Move ETH into your in-contract game balance." },
            { n: 3, t: "Flip", d: "Choose a side and stake. The result is decided in one tx." },
            { n: 4, t: "Withdraw", d: "Cash out your balance any time. You hold the keys." },
          ].map((s, i) => (
            <motion.div
              key={s.n}
              {...fade(i * 0.06)}
              className="card relative p-5 transition-all duration-500 hover:-translate-y-1 hover:scale-[1.02] hover:border-emerald-500/30 hover:shadow-glow"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#5eead4,#0891b2)] font-extrabold text-ink-900 animate-badge-pulse">
                {s.n}
              </div>
              <div className="font-bold">{s.t}</div>
              <div className="mt-1 text-sm text-white/50">{s.d}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Provably fair */}
      <section id="fair" className="py-10">
        <div className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
          <motion.div {...fade()}>
            <h2 className="text-3xl font-bold gradient-text">Provably fair, not “trust me”</h2>
            <p className="mt-4 text-white/60">
              Most casinos ask you to trust a black box. VeriFlip derives every flip from data that’s
              already public on the blockchain:
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-ink-900/70 p-4 font-mono text-sm text-neon-cyan">
{`result = keccak256(
  block.prevrandao,
  player,
  yourSeed,
  nonce
) % 2`}
            </pre>
            <p className="mt-4 text-white/60">
              After every flip, the verification panel recomputes the hash in your browser and
              confirms it matches the on-chain result. The contract even exposes{" "}
              <span className="font-mono text-white/80">computeResult()</span> so you can check it directly.
            </p>
            <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200/80">
              <b>Honest note:</b> randomness uses <span className="font-mono">block.prevrandao</span>, which a
              block proposer can influence. That makes VeriFlip <b>verifiable &amp; recomputable</b>, not
              manipulation-proof. Production would use Chainlink VRF or commit–reveal.
            </p>
          </motion.div>
          <motion.div {...fade(0.1)}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-bold gradient-text">Live games</span>
              <Link href="/play" className="text-sm text-cyan-400 hover:underline">
                Open casino ↗
              </Link>
            </div>
            <LiveFeed />
          </motion.div>
        </div>
      </section>

      {/* Stats / why ethereum */}
      <section className="grid grid-cols-2 gap-4 py-5 sm:grid-cols-4">
        {[
          { k: "50 / 50", v: "fair odds" },
          { k: PAYOUT_MULTIPLIER, v: "winner payout" },
          { k: HOUSE_EDGE, v: "house edge" },
          { k: "100%", v: "on-chain" },
        ].map((s, i) => (
          <motion.div
            key={s.v}
            {...fade(i * 0.05)}
            className="card p-5 text-center transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:border-neon-cyan/30 hover:shadow-glow-cyan"
          >
            <div className="text-2xl font-extrabold gradient-text">{s.k}</div>
            <div className="text-xs uppercase tracking-wide text-white/40">{s.v}</div>
          </motion.div>
        ))}
      </section>

      {/* CTA */}
      <section className="relative py-10">
        {/* Neon-green aurora behind the CTA + footer */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 mx-auto h-72 w-3/4 rounded-full bg-neon-green/15 blur-3xl" />
        <motion.div
          {...fade()}
          className="card flex flex-col items-center gap-4 bg-gradient-to-br from-ink-700 to-ink-800 p-10 text-center shadow-glow-cyan transition-all duration-300 hover:shadow-glow"
        >
          <h2 className="text-3xl font-bold gradient-text">Ready to flip?</h2>
          <p className="max-w-md text-white/60">
            One click to a real on-chain coin flip — no tokens required to try the demo.
          </p>
          <Link href="/play" className="btn-primary animate-breathe text-lg transition-transform duration-300 hover:scale-105">
            ▶ Enter the casino
          </Link>
        </motion.div>
      </section>

      <footer className="relative border-t border-white/10 py-6 text-center text-sm text-white/30">
        VeriFlip · on-chain coin flip · built for the hackathon · play responsibly, testnet only.
      </footer>
    </main>
  );
}
