"use client";

import { useWallet } from "@/lib/wallet";
import { useGame } from "@/lib/useGame";
import Navbar from "@/components/Navbar";
import PageHeader from "@/components/PageHeader";
import VaultPanel from "@/components/VaultPanel";
import OnboardingConsole from "@/components/OnboardingConsole";
import Footer from "@/components/Footer";

export default function VaultPage() {
  const { account } = useWallet();
  const api = useGame();

  return (
    <main className="relative mx-auto max-w-6xl px-4">
      <Navbar />

      <PageHeader
        title="🏦 Your Secure Banking Vault"
        subtitle="Manage on-chain deposits and secure withdrawals."
      />

      <section className="relative flex min-h-[55vh] items-center justify-center overflow-hidden py-6">
        {/* High-security vault aurora — neon cyan + deep violet */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-80 w-80 -translate-x-[35%] -translate-y-[60%] rounded-full bg-violet-600/25 blur-3xl" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-72 w-72 -translate-x-[65%] -translate-y-[30%] rounded-full bg-emerald-500/10 blur-3xl" />

        <div className="w-full max-w-md">
          {account ? (
            <VaultPanel api={api} />
          ) : (
            <OnboardingConsole
              title="Welcome to Your Secure Vault"
              subtitle="To manage your on-chain deposits, wins, and withdrawals, please select a connection method below:"
            />
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
