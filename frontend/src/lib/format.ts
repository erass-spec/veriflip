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
  if (m.includes("429") || m.includes("rate limit") || m.includes("too many requests"))
    return "The public RPC is rate-limiting right now. Wait a second and tap again — it'll retry on another node.";
  if (
    m.includes("timeout") || m.includes("timed out") || m.includes("fetch") ||
    m.includes("network") || m.includes("econnrefused") || m.includes("connection") ||
    m.includes("502") || m.includes("503") || m.includes("504") ||
    m.includes("gateway") || m.includes("unavailable") || m.includes("http request failed")
  )
    return "Network is busy or the RPC timed out. Please try again — it usually goes through on the next attempt.";
  if (m.includes("nonce") || m.includes("replacement") || m.includes("already known"))
    return "Transaction ordering hiccup on the public node. Please try again in a moment.";
  if (m.includes("reverted") || m.includes("settlement event"))
    return "That flip didn't settle on-chain. Please try again.";
  return "Something went wrong with that transaction. Please try again.";
}
