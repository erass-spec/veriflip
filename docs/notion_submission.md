# 🎰 VeriFlip — On-Chain Provably-Recomputable Coin Flip

VeriFlip is a provably fair, mobile-first Web3 casino featuring an on-chain Coin Flip game. The player can independently verify and recompute the outcome of every single transaction in real-time using an in-browser terminal, matching public blockchain logs.

## 🔗 Key Resources
- **Live Platform:** [https://frontend-evg-s-projects.vercel.app](https://frontend-evg-s-projects.vercel.app)
- **Smart Contract (Sepolia):** [`0x38097F553ce38747835b429d8674F6861E994955`](https://sepolia.etherscan.io/address/0x38097F553ce38747835b429d8674F6861E994955)
- **GitHub Repository:** [https://github.com/erass-spec/veriflip](https://github.com/erass-spec/veriflip)

---

## 🛠️ Technical Stack & Architecture

- **Smart Contract:** Solidity 0.8.24, OpenZeppelin (`Ownable`, `ReentrancyGuard`), Custom Errors, Events.
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Wagmi, Viem, Framer Motion.
- **Testing & Deployment:** Hardhat, ethers.js, Vercel, Git.
- **CI/CD:** Automated GitHub -> Vercel push-to-deploy pipeline.

---

## 🎲 Provably Fair Engine

Every coin flip outcome is derived on-chain using public inputs: