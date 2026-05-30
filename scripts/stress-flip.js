// Stress test for the rapid-click / nonce-lock bug, against LIVE Sepolia.
// Phase 1: fire a burst of flips back-to-back (no wait between sends) with sequential
//          nonces — mirrors the app's serialized allocation. All must settle.
// Phase 2: force a REVERT (withdraw more than balance), then send a valid flip with a
//          freshly-fetched nonce — proves a reverted tx does NOT permanently lock nonces.
//   npx hardhat run scripts/stress-flip.js --network sepolia
const { ethers, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

const BURST = 5;

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8"));
  const burnerKey = fs.readFileSync(path.join(__dirname, "..", "frontend", ".env.local"), "utf8")
    .match(/NEXT_PUBLIC_SEPOLIA_BURNER_KEY=(0x[0-9a-fA-F]+)/)[1];
  const provider = ethers.provider;
  const burner = new ethers.Wallet(burnerKey, provider);
  const abi = (await artifacts.readArtifact("CoinFlip")).abi;
  const c = new ethers.Contract(dep.address, abi, burner);

  const minBet = await c.minBet();
  const bet = minBet; // tiny bets to conserve demo funds
  let bal = await c.balances(burner.address);
  console.log(`burner=${burner.address}`);
  console.log(`wallet ETH=${ethers.formatEther(await provider.getBalance(burner.address))}  game balance=${ethers.formatEther(bal)}  bet=${ethers.formatEther(bet)}`);

  // Ensure enough game balance for the burst.
  const need = bet * BigInt(BURST + 2);
  if (bal < need) {
    console.log(`depositing ${ethers.formatEther(need - bal)} to cover the test…`);
    await (await c.deposit({ value: need - bal })).wait(1);
    bal = await c.balances(burner.address);
  }

  const flipsBefore = await c.totalFlips();

  // ---- Phase 1: rapid burst, sequential nonces, no wait between sends ----
  console.log(`\n[Phase 1] firing ${BURST} flips back-to-back (sequential nonces)…`);
  let nonce = await provider.getTransactionCount(burner.address, "latest");
  const sent = [];
  for (let i = 0; i < BURST; i++) {
    const seed = ethers.hexlify(ethers.randomBytes(32));
    sent.push(c.flip(0, seed, bet, { nonce: nonce++, gasLimit: 320000 }));
  }
  const txs = await Promise.all(sent); // all broadcast
  const receipts = await Promise.all(txs.map((t) => t.wait(1)));
  const settled = receipts.filter((r) => r.status === 1).length;
  console.log(`[Phase 1] ${settled}/${BURST} flips settled (status=1).`);
  const flipsAfterBurst = await c.totalFlips();
  console.log(`[Phase 1] totalFlips ${flipsBefore} -> ${flipsAfterBurst} (Δ ${flipsAfterBurst - flipsBefore})`);
  if (settled !== BURST || flipsAfterBurst - flipsBefore !== BigInt(BURST)) {
    throw new Error("Phase 1 FAILED: not all burst flips settled — nonce desync under rapid fire");
  }

  // ---- Phase 2: force a revert, then recover with a fresh nonce ----
  console.log(`\n[Phase 2] forcing a revert (withdraw > balance) then recovering…`);
  bal = await c.balances(burner.address);
  let n2 = await provider.getTransactionCount(burner.address, "latest");
  // explicit gasLimit bypasses estimation so the tx is actually mined & reverts on-chain
  const badTx = await c.withdraw(bal + ethers.parseEther("1"), { nonce: n2, gasLimit: 100000 });
  const badRc = await badTx.wait(1).catch((e) => e.receipt);
  const reverted = badRc && badRc.status === 0;
  console.log(`[Phase 2] revert tx status=${badRc ? badRc.status : "n/a"} (expected 0 = reverted)`);
  if (!reverted) throw new Error("Phase 2 setup FAILED: expected the withdraw to revert");

  // Recover: re-fetch nonce from chain (NOT a cached increment) and flip.
  const freshNonce = await provider.getTransactionCount(burner.address, "latest");
  console.log(`[Phase 2] re-fetched nonce after revert = ${freshNonce}; sending a valid flip…`);
  const seed = ethers.hexlify(ethers.randomBytes(32));
  const recoverTx = await c.flip(0, seed, bet, { nonce: freshNonce, gasLimit: 320000 });
  const recoverRc = await recoverTx.wait(1);
  console.log(`[Phase 2] recovery flip status=${recoverRc.status} tx=${recoverTx.hash}`);
  if (recoverRc.status !== 1) throw new Error("Phase 2 FAILED: nonce locked after a revert");

  const flipsFinal = await c.totalFlips();
  console.log(`\n✅ STRESS TEST PASSED — ${BURST} rapid flips all settled, and a flip after a revert recovered (no nonce lock).`);
  console.log(`   totalFlips: ${flipsBefore} -> ${flipsFinal}`);
}

main().catch((e) => {
  console.error("STRESS TEST FAILED:", e.message || e);
  process.exitCode = 1;
});
