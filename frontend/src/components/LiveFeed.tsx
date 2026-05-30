"use client";

import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { LOCAL_NETWORK, SEPOLIA_NETWORK, coinFlipAbi } from "@/lib/contract";
import type { GameRow } from "@/lib/useGame";
import RecentGames from "./RecentGames";

// Picks Sepolia when an address is configured, else the local chain. Best-effort:
// if the chain is unreachable (e.g. static host, no node) it renders an empty state.
const NET = SEPOLIA_NETWORK.address ? SEPOLIA_NETWORK : LOCAL_NETWORK;

export default function LiveFeed() {
  const [games, setGames] = useState<GameRow[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!NET.address) return;
      try {
        const client = createPublicClient({ chain: NET.chain, transport: http(NET.rpcUrl) });
        const latest = await client.getBlockNumber();
        const span = NET === SEPOLIA_NETWORK ? 9000n : latest;
        const fromBlock = latest > span ? latest - span : 0n;
        const logs = await client.getContractEvents({
          address: NET.address,
          abi: coinFlipAbi,
          eventName: "BetSettled",
          fromBlock,
          toBlock: "latest",
        });
        if (!alive) return;
        const rows = logs
          .map((l: any) => ({
            gameId: l.args.gameId,
            player: l.args.player,
            betAmount: l.args.betAmount,
            choice: Number(l.args.choice),
            result: Number(l.args.result),
            won: l.args.won,
            payout: l.args.payout,
            prevrandao: l.args.prevrandao,
            seed: l.args.seed,
            nonce: l.args.nonce,
            txHash: l.transactionHash,
            blockNumber: l.blockNumber,
          }))
          .sort((a, b) => Number(b.gameId - a.gameId))
          .slice(0, 8);
        setGames(rows);
      } catch {
        /* offline / not deployed — empty state is fine */
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return <RecentGames games={games} compact />;
}
