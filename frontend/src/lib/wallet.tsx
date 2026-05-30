"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type Account,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  LOCAL_NETWORK,
  SEPOLIA_NETWORK,
  INSTANT_NETWORK,
  INSTANT_KEY,
  type NetworkConfig,
  type WalletMode,
} from "./contract";

interface WalletState {
  mode: WalletMode | null;
  network: NetworkConfig | null;
  account: `0x${string}` | null;
  // What writeContract should sign with: a local Account object (mock burner — signs
  // locally via eth_sendRawTransaction) or the address (injected — MetaMask signs).
  txAccount: Account | `0x${string}` | null;
  publicClient: PublicClient | null;
  walletClient: WalletClient | null;
  connecting: boolean;
  error: string | null;
  isOwner: boolean;
  connectMock: () => Promise<void>;
  connectInjected: () => Promise<void>;
  disconnect: () => void;
  clearError: () => void;
}

const Ctx = createContext<WalletState | null>(null);

// Hardhat Account #0 (owner/deployer). Used only to show an "owner" badge in mock mode.
const OWNER_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266".toLowerCase();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<WalletMode | null>(null);
  const [network, setNetwork] = useState<NetworkConfig | null>(null);
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [txAccount, setTxAccount] = useState<Account | `0x${string}` | null>(null);
  const [publicClient, setPublicClient] = useState<PublicClient | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disconnect = useCallback(() => {
    setMode(null);
    setNetwork(null);
    setAccount(null);
    setTxAccount(null);
    setPublicClient(null);
    setWalletClient(null);
    setError(null);
  }, []);

  const connectMock = useCallback(async () => {
    setConnecting(true);
    setError(null);
    const net = INSTANT_NETWORK;
    try {
      const acct = privateKeyToAccount(INSTANT_KEY);
      const pub = createPublicClient({ chain: net.chain, transport: http(net.rpcUrl) });
      // Probe the chain so we fail fast with a friendly message if it isn't reachable.
      await pub.getBlockNumber();
      const wallet = createWalletClient({ account: acct, chain: net.chain, transport: http(net.rpcUrl) });
      setMode("mock");
      setNetwork(net);
      setAccount(acct.address);
      setTxAccount(acct); // local account -> viem signs locally (works on any RPC)
      setPublicClient(pub as PublicClient);
      setWalletClient(wallet);
    } catch {
      setError(
        net.chain.id === LOCAL_NETWORK.chain.id
          ? "Couldn't reach the local chain. Run `npm run node` then `npm run deploy:local` first."
          : "Couldn't reach the Sepolia demo right now — the network may be busy. Please retry."
      );
    } finally {
      setConnecting(false);
    }
  }, []);

  const connectInjected = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const eth = (typeof window !== "undefined" && (window as any).ethereum) || null;
      if (!eth) {
        setError("No browser wallet found. Install MetaMask, or use Mock Wallet Mode to demo instantly.");
        return;
      }
      const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
      const chainIdHex: string = await eth.request({ method: "eth_chainId" });
      const chainId = parseInt(chainIdHex, 16);

      let net: NetworkConfig | null = null;
      if (chainId === SEPOLIA_NETWORK.chain.id) net = SEPOLIA_NETWORK;
      else if (chainId === LOCAL_NETWORK.chain.id) net = LOCAL_NETWORK;

      if (!net) {
        setError("Wrong network. Switch your wallet to Sepolia (or your local chain) to play.");
        return;
      }

      const pub = createPublicClient({ chain: net.chain, transport: http(net.rpcUrl) });
      const wallet = createWalletClient({ chain: net.chain, transport: custom(eth) });
      setMode("injected");
      setNetwork(net);
      setAccount(accounts[0] as `0x${string}`);
      setTxAccount(accounts[0] as `0x${string}`); // address -> MetaMask signs via custom transport
      setPublicClient(pub as PublicClient);
      setWalletClient(wallet);
    } catch (e: any) {
      if (String(e?.message || "").toLowerCase().includes("rejected"))
        setError("Connection request was cancelled.");
      else setError("Couldn't connect to your wallet. Please try again.");
    } finally {
      setConnecting(false);
    }
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      mode,
      network,
      account,
      txAccount,
      publicClient,
      walletClient,
      connecting,
      error,
      isOwner: !!account && account.toLowerCase() === OWNER_ADDRESS,
      connectMock,
      connectInjected,
      disconnect,
      clearError: () => setError(null),
    }),
    [mode, network, account, txAccount, publicClient, walletClient, connecting, error, connectMock, connectInjected, disconnect]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
