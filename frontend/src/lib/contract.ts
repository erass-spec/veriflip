import { hardhat, sepolia } from "viem/chains";
import { fallback, http, type Chain, type Transport } from "viem";
import CoinFlipArtifact from "@/contracts/CoinFlip.json";
import localDeployment from "@/contracts/deployment-localhost.json";

export const coinFlipAbi = CoinFlipArtifact.abi;

// Local default comes from the committed deployment metadata. Sepolia is supplied
// at build/runtime via env so we never break the build when it isn't deployed yet.
const LOCAL_ADDRESS = (localDeployment as { address: string }).address as `0x${string}`;
const SEPOLIA_ADDRESS = (process.env.NEXT_PUBLIC_SEPOLIA_ADDRESS || "") as `0x${string}`;

export const LOCAL_RPC = process.env.NEXT_PUBLIC_LOCAL_RPC || "http://127.0.0.1:8545";

// Multiple public Sepolia RPCs. A single public node throttles/times out under load;
// viem's `fallback` transport auto-fails-over to the next on network errors and retries,
// which is the core fix for the intermittent "Flip" failures. An env override (if set)
// is tried first. publicnode is kept early — it's verified and has a generous getLogs cap.
export const SEPOLIA_RPCS: string[] = [
  process.env.NEXT_PUBLIC_SEPOLIA_RPC,
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.drpc.org",
  "https://eth-sepolia.public.blastapi.io",
  "https://1rpc.io/sepolia",
  "https://endpoints.omniatech.io/v1/eth/sepolia/public",
].filter((u): u is string => !!u);

// The first RPC handles range-bounded getLogs; keep the feed window within its cap.
export const SEPOLIA_RPC = SEPOLIA_RPCS[0];

// Per-RPC HTTP options: short-ish timeout + a couple of retries with backoff so a slow
// node fails fast and the fallback moves on rather than hanging the UI.
const HTTP_OPTS = { timeout: 12_000, retryCount: 2, retryDelay: 400 } as const;

/** Resilient transport for read/write clients: fallback list on Sepolia, single http locally. */
export function makeTransport(chainId: number): Transport {
  if (chainId === sepolia.id) {
    return fallback(
      SEPOLIA_RPCS.map((url) => http(url, HTTP_OPTS)),
      { rank: false, retryCount: 1 }
    );
  }
  return http(LOCAL_RPC, { timeout: 12_000 });
}

// Generous fixed gas limits skip on-chain gas estimation entirely — one fewer RPC
// round-trip and immune to estimation spikes/rejections during Sepolia congestion.
// All comfortably above measured usage (flip ≈ 130k, deposit/withdraw ≈ 45k).
export const GAS_LIMITS = {
  deposit: 120_000n,
  withdraw: 120_000n,
  flip: 320_000n,
} as const;

export type WalletMode = "mock" | "injected";

export interface NetworkConfig {
  chain: Chain;
  address: `0x${string}`;
  rpcUrl: string;
  label: string;
  explorer?: string;
}

export const LOCAL_NETWORK: NetworkConfig = {
  chain: hardhat,
  address: LOCAL_ADDRESS,
  rpcUrl: LOCAL_RPC,
  label: "Local (Hardhat)",
};

export const SEPOLIA_NETWORK: NetworkConfig = {
  chain: sepolia,
  address: SEPOLIA_ADDRESS,
  rpcUrl: SEPOLIA_RPC,
  label: "Sepolia",
  explorer: "https://sepolia.etherscan.io",
};

// Well-known, PUBLIC Hardhat test private key (Account #1). Local-only burner used by
// Instant Play in local dev so the full on-chain loop is demoable with zero MetaMask
// friction. NEVER holds real funds. Account #0 is the owner/deployer; #1 plays.
export const MOCK_PLAYER_KEY =
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as `0x${string}`;

// Testnet-only burner shipped in the client bundle so a visitor with no wallet can play
// instantly on the PUBLIC Sepolia demo. Intentional, documented tradeoff (low maxBet,
// testnet-only). See docs/security_review.md. Empty in local dev.
const SEPOLIA_BURNER_KEY = (process.env.NEXT_PUBLIC_SEPOLIA_BURNER_KEY || "") as `0x${string}`;

// "Instant Play" is network-aware: Sepolia burner when the public demo is configured,
// otherwise the local Hardhat burner. This is what makes the one-click CTA work on the
// deployed URL instead of pointing at localhost.
export const HAS_SEPOLIA = !!SEPOLIA_ADDRESS && !!SEPOLIA_BURNER_KEY;
export const INSTANT_NETWORK: NetworkConfig = HAS_SEPOLIA ? SEPOLIA_NETWORK : LOCAL_NETWORK;
export const INSTANT_KEY = (HAS_SEPOLIA ? SEPOLIA_BURNER_KEY : MOCK_PLAYER_KEY) as `0x${string}`;
export const INSTANT_SUBLABEL = HAS_SEPOLIA ? "Sepolia testnet, no wallet needed" : "local chain";

export const HOUSE_EDGE = "3.5%";
export const PAYOUT_MULTIPLIER = "1.93x";

export const SIDE = { HEADS: 0, TAILS: 1 } as const;
export type Side = 0 | 1;
