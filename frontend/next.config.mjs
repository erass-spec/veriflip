import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives in a monorepo alongside the Hardhat package (two lockfiles), so
  // pin the output-file-tracing root to the frontend dir for deterministic Vercel builds.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
