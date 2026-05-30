"use client";

import { useWallet } from "@/lib/wallet";
import HeroCoin from "./HeroCoin";

/**
 * The disconnected-state "Web3 Onboarding Console" shared by /play and /vault.
 * Floating coin + pulsing aura, warm copy, and two CTAs wired to the exact same
 * connection logic as the header wallet button.
 */
export default function OnboardingConsole({ title, subtitle }: { title: string; subtitle: string }) {
  const { connectMock, connectInjected, connecting, error } = useWallet();

  return (
    <div className="card relative overflow-hidden p-8 text-center shadow-2xl sm:p-10">
      {/* Soft, slowly-pulsing aura behind the coin */}
      <div className="pointer-events-none absolute left-1/2 top-8 h-52 w-52 -translate-x-1/2 animate-pulse-glow rounded-full bg-emerald-500/20 blur-3xl" />
      <div
        className="pointer-events-none absolute left-1/2 top-12 h-40 w-40 -translate-x-1/2 animate-pulse-glow rounded-full bg-cyan-500/15 blur-3xl"
        style={{ animationDelay: "0.7s" }}
      />

      <div className="relative flex flex-col items-center gap-5">
        <HeroCoin size={130} />

        <div>
          <h2 className="gradient-text text-lg font-bold uppercase tracking-[0.18em] sm:text-xl">{title}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/55">{subtitle}</p>
        </div>

        <div className="flex w-full max-w-xs flex-col gap-3">
          {/* Primary — the 1-click demo most judges will use */}
          <button
            onClick={connectMock}
            disabled={connecting}
            className="btn-primary w-full animate-breathe text-base transition-transform duration-300 hover:scale-[1.03] disabled:opacity-60"
          >
            ⚡ Instant Play (DEMO)
          </button>
          {/* Secondary — standard MetaMask connection */}
          <button
            onClick={connectInjected}
            disabled={connecting}
            className="w-full rounded-xl border border-cyan-400/50 bg-slate-950/60 px-5 py-3 font-semibold text-cyan-200 shadow-[0_0_18px_-6px_rgba(34,211,238,0.7)] transition hover:bg-cyan-400/10 hover:shadow-[0_0_24px_-4px_rgba(34,211,238,0.9)] disabled:opacity-60"
          >
            🦊 Connect Browser Wallet
          </button>
        </div>

        {connecting && <p className="text-xs text-white/40">Connecting…</p>}
        {error && <p className="max-w-sm text-xs leading-relaxed text-red-300">{error}</p>}
      </div>
    </div>
  );
}
