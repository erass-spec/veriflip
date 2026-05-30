# AI Usage Report

**Tool:** Claude (Opus 4.8) operating as an autonomous engineering agent with terminal, filesystem, and browser-automation access. The entire project — contracts, tests, frontend, deployment scripts, and docs — was built in a single agent session.

## What AI accelerated
- **Contract scaffolding done right the first time.** OpenZeppelin imports, CEI ordering, ReentrancyGuard placement, the liquidity guard, and the single rich `BetSettled` event were written correctly up front, informed by a pre-coding review of common footguns.
- **A test that proves the actual claim.** Rather than asserting trivia, the suite recomputes the RNG off-chain (mirroring the contract) and verifies a match on both win and loss branches, plus exact accounting. 97% coverage from one pass.
- **Full frontend in one pass:** viem integration layer, network-aware wallet context, animated coin, the provably-fair verify panel, landing page, and error mapping — then a real production build.
- **Browser-verified E2E:** drove a real Chromium session through Connect → Deposit → Flip → Verify → Withdraw and confirmed exact on-chain balances and the in-browser recomputation.

## Where AI/automation hit friction (and how it was handled)
- **Node 25 + Hardhat:** brand-new Node major; Hardhat warns it's unsupported. Verified compile + test up front rather than assuming — it worked, with `viaIR` needed for the 10-field event (stack-too-deep).
- **Flaky network during install:** the first `npm install` hung on a throttled connection (one fetch stalled 69s, repeated ECONNRESETs). Diagnosed via cache-write activity, killed, and restarted with unbuffered logging; 595 packages eventually landed.
- **The demo-killing assumption:** the one-click "mock wallet" was wired to `localhost:8545` — fine locally, broken on a public URL. An adversarial review caught this; it was reworked into a network-aware Sepolia burner.
- **Tailwind `@apply` of a custom class** failed the build until restructured into `@layer components`.

## Human decisions (kept with the user)
- Go public on Sepolia vs. local-only Loom.
- Ship a testnet burner key in the bundle for one-click public play (the UX-vs-exposure tradeoff).
- Provide hosting credentials vs. generate deploy commands.
- Funding the deployer key from a faucet (the one irreducibly human, outward-facing step).

## Lessons learned
1. **Verify the toolchain before building on it** — especially on a bleeding-edge runtime.
2. **"Works locally" ≠ "works deployed."** The localhost burner would have died in front of judges; an adversarial pass before shipping is worth more than another feature.
3. **Honest limitations beat inflated claims.** Documenting the prevrandao and burner-key tradeoffs is a stronger technical signal than a false "uncheatable" badge.
4. **One well-designed event** can serve both the product (feed) and the proof (verification) — design it once, deliberately.
