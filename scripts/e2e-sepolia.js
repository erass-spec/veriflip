// Contract-level E2E against LIVE Sepolia using the Instant-Play burner.
// Proves: deposit -> flip -> off-chain recompute matches -> withdraw, with real txs.
//   npx hardhat run scripts/e2e-sepolia.js --network sepolia
const { ethers, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

function readEnvVar(file, key) {
  const m = fs.readFileSync(file, "utf8").match(new RegExp(`^${key}=(.+)$`, "m"));
  return m ? m[1].trim() : null;
}

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8"));
  const burnerKey = readEnvVar(path.join(__dirname, "..", "frontend", ".env.local"), "NEXT_PUBLIC_SEPOLIA_BURNER_KEY");
  const provider = ethers.provider;
  const burner = new ethers.Wallet(burnerKey, provider);
  const abi = (await artifacts.readArtifact("CoinFlip")).abi;
  const c = new ethers.Contract(dep.address, abi, burner);

  console.log(`burner=${burner.address}`);
  console.log(`burner ETH=${ethers.formatEther(await provider.getBalance(burner.address))}`);
  console.log(`bankroll=${ethers.formatEther(await c.houseBankroll())} limits=${ethers.formatEther(await c.minBet())}-${ethers.formatEther(await c.maxBet())}`);

  let nonce = await provider.getTransactionCount(burner.address, "latest");
  const bet = await c.maxBet(); // 0.002
  const deposit = bet * 3n;

  // 1) deposit
  console.log(`\n[1] deposit ${ethers.formatEther(deposit)} ETH (nonce ${nonce})…`);
  let tx = await c.deposit({ value: deposit, nonce: nonce++ });
  await tx.wait(1);
  console.log(`    ✓ ${tx.hash}  balance=${ethers.formatEther(await c.balances(burner.address))}`);

  // 2) flip
  const seed = ethers.hexlify(ethers.randomBytes(32));
  const choice = 0; // Heads
  const flipNonce = await c.nonces(burner.address);
  console.log(`\n[2] flip Heads bet ${ethers.formatEther(bet)} seed=${seed.slice(0, 12)}… (nonce ${nonce})…`);
  tx = await c.flip(choice, seed, bet, { nonce: nonce++ });
  const rc = await tx.wait(1);
  const ev = rc.logs.map((l) => { try { return c.interface.parseLog(l); } catch { return null; } }).find((p) => p && p.name === "BetSettled");
  const { result, won, payout, prevrandao } = ev.args;

  // 3) off-chain recompute (the provably-fair check)
  const packed = ethers.solidityPacked(["uint256", "address", "bytes32", "uint256"], [prevrandao, burner.address, seed, flipNonce]);
  const recomputed = Number(BigInt(ethers.keccak256(packed)) % 2n);
  const match = recomputed === Number(result);
  console.log(`    ✓ ${tx.hash}`);
  console.log(`    on-chain result=${result} won=${won} payout=${ethers.formatEther(payout)}`);
  console.log(`    off-chain recompute=${recomputed}  =>  ${match ? "✓ VERIFIED (matches)" : "✗ MISMATCH"}`);
  if (!match) throw new Error("provable-fairness recomputation MISMATCH");

  // 4) withdraw
  const bal = await c.balances(burner.address);
  console.log(`\n[3] withdraw ${ethers.formatEther(bal)} ETH (nonce ${nonce})…`);
  tx = await c.withdraw(bal, { nonce: nonce++ });
  await tx.wait(1);
  console.log(`    ✓ ${tx.hash}  balance=${ethers.formatEther(await c.balances(burner.address))}`);

  console.log(`\n✅ LIVE SEPOLIA E2E PASSED — deposit, flip, VERIFIED recompute, withdraw all on-chain.`);
  console.log(`   contract: https://sepolia.etherscan.io/address/${dep.address}`);
  console.log(`   flip tx:  https://sepolia.etherscan.io/tx/${rc.hash}`);
}

main().catch((e) => {
  console.error("E2E FAILED:", e);
  process.exitCode = 1;
});
