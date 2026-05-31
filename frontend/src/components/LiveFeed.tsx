"use client";

import { useEffect, useState } from "react";
import { createPublicClient } from "viem";
import { LOCAL_NETWORK, SEPOLIA_NETWORK, makeTransport } from "@/lib/contract";
import { fetchLedger, type LedgerEntry } from "@/lib/useGame";
import RecentGames from "./RecentGames";

// Picks Sepolia when an address is configured, else the local chain. Best-effort:
// if the chain is unreachable (e.g. static host, no node) it renders an empty state.
const NET = SEPOLIA_NETWORK.address ? SEPOLIA_NETWORK : LOCAL_NETWORK;

export default function LiveFeed() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!NET.address) return;
      try {
        const client = createPublicClient({ chain: NET.chain, transport: makeTransport(NET.chain.id) });
        // Conservative window so getLogs succeeds across fallback RPCs with smaller caps.
        const span = NET === SEPOLIA_NETWORK ? 10_000n : ("all" as const);
        const { entries: ledger } = await fetchLedger(client, NET.address, span);
        if (alive) setEntries(ledger.slice(0, 8));
      } catch {
        /* offline / not deployed — empty state is fine */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return <RecentGames entries={entries} compact />;
}
