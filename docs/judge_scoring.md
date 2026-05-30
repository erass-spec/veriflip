# Hackathon Scoring Simulation (self-critical)

Three personas, scoring 0–10 per category. The goal here is to find weaknesses *before* the judges do, not to flatter the project. Scores assume the **public Sepolia demo is live** (see Limitations if it isn't).

## Panel scores

| Category | 🖥️ Frontend Eng | ⛓️ Web3 Eng | 🎨 Product Designer | Avg |
|---|---|---|---|---|
| UX / UI | 9 | 8 | 8 | **8.3** |
| Technical execution | 8 | 8 | 7 | **7.7** |
| On-chain transparency | 9 | 9 | 8 | **8.7** |
| Product polish | 8 | 7 | 8 | **7.7** |
| Originality | 6 | 7 | 7 | **6.7** |
| **Overall** | | | | **7.8 / 10** |

## 🖥️ Frontend Engineer
- **+** Clean Next.js 15 App Router, typed viem layer, no console errors, real production build, mobile 390px works. Animated coin + verify panel feel premium.
- **+** Error mapping is thoughtful — no raw RPC codes reach the user.
- **−** No skeleton/loading state on first chain read (brief empty values). State is in-memory only — a hard refresh drops the connection.
- **−** No automated frontend tests (only the contract is covered).

## ⛓️ Web3 Engineer
- **+** RNG is genuinely recomputable; the contract exposes `computeResult()` so I can verify independently. CEI + ReentrancyGuard + liquidity guard are all correct. 97% coverage with a test that actually recomputes the hash — not theater.
- **+** The team *documents* the prevrandao limitation instead of hiding it. That honesty scores higher with me than a false "provably fair" badge.
- **−** prevrandao is proposer-influenceable — not production-grade. VRF/commit-reveal would lift this to a 9–10.
- **−** Burner key in the bundle (testnet-only, documented) — acceptable for a demo, but I noticed it, which means I'd want it called out verbally too.

## 🎨 Product Designer
- **+** 5-second clarity: hero says what it is, that it's verifiable, and how to start. Strong dark iGaming aesthetic, coherent neon palette, good rhythm.
- **+** "Verify it yourself" panel turns a trust claim into an interactive moment — memorable.
- **−** Originality: coin flip is the most common casino demo. The *verification UX* is the differentiator; lean into it harder (e.g., animate the keccak recomputation).
- **−** No sound, no haptic-style feedback; win celebration could be bigger.

## Top fixes implemented from this review
1. Made Instant Play network-aware so the **public** one-click CTA uses a Sepolia burner, not localhost (was a demo-killer).
2. Documented the burner-key and prevrandao tradeoffs in `security_review.md` and on the landing page.
3. Kept the "honest limitation" copy visible rather than overclaiming.

## Known limitations carried into submission
- prevrandao randomness (mitigation path documented).
- If Sepolia isn't funded/deployed, the public URL is landing-only and the working demo is the local Loom recording.
- Shared burner can nonce-collide under simultaneous public play.
