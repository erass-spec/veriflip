"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { parseEther, parseEventLogs, toHex } from "viem";
import { useWallet } from "./wallet";
import { coinFlipAbi, GAS_LIMITS, type Side } from "./contract";

export interface GameRow {
  gameId: bigint;
  player: `0x${string}`;
  betAmount: bigint;
  choice: number;
  result: number;
  won: boolean;
  payout: bigint;
  prevrandao: bigint;
  seed: `0x${string}`;
  nonce: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

export interface ChainState {
  balance: bigint;
  bankroll: bigint;
  minBet: bigint;
  maxBet: bigint;
  totalFlips: bigint;
}

const EMPTY: ChainState = { balance: 0n, bankroll: 0n, minBet: 0n, maxBet: 0n, totalFlips: 0n };

function randomSeed(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes) as `0x${string}`;
}

// Public RPCs load-balance and can briefly report a stale nonce right after a tx
// confirms. Retry once on transient send errors so the demo doesn't need a re-click.
async function sendOnce<T>(build: () => Promise<T>): Promise<T> {
  try {
    return await build();
  } catch (e: any) {
    const m = `${e?.shortMessage || e?.details || e?.message || ""}`.toLowerCase();
    if (/nonce|replacement|already known|timeout|fetch|temporar/.test(m)) {
      await new Promise((r) => setTimeout(r, 2500));
      return await build();
    }
    throw e;
  }
}

