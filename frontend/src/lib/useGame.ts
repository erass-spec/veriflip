"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { keccak256, parseEther, parseEventLogs, toBytes, toHex } from "viem";
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

// A unified on-chain activity entry — bets, deposits and withdrawals share one timeline.
// blockNumber + logIndex give a true chronological key across all three event types.
export type LedgerEntry =
  | { kind: "bet"; key: string; blockNumber: bigint; logIndex: number; bet: GameRow }
  | {
      kind: "deposit" | "withdraw";
      key: string;
      blockNumber: bigint;
      logIndex: number;
      player: `0x${string}`;
      amount: bigint;
      txHash: `0x${string}`;
    };

export interface ChainState {
  balance: bigint; // withdrawable in-contract game balance
  bankroll: bigint;
  minBet: bigint;
  maxBet: bigint;
  totalFlips: bigint;
  gas: bigint; // the wallet's native ETH (pays gas) — used to warn when the burner is dry
}

const EMPTY: ChainState = { balance: 0n, bankroll: 0n, minBet: 0n, maxBet: 0n, totalFlips: 0n, gas: 0n };

function randomSeed(): `0x${string}` {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toHex(bytes) as `0x${string}`;
}

function mapGameRow(l: any): GameRow {
  return {
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
  };
}

// Newest first: primary key blockNumber (desc), tiebreak logIndex (desc).
function byRecency(a: LedgerEntry, b: LedgerEntry): number {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber > b.blockNumber ? -1 : 1;
  return b.logIndex - a.logIndex;
}

/**
 * Fetch the unified on-chain ledger — BetSettled + Deposited + Withdrawn — over the
 * given block window, merged into one chronological feed. Returns `bets` separately
 * (the verify panel still needs raw GameRows). Shared by the live hook and the landing feed.
 */
