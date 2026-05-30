import { formatEther } from "viem";

export function shortAddr(a?: string) {
  if (!a) return "";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function fmtEth(wei: bigint, dp = 4) {
  const n = Number(formatEther(wei));
  if (n === 0) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: dp });
}

export function timeAgo(tsSec: number) {
  const d = Math.max(0, Math.floor(Date.now() / 1000) - tsSec);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}

/** Map raw contract/RPC errors to friendly messages — never show raw codes to users. */
export function friendlyError(err: unknown): string {
  const raw = (err as { shortMessage?: string; message?: string })?.shortMessage ||
    (err as { message?: string })?.message ||
    String(err);
  const m = raw.toLowerCase();

  if (m.includes("user rejected") || m.includes("user denied") || m.includes("rejected the request"))
    return "You cancelled the transaction in your wallet.";
  if (m.includes("insufficientbalance") || m.includes("insufficient balance"))
    return "Not enough balance in your game account. Deposit more to play.";
  if (m.includes("insufficientbankroll"))
    return "The house bankroll can't cover this bet right now. Try a smaller amount.";
  if (m.includes("betoutofrange")) return "That bet is outside the allowed min/max range.";
  if (m.includes("zeroamount")) return "Amount must be greater than zero.";
  if (m.includes("insufficient funds") || m.includes("exceeds the balance") || m.includes("total cost"))
    return "The demo wallet is low on test ETH for gas. Try a smaller amount, or it'll be topped up shortly.";
  if (m.includes("chain") && m.includes("match")) return "Wrong network — please switch your wallet's network.";
  if (m.includes("fetch") || m.includes("network") || m.includes("timeout") || m.includes("econnrefused"))
    return "Network hiccup reaching the blockchain. Check your connection and retry.";
  if (m.includes("nonce")) return "Transaction ordering issue — please retry in a moment.";
  return "Something went wrong with that transaction. Please try again.";
}
