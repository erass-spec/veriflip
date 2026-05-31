# 🪙 VeriFlip — On-Chain Provably-Recomputable Coin Flip

<p align="center">
  <img src="https://img.shields.io/badge/Solidity-0.8.24-blue?logo=solidity" alt="Solidity" />
  <img src="https://img.shields.io/badge/Framework-Next.js%2015-black?logo=nextdotjs" alt="Next.js" />
  <img src="https://img.shields.io/badge/Security-OpenZeppelin-blue" alt="OpenZeppelin" />
  <img src="https://img.shields.io/badge/Network-Sepolia%20Testnet-green" alt="Sepolia" />
  <img src="https://img.shields.io/badge/Deployment-Vercel-black?logo=vercel" alt="Vercel" />
</p>

A dark-themed, mobile-first Web3 crypto casino built around a single, honest idea: **you can recompute the outcome of every flip yourself, straight from public on-chain data.** No trust required — just pure cryptography.

> **The Flow:** Connect → Deposit to Vault → Flip (50/50, 1.93x) → Withdraw. Every result is derived on-chain in a single transaction and emitted as a rich event that dynamically powers both the live games feed and the verification console.

---

### 🌐 Project Hub

| Resource | Link |
| :--- | :--- |
| **⚡ Live Demo** | **[frontend-evg-s-projects.vercel.app](https://frontend-evg-s-projects.vercel.app)** (Deployed on Vercel) |
| **🏦 Smart Contract** | [`0x38097F553ce38747835b429d8674F6861E994955`](https://sepolia.etherscan.io/address/0x38097F553ce38747835b429d8674F6861E994955) (Etherscan Sepolia) |
| **🔒 Audit Report** | **[`docs/security_review.md`](docs/security_review.md)** (Pre-Submission Hardening Audit) |
| **💡 AI Usage Report** | **[`docs/ai_usage.md`](docs/ai_usage.md)** (Bonus: AI tooling optimization report) |
| **📦 GitHub** | [github.com/erass-spec/veriflip](https://github.com/erass-spec/veriflip) |

---

## 🛠️ Developer Experience & Tooling

We built a centralized automation engine via `Makefile` to simplify development, testing, and contract deployment.

```bash
# 1. Install dependencies, compile contracts, and run 16 unit tests
make test

# 2. Spin up a local Hardhat node (runs in the background)
make node

# 3. Deploy the contract locally & auto-export the ABI/address to the frontend
make deploy-local

# 4. Launch the Next.js development server
make dev

# 5. (Fallback only) Build & deploy the frontend straight to Vercel from your machine
make deploy
```

> **Note:** The frontend includes a **Mock Wallet Mode** to allow testing the entire E2E loop (Connect → Deposit → Play → Withdraw) in the browser without MetaMask or testnet ETH.

### 🚀 Push-to-Deploy (CI/CD)

The frontend ships via a fully automated **GitHub → Vercel pipeline**. Every push to `main` triggers a production build and deploy — no manual step:

```bash
git push        # → Vercel auto-builds & promotes to production
```

- **Source of truth:** `github.com/erass-spec/veriflip` → Vercel project `frontend` (Root Directory: `frontend`).
- **Secrets:** `NEXT_PUBLIC_SEPOLIA_ADDRESS` and `NEXT_PUBLIC_SEPOLIA_BURNER_KEY` live encrypted in Vercel's Production environment (gitignored locally in `frontend/.env.local`).
- **`make deploy` is now just a local fallback** for deploying without a push (e.g. offline-of-GitHub hotfixes); day-to-day, `git push` is the deploy.

---

## 🎲 Provably Fair Mathematics

The outcome of coin flip `gameId` for player `P` with a custom client seed `S` and a monotonic per-player `nonce` is derived as:

```
result = uint256(keccak256(abi.encodePacked(prevrandao, P, S, nonce))) % 2
```

**Transparency highlights:**

- **Zero secrets:** every variable on the right-hand side is fully public — `prevrandao` is block entropy, and `P`, `S`, `nonce` (and `result`) are emitted in the `BetSettled` event.
- **Client entropy:** the user contributes a custom seed when they click, proving the casino could not predict their input to manipulate the outcome.
- **Interactive verification:** the built-in terminal-style verifier console recomputes the hash on the fly in the browser and compares it side-by-side with the on-chain result.

---

## 🔒 Security & Hardening

VeriFlip is engineered toward commercial Web3 security standards. The following hardening measures were implemented:

- **On-chain revert-exploit fix:** the critical contract-level exploit is resolved. `flip()` enforces `require(msg.sender == tx.origin, "Only direct user calls allowed")`, blocking contract-wrapper callers — this prevents malicious actors from using atomic transaction rollbacks (`revert()`) to only ever realize wins and drain the bankroll.
- **Reentrancy protection:** all financial state changes use OpenZeppelin's `ReentrancyGuard` and the strict Checks-Effects-Interactions (CEI) pattern.
- **Public RPC failover:** the frontend uses `viem` fallback transport across 5 public Sepolia nodes (publicnode, dRPC, BlastAPI, 1RPC, Omniatech) to avoid transaction hangs and rate-limit blocks, with a bounded receipt timeout so a dropped connection can never lock the UI.
- **Client-side nonce mutex:** serialized nonce allocation (with self-healing reset on error) prevents transaction collisions or nonce gaps from rapid consecutive clicks.

**Honest limitations:**

`block.prevrandao` is fully recomputable but theoretically vulnerable to validator-level block-withholding manipulation. For production scale, we document a migration path to **Chainlink VRF v2.5** (and a commit–reveal alternative) in [`docs/security_review.md`](docs/security_review.md).

---

## 🏗️ Project Architecture

```text
/
├── contracts/          # Secured Solidity contracts (OpenZeppelin Ownable, ReentrancyGuard)
├── scripts/            # Deploy, configure, and stress/verification automation scripts
├── test/               # 16 unit tests covering all edge cases (97% statement coverage)
├── deployments/        # Deployment metadata (local.json, sepolia.json)
├── docs/               # Technical, security, AI, and presentation documentation
├── frontend/           # Next.js 15 app styled after Stake/Roobet
│   ├── src/contracts/  # Auto-exported ABI and contract addresses
│   └── src/app/vault/  # Centralized on-chain cashier / bank route
├── Makefile            # Global project command automation
└── README.md           # This document
```

---

Built with ❤️ for the Hackathon. Play responsibly. Testnet only. No real funds at stake.
