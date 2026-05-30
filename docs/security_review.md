# Security Review — VeriFlip CoinFlip

**Scope:** `contracts/CoinFlip.sol` (Solidity 0.8.24, OpenZeppelin Ownable + ReentrancyGuard) and the public-demo deployment model.
**Posture:** This is a hackathon/testnet build. It is engineered to be *honest* about its limits rather than to overstate them. Findings are rated Critical / High / Medium / Low / Info.

---

## Summary table

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Same-transaction conditional-revert exploit (atomic `flip()`) | **Critical** (prod) / Accepted (testnet) | Documented; mitigation defined, not patched on live demo |
| 2 | `block.prevrandao` randomness is proposer-influenceable | **High** (prod) / Accepted (testnet) | Documented, mitigation path defined |
| 3 | Owner can withdraw the entire house bankroll | **Medium** | By design; cannot touch player balances (invariant proven) |
| 4 | Testnet burner private key ships in the client bundle | **Low** | Intentional, testnet-only, low `maxBet` |
| 5 | Payout rounding favors the house on odd-wei bets | **Low / Info** | Acceptable; direction is safe |
| 6 | Shared burner nonce collisions under concurrent demo play | **Low** | Demo-only UX caveat |
| Reentrancy, insolvency | — | Mitigated | See below |

---

## 1. Same-transaction conditional-revert exploit — **Critical (production)**

Because `flip()` is `external`, settles atomically in one transaction, and returns `(bool won, uint256 payout)`, **any player (not just a validator) can guarantee a win** by calling it from a wrapper contract and reverting the whole transaction on a loss:

```solidity
function attack() external {
    (bool won, ) = casino.flip(Side.Heads, seed, betAmount);
    require(won); // on a loss, revert -> the bet deduction is rolled back, nothing is lost
}
```

A reverted transaction undoes the in-`flip` balance deduction, so the attacker only ever *realizes* wins and drains the house bankroll for the price of gas. This is the canonical break of **any** same-transaction `prevrandao`/`blockhash` game, and it is **more accessible and more severe than the validator-withholding risk (#2)** — it needs no privileged position, just a contract caller.

- **Why accepted here:** testnet only, no real value, and the demo's thesis is *transparency/recomputability* — which still holds (the outcome is honestly derived and recomputable). It does **not** hold up as a real-money casino.
- **Mitigation (future work, NOT applied to the live demo):**
  - `require(msg.sender == tx.origin)` blocks contract wrappers (cheap; caveat: also blocks smart-contract / account-abstraction wallets), **or**
  - move to a **two-transaction commit–reveal or Chainlink VRF** flow so the result is not known within the calling transaction (also fixes #2). VRF is the production-grade fix for both findings at once.
- **Not patched now by design:** the contract is live, funded, verified, and wired into the frontend. Redeploying to patch a *documented testnet limitation* this close to submission would force a re-fund + re-wire + full re-test — exactly the high-risk, late-stage churn we've deliberately avoided. The honest-limitations writeup is the correct response for a hackathon testnet build.

## 2. Randomness is verifiable, not manipulation-proof — **High (production)**

The outcome is `uint256(keccak256(abi.encodePacked(block.prevrandao, player, seed, nonce))) % 2`.

`block.prevrandao` is the RANDAO value contributed by the block proposer. A validator who proposes the block in which a `flip()` lands **can choose to withhold a block** to avoid an unfavorable `prevrandao`, biasing outcomes in their favor. This is the canonical limitation of on-chain RANDAO randomness.

- **What this build guarantees:** every result is *recomputable* from public data — no hidden server seed, no possibility for the *operator* to silently fake a result. The frontend and the contract's `computeResult()` both recompute it. This is real "provably fair" in the sense of *operator non-manipulation*.
- **What it does NOT guarantee:** resistance to a *validator* manipulating the underlying entropy.
- **Mitigation path (documented, not implemented):** Chainlink VRF (verifiable, external) or a commit–reveal scheme (player commits a hashed seed in tx 1, reveals in tx 2). Both remove proposer influence at the cost of demo UX (2 txs or LINK funding).
- **Why accepted here:** testnet, no real value at stake, and the demo's thesis is *transparency/recomputability*, which prevrandao satisfies. The landing page states this limitation explicitly rather than claiming "uncheatable."

## 2. Owner can drain the house bankroll — **Medium**

`withdrawHouse()` lets the owner remove `houseBankroll`. This is a centralization/trust assumption typical of a casino operator.

**Mitigating property (proven invariant):** `withdrawHouse` reverts unless `houseBankroll >= amount`, and the contract maintains
`address(this).balance == Σ player balances + houseBankroll` across every state transition (deposit, withdraw, win, loss — each conserves or moves value between the two buckets only). Therefore **the owner can never withdraw funds that belong to players**; the worst case is draining the house's own liquidity, after which the liquidity guard simply blocks new bets. Player withdrawals remain fully solvent.

## 3. Burner key in the client bundle — **Low**

The public one-click "Instant Play" mode ships a **testnet-only** burner private key (`NEXT_PUBLIC_SEPOLIA_BURNER_KEY`) in the JS bundle so visitors can play with no wallet.
- Risk is bounded by: testnet ETH only (no real value), a low `maxBet` (0.002 ETH), and a small funded balance.
- Worst case: someone drains the burner's testnet ETH. No production funds, no contract compromise (the burner is just a player).
- This is an explicit demo tradeoff, surfaced here rather than hidden. MetaMask remains available as the no-key path.

## 4. Payout rounding — **Low / Info**

`payout = betAmount * 19300 / 10000` uses integer division. For bets not divisible by 10000 wei, the result rounds **down**, marginally favoring the house (sub-wei). Direction is safe (never overpays); magnitude is negligible. `minBet` is far above the rounding scale.

## 5. Shared burner nonce collisions — **Low**

If multiple visitors use Instant Play simultaneously, they share one burner account and may produce conflicting nonces, causing a transaction to fail with a friendly retry message. Demo-only; real users on MetaMask are unaffected. Acceptable for a hackathon.

---

## Mitigated / not exploitable

- **Reentrancy:** `withdraw`, `flip`, `withdrawHouse` are `nonReentrant` and follow checks-effects-interactions — balances/bankroll are updated *before* any `.call{value:}`. The only external calls are ETH transfers to `msg.sender`/`owner`.
- **Insolvency / can't-pay-winner:** the liquidity guard in `flip()` rejects any bet whose max profit the bankroll can't cover, so a winner is always payable.
- **Pre-computation / replay:** a player cannot *predict* their result at submission time, because `prevrandao` for the block their tx lands in is set by that block's proposer, and the outcome binds to `msg.sender` + per-player `nonce` (so a settled result can't be replayed). **Caveat:** this does NOT mean the outcome can't be *cherry-picked* — it can be, within the same transaction, via the conditional-revert exploit in finding #1. We call that out explicitly rather than claiming false immunity.
- **Overflow:** Solidity 0.8.24 checked arithmetic; the one `unchecked` block only increments counters that cannot realistically overflow.
- **Failed-transfer griefing:** a contract recipient that reverts on receive only blocks *its own* withdrawal, not others'.

## Test evidence

16 passing tests, **97% statements / 81% branch / 98% lines**. The headline test recomputes the RNG off-chain and asserts it matches the contract for **both** win and loss branches, and verifies exact balance/bankroll accounting per outcome. See `test/CoinFlip.test.js`.
