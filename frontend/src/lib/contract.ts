import { hardhat, sepolia } from "viem/chains";
import type { Chain } from "viem";
import CoinFlipArtifact from "@/contracts/CoinFlip.json";
import localDeployment from "@/contracts/deployment-localhost.json";

export const coinFlipAbi = CoinFlipArtifact.abi;

// Local default comes from the committed deployment metadata. Sepolia is supplied
// at build/runtime via env so we never break the build when it isn't deployed yet.
const LOCAL_ADDRESS = (localDeployment as { address: string }).address as `0x${string}`;
const SEPOLIA_ADDRESS = (process.env.NEXT_PUBLIC_SEPOLIA_ADDRESS || "") as `0x${string}`;

export const LOCAL_RPC = process.env.NEXT_PUBLIC_LOCAL_RPC || "http://127.0.0.1:8545";
export const SEPOLIA_RPC =
  process.env.NEXT_PUBLIC_SEPOLIA_RPC || "https://ethereum-sepolia-rpc.publicnode.com";

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
