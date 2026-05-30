const { ethers, network, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deploys CoinFlip, seeds the house bankroll (local only), and exports the ABI +
// address to BOTH deployments/<network>.json and frontend/src/contracts/ so the
// frontend always has a fresh, in-sync contract reference.
async function main() {
  const [deployer] = await ethers.getSigners();
  const net = network.name;
  console.log(`\n[deploy] network=${net} deployer=${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`[deploy] deployer balance=${ethers.formatEther(balance)} ETH`);

  const CoinFlip = await ethers.getContractFactory("CoinFlip");
  const coinflip = await CoinFlip.deploy();
  await coinflip.waitForDeployment();
  const address = await coinflip.getAddress();
  console.log(`[deploy] CoinFlip deployed at ${address}`);

  // Seed the house bankroll on local networks so the demo loop works out of the box.
  const isLocal = net === "localhost" || net === "hardhat";
  if (isLocal) {
    const fund = ethers.parseEther("100");
    await (await coinflip.fundHouse({ value: fund })).wait();
    console.log(`[deploy] funded house bankroll with ${ethers.formatEther(fund)} ETH`);
  } else {
    console.log("[deploy] NOTE: fund the house via fundHouse() before players can win.");
  }

  const deployTx = coinflip.deploymentTransaction();
  const receipt = deployTx ? await deployTx.wait() : null;

  const artifact = await artifacts.readArtifact("CoinFlip");

  const meta = {
    network: net,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    address,
    deployer: deployer.address,
    txHash: deployTx ? deployTx.hash : null,
    blockNumber: receipt ? receipt.blockNumber : null,
    deployedAt: new Date().toISOString(),
  };

  // 1) deployments/<network>.json
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(
    path.join(deploymentsDir, `${net}.json`),
    JSON.stringify(meta, null, 2)
  );
  // Spec alias: local networks also persist to deployments/local.json
  if (isLocal) {
    fs.writeFileSync(path.join(deploymentsDir, "local.json"), JSON.stringify(meta, null, 2));
  }

  // 2) frontend/src/contracts/{CoinFlip.json (abi), deployment-<network>.json}
  const feDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  fs.mkdirSync(feDir, { recursive: true });
  fs.writeFileSync(
    path.join(feDir, "CoinFlip.json"),
    JSON.stringify({ abi: artifact.abi }, null, 2)
  );
  fs.writeFileSync(
    path.join(feDir, `deployment-${net}.json`),
    JSON.stringify(meta, null, 2)
  );

  console.log(`[deploy] wrote deployments/${net}.json and frontend/src/contracts/*`);
  console.log(`[deploy] done.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
