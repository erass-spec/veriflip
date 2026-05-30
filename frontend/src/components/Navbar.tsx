"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "./BrandLogo";
import WalletButton from "./WalletButton";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/vault", label: "Vault" },
];

// Unified premium header — identical markup on every route, so nothing shifts between
// pages. Sticky floating glass bar that always paints above content (z-50).
export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-3 z-50 mb-6 flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-3 shadow-lg backdrop-blur-md sm:gap-3 sm:px-4">
      {/* Static logo — always routes home, no per-route breadcrumb */}
      <Link href="/" aria-label="VeriFlip home">
        <BrandLogo />
      </Link>

      {/* Capsule nav links — active pill toggles by route; transparent border on the
          inactive state keeps box size identical so links never jump. */}
      <nav className="flex shrink-0 items-center gap-1">
        {LINKS.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium tracking-wide text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.1)] backdrop-blur-md transition-all duration-300 sm:px-4"
                  : "rounded-full border border-transparent px-2.5 py-1.5 text-xs font-medium tracking-wide text-slate-400 transition-all duration-300 hover:bg-white/5 hover:text-white sm:px-4"
              }
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      {/* Wallet — fixed far right on every route */}
      <WalletButton />
    </header>
  );
}
