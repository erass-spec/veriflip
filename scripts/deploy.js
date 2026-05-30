const { ethers, network, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Deploys CoinFlip, configures it for the target network, exports the ABI + address
// to deployments/<network>.json and frontend/src/contracts/, and (on public testnets)
// funds the house bankroll + the Instant-Play burner so the demo works end to end.
//
// Tunables via env (sensible defaults per network):
//   HOUSE_FUND_ETH   amount to seed the house bankroll
//   BURNER_FUND_ETH  amount to send the player burner for gas + deposits (testnet only)
//   MIN_BET_ETH / MAX_BET_ETH  bet limits (kept low on testnet so the bankroll lasts)

function readEnvVar(file, key) {
  try {
    const txt = fs.readFileSync(file, "utf8");
    const m = txt.match(new RegExp(`^${key}=(.+)$`, "m"));
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const net = network.name;
  const isLocal = net === "localhost" || net === "hardhat";

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`\n[deploy] network=${net} deployer=${deployer.address}`);
  console.log(`[deploy] deployer balance=${ethers.formatEther(balance)} ETH`);

  if (!isLocal && balance === 0n) {
    console.error(
      `\n[deploy] ✗ Deployer has 0 ETH on ${net}. Fund ${deployer.address} from a faucet, then re-run.\n`
    );
    process.exitCode = 1;
    return;
  }

  const CoinFlip = await ethers.getContractFactory("CoinFlip");
  const coinflip = await CoinFlip.deploy();
  await coinflip.waitForDeployment();
  const address = await coinflip.getAddress();
  console.log(`[deploy] CoinFlip deployed at ${address}`);

  // Public RPCs (load-balanced) lag reporting the pending nonce right after the deploy tx,
  // which previously broke setBetLimits with "nonce too low". Manage the nonce explicitly
  // from "latest" so the post-deploy txs are reliable.
  let nonce = await ethers.provider.getTransactionCount(deployer.address, "latest");

  // Bet limits — small on testnet so a modest bankroll covers many flips.
  const minBet = ethers.parseEther(process.env.MIN_BET_ETH || (isLocal ? "0.001" : "0.0002"));
  const maxBet = ethers.parseEther(process.env.MAX_BET_ETH || (isLocal ? "1" : "0.002"));
  await (await coinflip.setBetLimits(minBet, maxBet, { nonce: nonce++ })).wait();
  console.log(`[deploy] bet limits set: ${ethers.formatEther(minBet)} – ${ethers.formatEther(maxBet)} ETH`);

  // Seed the house bankroll.
  const houseFund = ethers.parseEther(process.env.HOUSE_FUND_ETH || (isLocal ? "100" : "0.02"));
  await (await coinflip.fundHouse({ value: houseFund, nonce: nonce++ })).wait();
  console.log(`[deploy] house bankroll funded: ${ethers.formatEther(houseFund)} ETH`);

  // On public testnets, fund the Instant-Play burner only if it can't already cover gas.
  if (!isLocal) {
    const burnerKey = readEnvVar(
      path.join(__dirname, "..", "frontend", ".env.local"),
      "NEXT_PUBLIC_SEPOLIA_BURNER_KEY"
    );
    if (burnerKey) {
      const burnerAddr = new ethers.Wallet(burnerKey).address;
      const burnerFund = ethers.parseEther(process.env.BURNER_FUND_ETH || "0.012");
      const burnerBal = await ethers.provider.getBalance(burnerAddr);
      if (burnerBal < burnerFund) {
        await (await deployer.sendTransaction({ to: burnerAddr, value: burnerFund - burnerBal, nonce: nonce++ })).wait();
        console.log(`[deploy] topped up Instant-Play burner ${burnerAddr} to ${ethers.formatEther(burnerFund)} ETH`);
      } else {
        console.log(`[deploy] burner ${burnerAddr} already funded (${ethers.formatEther(burnerBal)} ETH) — skip`);
      }
    } else {
      console.log("[deploy] NOTE: no burner key in frontend/.env.local — run `npm run keygen` for Instant Play.");
    }
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
    minBet: ethers.formatEther(minBet),
    maxBet: ethers.formatEther(maxBet),
    houseFunded: ethers.formatEther(houseFund),
    deployedAt: new Date().toISOString(),
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(deploymentsDir, { recursive: true });
  fs.writeFileSync(path.join(deploymentsDir, `${net}.json`), JSON.stringify(meta, null, 2));
  if (isLocal) {
    fs.writeFileSync(path.join(deploymentsDir, "local.json"), JSON.stringify(meta, null, 2));
  }

  const feDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  fs.mkdirSync(feDir, { recursive: true });
  fs.writeFileSync(path.join(feDir, "CoinFlip.json"), JSON.stringify({ abi: artifact.abi }, null, 2));
  fs.writeFileSync(path.join(feDir, `deployment-${net}.json`), JSON.stringify(meta, null, 2));

  console.log(`[deploy] wrote deployments/${net}.json + frontend/src/contracts/*`);
  if (!isLocal) {
    console.log("\n[deploy] Set these in the frontend build env (frontend/.env.local & Vercel):");
    console.log(`   NEXT_PUBLIC_SEPOLIA_ADDRESS=${address}`);
    console.log(`   (NEXT_PUBLIC_SEPOLIA_BURNER_KEY is already in frontend/.env.local)`);
  }
  console.log(`[deploy] done.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
