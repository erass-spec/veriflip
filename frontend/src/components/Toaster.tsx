"use client";

import { useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toastStore } from "@/lib/toast";

// Glowing, dependency-free success toasts. Mounted once in the root layout.
export default function Toaster() {
  const toasts = useSyncExternalStore(
    toastStore.subscribe,
    toastStore.getSnapshot,
    toastStore.getServerSnapshot
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-emerald-400/30 bg-slate-950/90 px-4 py-3 shadow-[0_0_30px_-6px_rgba(52,211,153,0.7)] backdrop-blur-xl"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-sm font-bold text-emerald-300 shadow-[0_0_12px_-2px_rgba(52,211,153,0.9)]">
              ✓
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white/90">{t.message}</div>
              {t.href && (
                <a
                  href={t.href}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-cyan-400 transition hover:text-cyan-300 hover:underline"
                >
                  {t.linkLabel || "View on Etherscan"} ↗
                </a>
              )}
            </div>
            <button
              onClick={() => toastStore.dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-white/30 transition hover:text-white/70"
            >
              ✕
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
