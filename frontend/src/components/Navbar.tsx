"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import BrandLogo from "./BrandLogo";
import WalletButton from "./WalletButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/vault", label: "Vault" },
];

const activePill =
  "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium tracking-wide text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-md transition-all duration-300";
const idlePill =
  "rounded-full border border-transparent px-4 py-1.5 text-xs font-medium tracking-wide text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white";

// Unified premium header — identical markup on every route, so nothing shifts between
// pages. Sticky floating glass bar that always paints above content (z-50). Below md it
// collapses the links + wallet into a clean dropdown drawer so the bar can never overflow
// the viewport on mobile (logo + hamburger only).
export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Always close the drawer on navigation (deterministic closed default → no hydration drift).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-3 z-50 mb-6 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 shadow-lg backdrop-blur-md sm:px-4">
      <div className="flex items-center justify-between gap-2 sm:gap-3">
        {/* Static logo — always routes home, no per-route breadcrumb */}
        <Link href="/" aria-label="VeriFlip home" className="min-w-0">
          <BrandLogo />
        </Link>

        {/* Desktop cluster — capsule links + wallet, ≥ md */}
        <div className="hidden items-center gap-3 md:flex">
          <nav className="flex shrink-0 items-center gap-1">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={active ? activePill : idlePill}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
          <WalletButton />
        </div>

        {/* Mobile hamburger — toggles the drawer, < md */}
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 transition hover:bg-white/10 md:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            {open ? (
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile drawer — no overflow-hidden so the wallet's connect dropdown isn't clipped */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="md:hidden"
          >
            <nav className="mt-3 flex flex-col gap-1 border-t border-white/10 pt-3">
              {LINKS.map((l) => {
                const active = pathname === l.href;
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? "rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400"
                        : "rounded-xl border border-transparent px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white"
                    }
                  >
                    {l.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 flex justify-end border-t border-white/10 pt-3">
              <WalletButton />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
