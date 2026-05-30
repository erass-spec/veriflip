# VeriFlip — On-Chain Provably-Recomputable Coin Flip

## Project Summary
VeriFlip is a dark-themed, mobile-first crypto casino built around one honest idea: **you can recompute the outcome of every coin flip yourself, directly from public on-chain data.** Connect → deposit → flip (50/50, win pays 1.93x) → withdraw. Every result is derived in a single transaction from `keccak256(block.prevrandao, player, seed, nonce) % 2` and emitted in one rich event that powers both the live games feed and an interactive verification panel.

The differentiator isn't the game — it's that the casino *proves it isn't cheating* and is honest about exactly how far that proof goes.

## Links
- **Live demo:** https://frontend-evg-s-projects.vercel.app — public, playable, on-chain
- **Contract (Sepolia):** [`0x38097F553ce38747835b429d8674F6861E994955`](https://sepolia.etherscan.io/address/0x38097F553ce38747835b429d8674F6861E994955) — deployed, funded (0.02 ETH bankroll), full loop verified on-chain
- **GitHub:** https://github.com/erass-spec/veriflip
- **Loom:** _<video URL>_

## Architecture
- **Contract** (`contracts/CoinFlip.sol`): Solidity 0.8.24, OpenZeppelin `Ownable` + `ReentrancyGuard`. Custodial player balances, owner-funded house bankroll, a liquidity guard that rejects any bet the bankroll can't cover, and a single `BetSettled` event carrying every input needed to recompute the result. `viaIR` enabled (the 10-field event overflows the legacy stack).
- **Frontend** (`frontend/`): Next.js 15 (App Router), viem, framer-motion, TailwindCSS. A network-aware "Instant Play" burner lets anyone play with no wallet; MetaMask supported for self-custody. The verify panel recomputes keccak256 in-browser.
- **Tooling:** Hardhat (compile/test/coverage/deploy), automated ABI + address export into the frontend on every deploy.

## Why Ethereum
The whole premise — *publicly verifiable randomness inputs and outcomes* — only works on a transparent, append-only ledger. `block.prevrandao`, the player's tx, the emitted event, and the contract's `computeResult()` view are all public. A user (or judge) can independently recompute any historical result without trusting us. That auditability is the product; a centralized backend couldn't offer it.

## What works (verified)
- Smart contract compiles; **16 tests pass** at **97% stmt / 81% branch / 98% line** coverage.
- The full loop **Connect → Deposit → Flip → Verify → Withdraw** verified in a real browser against a live chain (won +0.0465 ETH on a 0.05 bet; exact accounting; in-browser recompute showed **✓ VERIFIED**).
- Production frontend build passes clean; mobile 390px responsive; no console errors.
- One-click Instant Play (network-aware burner) so the demo needs no wallet setup.
- **Critical same-transaction revert exploit fully mitigated on-chain** — `flip()` enforces `require(msg.sender == tx.origin)`, blocking contract-wrapper attacks that could otherwise drain the bankroll. Redeployed to the secured address and re-verified end-to-end; all 16 tests pass with the guard. See `docs/security_review.md` finding #1.

## Limitations (honest)
- **Randomness:** `block.prevrandao` is proposer-influenceable — *verifiable & recomputable*, not *manipulation-proof*. Production would use Chainlink VRF or commit–reveal. (`docs/security_review.md`.)
- **Operator trust:** owner can withdraw the house bankroll (but provably **never** player balances).
- **Demo burner:** a testnet-only key ships in the bundle for one-click play; documented, low `maxBet`.

## Hardest problem solved
Making "provably fair" an *honest, interactive* claim rather than marketing. That meant (a) designing a single event that is simultaneously the data feed and the verification source, (b) writing a test that recomputes the RNG off-chain and asserts it matches the contract on both win and loss, and (c) — the demo-saving catch — realizing the one-click "mock wallet" pointed at `localhost` and would break on the public URL, then reworking it into a network-aware Sepolia burner so the public CTA actually plays real on-chain transactions.

## Next steps
1. Swap prevrandao for Chainlink VRF (or commit–reveal) to remove proposer influence.
2. Add more games sharing the same verifiable-RNG + event design (dice, wheel).
3. Per-user wallet sessions + persistence; frontend test suite.
4. Subgraph/indexer for a global, paginated history feed.

## Production hardening roadmap (from the pre-submission audit)

**Randomness — eliminate the residual validator vector (finding #2).** The player-accessible drain is already fixed on-chain (`tx.origin` guard, finding #1). The remaining risk is a proposer who is also the bettor withholding their own block to re-roll `prevrandao` — economically irrational at our 0.002 maxBet, but real at scale.
- **Chainlink VRF v2.5 (recommended):** make `flip()` asynchronous — `requestRandomWords()` records the pending bet (player, choice, stake, nonce); the `fulfillRandomWords()` callback settles from the verifiable random word. Because the result is unknowable in the requesting transaction, this kills *both* validator influence and any same-tx revert vector at once. v2.5 supports **native-token payment** (no LINK required) via the subscription/consumer model. UX cost: a short "awaiting VRF" pending state (2 on-chain steps).
- **Commit–reveal (no oracle):** commit `keccak(seed)` in tx1, reveal in tx2 settling against a *future* blockhash. Cheaper and oracle-free, but worse UX and still leaves slight proposer influence on the reveal block.

**Mainnet gas profile.** Current settings (`optimizer runs: 200` + `viaIR`) are already sound. If ever deployed to mainnet: pack `minBet`/`maxBet`/`totalFlips` into fewer storage slots, keep caching `balances[msg.sender]` (already done), `bytes32 seed` is already `calldata` via `external`. These are storage-layout micro-wins — **not worth redeploying a working, verified testnet contract** (any contract edit forces re-wire + re-fund + full re-verify).

**Frontend / infra.**
- Safe security headers shipped (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS). A strict **Content-Security-Policy** is deliberately deferred (would need `connect-src` for all fallback RPC hosts + `'unsafe-inline'` for styles); ship it **report-only** first to avoid breaking live RPC calls.
- RPC resilience: bounded `waitForTransactionReceipt` (120s) so a dropped connection can't hang the UI, and on a flip error the balance + feed are reconciled (a tx that errored client-side but landed on-chain still surfaces).
- Mobile floor is **390px** (navbar verified with ~8px margin when connected); 360/320px legacy devices would need a further-condensed nav.

## AI usage
See `docs/ai_usage.md` for the full report.
