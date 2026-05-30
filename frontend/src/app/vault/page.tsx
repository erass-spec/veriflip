"use client";

import { useWallet } from "@/lib/wallet";
import { useGame } from "@/lib/useGame";
import Navbar from "@/components/Navbar";
import VaultPanel from "@/components/VaultPanel";
import Footer from "@/components/Footer";

export default function VaultPage() {
  const { account } = useWallet();
  const api = useGame();

  return (
    <main className="relative mx-auto max-w-6xl px-4">
      <Navbar />

      <section className="relative flex min-h-[62vh] items-center justify-center overflow-hidden py-10">
        {/* High-security vault aurora — neon cyan + deep violet */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-80 w-80 -translate-x-[35%] -translate-y-[60%] rounded-full bg-violet-600/25 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-[65%] -translate-y-[30%] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="w-full max-w-md">
          {account ? (
            <VaultPanel api={api} />
          ) : (
            <div className="card flex flex-col items-center gap-3 p-10 text-center shadow-2xl">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]">
                <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="#34d399" strokeWidth="2" />
                <circle cx="12" cy="12" r="3.4" stroke="#34d399" strokeWidth="2" />
                <path d="M12 12v3.6" stroke="#34d399" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <h1 className="text-xl font-bold gradient-text">Your Secure Vault</h1>
              <p className="text-sm text-white/60">Connect a wallet to access your on-chain cashier.</p>
              <p className="text-xs text-white/40">Use ⚡ Instant Play in the top bar to connect in one click.</p>
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
