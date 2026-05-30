import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Safe, runtime-inert security headers (clickjacking, MIME-sniff, referrer leakage,
// feature access, HTTPS pinning). NOTE: a strict Content-Security-Policy is intentionally
// NOT enforced here — the app makes connect-src calls to multiple fallback RPC hosts and
// relies on inline styles, so an enforcing CSP risks silently breaking live flips. Documented
// as roadmap (report-only CSP) in docs/notion_submission.md.
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives in a monorepo alongside the Hardhat package (two lockfiles), so
  // pin the output-file-tracing root to the frontend dir for deterministic Vercel builds.
  outputFileTracingRoot: __dirname,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