export async function fetchLedger(
  client: any,
  address: `0x${string}`,
  span: bigint | "all"
): Promise<{ bets: GameRow[]; entries: LedgerEntry[] }> {
  const latest = await client.getBlockNumber();
  const fromBlock = span === "all" ? 0n : latest > span ? latest - span : 0n;
  const opts = { address, abi: coinFlipAbi, fromBlock, toBlock: "latest" as const };
  const [betLogs, depLogs, wdrLogs] = await Promise.all([
    client.getContractEvents({ ...opts, eventName: "BetSettled" }),
    client.getContractEvents({ ...opts, eventName: "Deposited" }),
    client.getContractEvents({ ...opts, eventName: "Withdrawn" }),
  ]);

  const bets: GameRow[] = betLogs.map(mapGameRow).sort((a: GameRow, b: GameRow) => Number(b.gameId - a.gameId));

  const entries: LedgerEntry[] = [
    ...betLogs.map((l: any) => ({
      kind: "bet" as const,
      key: `${l.transactionHash}-${l.logIndex}`,
      blockNumber: l.blockNumber,
      logIndex: Number(l.logIndex),
      bet: mapGameRow(l),
    })),
    ...depLogs.map((l: any) => ({
      kind: "deposit" as const,
      key: `${l.transactionHash}-${l.logIndex}`,
      blockNumber: l.blockNumber,
      logIndex: Number(l.logIndex),
      player: l.args.player,
      amount: l.args.amount,
      txHash: l.transactionHash,
    })),
    ...wdrLogs.map((l: any) => ({
      kind: "withdraw" as const,
      key: `${l.transactionHash}-${l.logIndex}`,
      blockNumber: l.blockNumber,
      logIndex: Number(l.logIndex),
      player: l.args.player,
      amount: l.args.amount,
      txHash: l.transactionHash,
    })),
  ].sort(byRecency);

  return { bets: bets.slice(0, 25), entries: entries.slice(0, 30) };
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
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
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
  // Mirror the latest in-contract balance so post-settle optimistic math never reads a
  // stale closure value.
  const balanceRef = useRef<bigint>(0n);

  useEffect(() => {
    nonceRef.current = null; // resync on (re)connect / account change
  }, [account]);

  useEffect(() => {
    balanceRef.current = state.balance;
  }, [state.balance]);

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
      const [balance, bankroll, minBet, maxBet, totalFlips, gas] = (await Promise.all([
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "balances", args: [account] }),
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "houseBankroll" }),
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "minBet" }),
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "maxBet" }),
        publicClient.readContract({ address, abi: coinFlipAbi, functionName: "totalFlips" }),
        publicClient.getBalance({ address: account }),
      ])) as bigint[];
      setState({ balance, bankroll, minBet, maxBet, totalFlips, gas });
    } catch {
      /* leave prior state; UI surfaces connection errors elsewhere */
    }
  }, [publicClient, address, account]);

  const refreshGames = useCallback(async () => {
    if (!publicClient || !address) return;
    try {
      // Local chains are short (scan from genesis); public RPCs cap getLogs ranges
      // (publicnode = 50000 blocks), so bound the window on anything non-local.
      const isLocalChain = publicClient.chain?.id === 31337;
      const { bets, entries: ledger } = await fetchLedger(publicClient, address, isLocalChain ? "all" : 10_000n);
      setGames(bets);
      setEntries(ledger);
    } catch {
      /* ignore — feed is best-effort */
    }
  }, [publicClient, address]);

  // Optimistic + reconciled balance. After a settled tx we know the EXACT new balance, so we
  // show it instantly, then poll the contract until the (often lagging) public RPC confirms
  // the same value before doing an authoritative full refresh. This kills the "balance still
  // shows the pre-flip value" stale-read flicker without ever displaying a wrong number.
  const reconcileBalance = useCallback(
    (expected: bigint) => {
      balanceRef.current = expected;
      setState((s) => ({ ...s, balance: expected }));
      if (!publicClient || !address || !account) return;
      let tries = 0;
      const tick = async () => {
        try {
          const onchain = (await publicClient.readContract({
            address,
            abi: coinFlipAbi,
            functionName: "balances",
            args: [account],
          })) as bigint;
          if (onchain === expected) {
            refreshState(); // node caught up — sync bankroll / gas / etc. authoritatively
            return;
          }
        } catch {
          /* transient RPC error — keep polling */
        }
        if (++tries < 6) setTimeout(tick, 1200);
        else refreshState();
      };
      setTimeout(tick, 900);
    },
    [publicClient, address, account, refreshState]
  );

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
        await publicClient!.waitForTransactionReceipt({ hash, timeout: 120_000 });
        reconcileBalance(balanceRef.current + parseEther(eth)); // deposit credits the full amount
        refreshGames(); // surface the new deposit in the unified ledger
        return hash;
      } catch (e) {
        resetNonce();
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, publicClient, address, account, txAccount, network, refreshState, refreshGames, reconcileBalance, nextNonce, resetNonce]
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
        await publicClient!.waitForTransactionReceipt({ hash, timeout: 120_000 });
        reconcileBalance(balanceRef.current - parseEther(eth)); // withdraw debits the full amount
        refreshGames(); // surface the new withdrawal in the unified ledger
        return hash;
      } catch (e) {
        resetNonce();
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, publicClient, address, account, txAccount, network, refreshState, refreshGames, reconcileBalance, nextNonce, resetNonce]
  );

  /** Place a flip. Returns the settled game row parsed from the BetSettled event. */
  const flip = useCallback(
    async (choice: Side, eth: string, seedInput?: string): Promise<GameRow> => {
      if (!walletClient || !publicClient || !address || !account || !network)
        throw new Error("not connected");
      setBusy(true);
      try {
        // Use the player's custom "lucky seed" word (hashed to bytes32) when provided,
        // else a fresh random seed. The contract hashes whatever seed it's given and emits
        // it in BetSettled, so verification stays correct for any seed.
        const seed = seedInput && seedInput.trim() ? keccak256(toBytes(seedInput.trim())) : randomSeed();
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
        const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
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
        // Exact post-flip balance — contract takes the bet up front (bal − bet), then credits
        // the full payout on a win. Show it instantly; reconcileBalance handles the RPC lag.
        reconcileBalance(balanceRef.current + (row.won ? row.payout - row.betAmount : -row.betAmount));
        refreshGames();
        return row;
      } catch (e) {
        resetNonce();
        // A tx that errored client-side (dropped connection / RPC timeout) may still have
        // landed on-chain — reconcile balance + feed so a settled flip isn't lost from the UI.
        refreshState();
        refreshGames();
        throw e;
      } finally {
        setBusy(false);
      }
    },
    [walletClient, publicClient, address, account, txAccount, network, refreshState, refreshGames, reconcileBalance, nextNonce, resetNonce]
  );

  return { state, games, entries, busy, ready, refreshState, refreshGames, deposit, withdraw, flip };
}
