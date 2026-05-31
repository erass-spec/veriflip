// VeriFlip CI/CD Pipeline Active — auto-deploy from main verified
import Link from "next/link";
import BrandLogo from "./BrandLogo";
import { SEPOLIA_NETWORK } from "@/lib/contract";

const ENGINE_VERSION = "v1.2.0-Production";
// Public repo — security review + full source.
const GITHUB_URL = "https://github.com/erass-spec/veriflip";

const contractUrl =
  SEPOLIA_NETWORK.address && SEPOLIA_NETWORK.explorer
    ? `${SEPOLIA_NETWORK.explorer}/address/${SEPOLIA_NETWORK.address}`
    : SEPOLIA_NETWORK.explorer || "#";

function ResourceLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  const cls =
    "inline-flex items-center gap-1 text-sm text-white/50 transition hover:text-emerald-400";
  return external ? (
    <a href={href} target="_blank" rel="noreferrer" className={cls}>
      {children} <span className="text-[10px] opacity-60">↗</span>
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

export default function Footer() {
  return (
    <footer className="mt-16">
      <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-6 shadow-2xl backdrop-blur-lg sm:p-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Left — brand + tagline */}
          <div>
            <BrandLogo />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/45">
              Democratizing trust in digital entertainment. Fully auditable, on-chain, and provably fair.
            </p>
          </div>

          {/* Middle — resources */}
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">Resources</div>
            <ul className="space-y-2">
              <li><ResourceLink href="/">Home</ResourceLink></li>
              <li><ResourceLink href="/play">Play Casino</ResourceLink></li>
              <li><ResourceLink href="/vault">Secure Vault</ResourceLink></li>
              <li><ResourceLink href={contractUrl} external>Verified Contract</ResourceLink></li>
              <li><ResourceLink href={GITHUB_URL} external>Security Audit</ResourceLink></li>
            </ul>
          </div>

          {/* Right — system status panel */}
          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/40">System Status</div>
            <ul className="space-y-2.5 text-sm">
              <li className="flex items-center gap-2 text-white/60">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                </span>
                Network: <span className="text-white/80">Sepolia Testnet</span>
              </li>
              <li className="flex items-center gap-2 text-white/60">
                <span aria-hidden>🔒</span>
                Security: <span className="text-white/80">OpenZeppelin Secured</span>
              </li>
              <li className="flex items-center gap-2 text-white/60">
                <span aria-hidden>⚙️</span>
                Engine: <span className="font-mono text-emerald-400/90">{ENGINE_VERSION}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom row */}
        <div className="mt-8 border-t border-white/10 pt-5 text-center text-xs text-white/35 sm:flex sm:items-center sm:justify-between sm:text-left">
          <span>© {2026} VeriFlip · on-chain coin flip</span>
          <span className="mt-2 block sm:mt-0">
            Built with <span className="text-rose-400">❤</span> for the Hackathon. Play responsibly. Testnet only. No real funds at stake.
          </span>
        </div>
      </div>
    </footer>
  );
}