export function useGame() {
  const { publicClient, walletClient, account, txAccount, network } = useWallet();
  const [state, setState] = useState<ChainState>(EMPTY);
  const [games, setGames] = useState<GameRow[]>([]);
  const [busy, setBusy] = useState(false);

  const address = network?.address;
  const ready = !!publicClient && !!address && address !== "0x";

  // For the mock burner we control the account, so we track the nonce client-side.
  // Load-balanced public RPCs lag reporting the pending nonce right after a tx, which
  // made flip-immediately-after-deposit occasionally fail. Tracking it ourselves (and
  // taking max with the chain's view) keeps writes strictly monotonic. For injected
  // wallets we return undefined and let MetaMask manage its own nonce.
  const nonceRef = useRef<number | null>(null);
  const nonceLock = useRef<Promise<unknown>>(Promise.resolve());
  const isLocalAccount = !!txAccount && typeof txAccount === "object";

  useEffect(() => {
    nonceRef.current = null; // resync on (re)connect / account change
  }, [account]);

  // Allocate the next nonce, SERIALIZED via a promise chain so two rapid clicks can never
  // read-then-increment concurrently and grab the same nonce. Takes max(tracked, chain)
  // to stay monotonic despite public-RPC lag.
  const nextNonce = useCallback(async (): Promise<number | undefined> => {
    if (!isLocalAccount || !publicClient || !account) return undefined;
    const run = async (): Promise<number> => {
      const chainNonce = await publicClient.getTransactionCount({ address: account, blockTag: "pending" });
      const n = nonceRef.current === null ? chainNonce : Math.max(nonceRef.current, chainNonce);
      nonceRef.current = n + 1;
      return n;
    };
    const result = nonceLock.current.catch(() => {}).then(run);
    nonceLock.current = result.catch(() => {}); // keep the lock promise non-rejecting
    return result;
  }, [isLocalAccount, publicClient, account]);

  // On any write failure, drop the tracked nonce so the next attempt re-reads the chain
  // (a failed tx may or may not have consumed its nonce — re-syncing avoids a stuck gap).
  const resetNonce = useCallback(() => {
    nonceRef.current = null;
  }, []);

  const refreshState = useCallback(async () => {
    if (!publicClient || !address || !account) return;
    try {
      const [balance, bankroll, minBet, maxBet, totalFlips] = (await Promise.all([
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "balances", args: [account] }),
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "houseBankroll" }),
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "minBet" }),
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "maxBet" }),
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "totalFlips" }),
      ])) as bigint[];
      setState({ balance, bankroll, minBet, maxBet, totalFlips });
    } catch {
      /* leave prior state; UI surfaces connection errors elsewhere */
    }
  }, [publicClient, address, account]);

  const refreshGames = useCallback(async () => {
    if (!publicClient || !address) return;
    try {
      const latest = await publicClient.getBlockNumber();
      // Local chains are short (scan from genesis); public RPCs cap getLogs ranges
      // (publicnode = 50000 blocks), so bound the window on anything non-local.
      const isLocalChain = publicClient.chain?.id === 31337;
      const span = isLocalChain ? latest : 10_000n; // safe across fallback RPCs' getLogs caps
      const fromBlock = latest > span ? latest - span : 0n;
      const logs = await publicClient.getContractEvents({
        address,
        abi: coinFlipAbi,
        eventName: "BetSettled",
        fromBlock,
        toBlock: "latest",
      });
      const rows: GameRow[] = logs.map((l: any) => ({
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
      }));
      rows.sort((a, b) => Number(b.gameId - a.gameId));
      setGames(rows.slice(0, 25));
    } catch {
      /* ignore — feed is best-effort */
    }
  }, [publicClient, address]);

  useEffect(() => {
    if (ready) {
      refreshState();
      refreshGames();
    }
  }, [ready, refreshState, refreshGames]);

  const deposit = useCallback(
    async (eth: string) => {
      if (!walletClient || !address || !account || !network) throw new Error("not connected");
      setBusy(true);
      try {
        const nonce = await nextNonce();
        const hash = await sendOnce(() =>
          walletClient.writeContract({
            address,
            abi: coinFlipAbi,
            functionName: "deposit",
            value: parseEther(eth),
            account: txAccount!,
            chain: network.chain,
            nonce,
            gas: GAS_LIMITS.deposit,
          })
        );
        await publicClient!.waitForTransactionReceipt({ hash });
        await refreshState();
        return hash;
      } catch (e) {
        resetNonce();
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, publicClient, address, account, txAccount, network, refreshState, nextNonce, resetNonce]
  );

  const withdraw = useCallback(
    async (eth: string) => {
      if (!walletClient || !address || !account || !network) throw new Error("not connected");
      setBusy(true);
      try {
        const nonce = await nextNonce();
        const hash = await sendOnce(() =>
          walletClient.writeContract({
            address,
            abi: coinFlipAbi,
            functionName: "withdraw",
            args: [parseEther(eth)],
            account: txAccount!,
            chain: network.chain,
            nonce,
            gas: GAS_LIMITS.withdraw,
          })
        );
        await publicClient!.waitForTransactionReceipt({ hash });
        await refreshState();
        return hash;
      } catch (e) {
        resetNonce();
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, publicClient, address, account, txAccount, network, refreshState, nextNonce, resetNonce]
  );

  /** Place a flip. Returns the settled game row parsed from the BetSettled event. */
  const flip = useCallback(
    async (choice: Side, eth: string): Promise<GameRow> => {
      if (!walletClient || !publicClient || !address || !account || !network)
        throw new Error("not connected");
      setBusy(true);
      try {
        const seed = randomSeed();
        const nonce = await nextNonce();
        const hash = await sendOnce(() =>
          walletClient.writeContract({
            address,
            abi: coinFlipAbi,
            functionName: "flip",
            args: [choice, seed, parseEther(eth)],
            account: txAccount!,
            chain: network.chain,
            nonce,
            gas: GAS_LIMITS.flip,
          })
        );
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") throw new Error("flip transaction reverted on-chain");
        // Parse the BetSettled event straight from the receipt's own logs — no extra
        // RPC round-trip and no reliance on getLogs-by-blockHash (unsupported on some
        // public RPCs, which previously caused "settlement event not found").
        const events = parseEventLogs({ abi: coinFlipAbi, eventName: "BetSettled", logs: receipt.logs });
        const mine = (events.find((e: any) => e.transactionHash === hash) || events[0]) as any;
        if (!mine) throw new Error("settlement event not found");
        const row: GameRow = {
          gameId: mine.args.gameId,
          player: mine.args.player,
          betAmount: mine.args.betAmount,
          choice: Number(mine.args.choice),
          result: Number(mine.args.result),
          won: mine.args.won,
          payout: mine.args.payout,
          prevrandao: mine.args.prevrandao,
          seed: mine.args.seed,
          nonce: mine.args.nonce,
          txHash: hash,
          blockNumber: receipt.blockNumber,
        };
        await refreshState();
        refreshGames();
        return row;
      } catch (e) {
        resetNonce();
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, publicClient, address, account, txAccount, network, refreshState, refreshGames, nextNonce, resetNonce]
  );

  return { state, games, busy, ready, refreshState, refreshGames, deposit, withdraw, flip };
}
