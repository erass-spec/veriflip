// One-off: reclaim the house bankroll from the OLD (pre-fix) contract back to the deployer.
//   npx hardhat run scripts/reclaim-old-house.js --network sepolia
const { ethers, artifacts } = require("hardhat");

async function main() {
  const OLD = process.env.OLD_ADDRESS || "0x4Dc741EB5D5e7491C50013228157f6427F59fd4b";
  const [deployer] = await ethers.getSigners();
  const abi = (await artifacts.readArtifact("CoinFlip")).abi;
  const c = new ethers.Contract(OLD, abi, deployer);

  const owner = await c.owner();
  console.log(`old contract : ${OLD}`);
  console.log(`owner        : ${owner}`);
  console.log(`caller       : ${deployer.address}`);
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error("Caller is not the owner — cannot withdrawHouse");
  }

  const bankroll = await c.houseBankroll();
  console.log(`house bankroll: ${ethers.formatEther(bankroll)} ETH`);
  if (bankroll === 0n) {
    console.log("Nothing to reclaim.");
    return;
  }

  const before = await ethers.provider.getBalance(deployer.address);
  const nonce = await ethers.provider.getTransactionCount(deployer.address, "latest");
  const tx = await c.withdrawHouse(bankroll, { nonce });
  console.log(`\nwithdrawHouse tx: ${tx.hash}`);
  const rc = await tx.wait(1);
  const after = await ethers.provider.getBalance(deployer.address);

  console.log(`status        : ${rc.status === 1 ? "✓ success" : "✗ reverted"}`);
  console.log(`deployer ETH  : ${ethers.formatEther(before)} -> ${ethers.formatEther(after)}`);
  console.log(`old bankroll  : ${ethers.formatEther(await c.houseBankroll())} ETH (now drained)`);
  console.log(`\nNote: the burner's player balance in the old contract (~0.0114 ETH) is the burner's own funds; reclaim separately via withdraw() from the burner if desired.`);
}

main().catch((e) => {
  console.error("RECLAIM FAILED:", e.message || e);
  process.exitCode = 1;
});
