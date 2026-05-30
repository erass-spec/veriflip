# Loom Script — 5-Minute Demo

**Goal:** prove a working, on-chain, *verifiable* casino fast. Use Instant Play (no wallet friction). Don't hard-refresh mid-demo (wallet state is in-memory; `<Link>` nav is fine).

**Pre-roll checklist:** local node + deploy running (or Sepolia live), `npm run dev` up, browser at `http://localhost:3000` (or the public URL), zoom ~110%, one practice run done.

---

### 0:00–1:00 — First impression & landing
- Open on the landing hero. Read the promise aloud: *"A coin flip you can actually verify."*
- Point to the badge: **on-chain · provably recomputable**. Hover the three value props (bet / settled on-chain / verify).
- Scroll to **How it works** (Connect → Deposit → Flip → Withdraw) and the **Provably fair** section — read the `keccak256(prevrandao, player, seed, nonce) % 2` formula.
- **Say the honest line:** "It's verifiable and recomputable — and we're upfront that prevrandao isn't manipulation-proof; here's our mitigation path." (This earns technical trust early.)

### 1:00–2:00 — Connect & deposit
- Click **Play**, then **Connect Wallet → ⚡ Instant Play**. Call out: *"No MetaMask, no faucet — a real burner sending real on-chain transactions."*
- Show the live reads: balance 0, house bankroll, bet limits, edge 3.5% / pays 1.93x.
- In the **Deposit** field enter `0.5`, click Deposit. Watch the balance update from the confirmed tx. *"That just moved real ETH into the contract."*

### 2:00–3:00 — Gameplay & state animations
- Pick **Heads**, set `0.05`, hit **Flip**. Narrate the pending state: *"Transaction is confirming on-chain right now."*
- Coin spins → lands → **win celebration** (`+0.0465 ETH`). Note balance and house bankroll both update — *"exact 1.93x payout, 0.93 profit, paid from the house."*
- Optionally flip once more to show a loss and the feed growing.

### 3:00–4:00 — On-chain verifiability (the moment)
- Scroll to the **Provably Fair** panel. Walk the fields: prevrandao, player, seed, nonce.
- Point to **Recomputed keccak256** and the side-by-side **Recomputed result == On-chain result** with the **✓ VERIFIED** badge. *"We just recomputed the outcome in your browser from public data and it matches the chain. We can't fake a result."*
- (If Sepolia) click **View on Etherscan** to show the real transaction + event logs.
- Click an older row in **Recent Flips** — *"any past game re-verifies the same way."*

### 4:00–5:00 — Withdraw, tech challenges & roadmap
- Switch to **Withdraw**, cash out `0.5`, show balance drop — *"funds were always yours; loop closed: connect → deposit → play → withdraw."*
- 20-second tech summary: Solidity + OZ, CEI + ReentrancyGuard + liquidity guard, 16 tests at 97% coverage with a test that *recomputes the RNG*, viem frontend, network-aware burner.
- Hardest problem (10s): *"making 'provably fair' an interactive, honest claim — and catching that our one-click demo pointed at localhost before it embarrassed us on the public URL."*
- Roadmap (10s): Chainlink VRF to remove proposer influence, more games on the same verifiable engine, an indexer for global history.
- Close on the verify panel. *"On-chain, verifiable, and honest about its limits. That's Wibe."*
