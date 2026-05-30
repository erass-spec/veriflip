# 🪙 Wibe — On-Chain Provably-Recomputable Coin Flip

A dark-themed, mobile-first crypto casino built around a single, honest idea: **you can recompute the outcome of every flip yourself, straight from on-chain data.** No trust required — just keccak256.

> **What it is:** Connect → Deposit → Flip (50/50, 1.93x) → Withdraw. Every result is derived in one transaction from `keccak256(block.prevrandao, player, yourSeed, nonce)` and emitted in a single rich event that powers both the live games feed and the verification panel.

| | |
|---|---|
| **Live demo** | _added after deploy (Phase II)_ |
| **Contract (Sepolia)** | _added after deploy (Phase II)_ |
| **Game** | Coin Flip — 50/50, 3.5% house edge, winners paid 1.93x |
| **Stack** | Solidity 0.8.24 · OpenZeppelin · Hardhat · Next.js · Wagmi/Viem · Tailwind |

---

## ⚡ Quick start (local, ~2 min)

```bash
# 1. install + compile + test
npm install
npm run compile
npm test

# 2. run a local chain (terminal A)
npm run node

# 3. deploy + auto-export ABI to the frontend (terminal B)
npm run deploy:local

# 4. run the frontend
cd frontend && npm install && npm run dev
```

The frontend ships a **Mock Wallet Mode** so the full gameplay loop is demoable with zero external dependencies (no MetaMask, no testnet ETH).

---

## 🎲 Is it really fair?

The outcome of flip #`n` for player `P` with seed `S` is:

```
result = uint256(keccak256(abi.encodePacked(prevrandao, P, S, nonce))) % 2
```

Everything on the right-hand side is public: `prevrandao` is on-chain block data, and `P`, `S`, `nonce`, `result` are all emitted in the `BetSettled` event. The verification panel in the UI lets you **recompute the hash and confirm the contract didn't cheat** — and the contract exposes `computeResult(...)` as a public pure function so you can call it yourself.

**Honest limitation:** `block.prevrandao` is chosen by the block proposer, so a validator producing the block can influence it. This makes the game **verifiable and recomputable**, not **manipulation-proof**. Production-grade randomness would use Chainlink VRF or commit-reveal — see [`docs/security_review.md`](docs/security_review.md).

---

## 🏗️ Architecture

```
contracts/CoinFlip.sol      Ownable + ReentrancyGuard, custodial balances,
                            liquidity-guarded payouts, one rich event per flip
scripts/deploy.js           deploy + seed house + auto-export ABI/address
scripts/keygen.js           generate Sepolia deployer (public address only logged)
test/CoinFlip.test.js       provable-fairness recomputation + accounting + access control
frontend/                   Next.js landing page + casino workspace
deployments/                local.json, sepolia.json
docs/                       security_review.md, notion_submission.md, ai_usage.md, loom_script.md
```

See [`docs/notion_submission.md`](docs/notion_submission.md) for the full write-up.
