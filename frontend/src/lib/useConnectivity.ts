"use client";

import { useEffect, useState } from "react";
import { createPublicClient } from "viem";
import { INSTANT_NETWORK, makeTransport } from "./contract";

export type ConnStatus = "live" | "reconnecting" | "offline";

/**
 * Real-time connectivity monitor for the terminal feed's status light.
 *  - "offline":      browser reports no network (navigator.onLine === false)
 *  - "reconnecting": browser online but the RPC fallback set isn't responding
 *  - "live":         online and an RPC node answered a health ping
 *
 * SSR-safe: starts "live" (deterministic for hydration) and only touches
 * navigator/window + the RPC inside useEffect, after mount.
 */
export function useConnectivity(): ConnStatus {
  const [status, setStatus] = useState<ConnStatus>("live");

  useEffect(() => {
    let cancelled = false;
    const net = INSTANT_NETWORK;
    const client = createPublicClient({ chain: net.chain, transport: makeTransport(net.chain.id) });

    async function ping() {
      if (cancelled) return;
      if (!navigator.onLine) {
        setStatus("offline");
        return;
      }
      try {
        await client.getBlockNumber({ cacheTime: 0 }); // force a real request each tick
        if (!cancelled) setStatus("live");
      } catch {
        if (!cancelled) setStatus(navigator.onLine ? "reconnecting" : "offline");
      }
    }

    const onOffline = () => !cancelled && setStatus("offline");
    const onOnline = () => ping(); // re-probe RPC on regaining connection

    // initial sync + periodic health check
    if (!navigator.onLine) setStatus("offline");
    ping();
    const timer = setInterval(ping, 12_000);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);

    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return status;
}
