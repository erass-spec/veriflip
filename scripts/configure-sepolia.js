const { ethers, network, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Configures an ALREADY-DEPLOYED CoinFlip on Sepolia (idempotent, nonce-safe).
// Public RPCs can lag on nonce, so we manage nonces explicitly from "latest" and
// confirm each tx before the next. Skips steps that are already done.
//
//   CONTRACT_ADDRESS=0x... npx hardhat run scripts/configure-sepolia.js --network sepolia

function readEnvVar(file, key) {
  try {
    const m = fs.readFileSync(file, "utf8").match(new RegExp(`^${key}=(.+)$`, "m"));
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

async function send(label, signer, txReq, nonce) {
  console.log(`[cfg] ${label} (nonce ${nonce})…`);
  const tx = await signer.sendTransaction({ ...txReq, nonce });
  const rcpt = await tx.wait(1);
  console.log(`[cfg]   ✓ ${tx.hash}`);
  return rcpt;
}

async function main() {
  const addr = process.env.CONTRACT_ADDRESS;
  if (!addr) throw new Error("Set CONTRACT_ADDRESS=0x...");
  const [deployer] = await ethers.getSigners();
  const provider = ethers.provider;
  const coinflip = await ethers.getContractAt("CoinFlip", addr);

  console.log(`[cfg] network=${network.name} contract=${addr} deployer=${deployer.address}`);
  const minBet = ethers.parseEther(process.env.MIN_BET_ETH || "0.0002");
  const maxBet = ethers.parseEther(process.env.MAX_BET_ETH || "0.002");
  const houseTarget = ethers.parseEther(process.env.HOUSE_FUND_ETH || "0.02");
  const burnerFund = ethers.parseEther(process.env.BURNER_FUND_ETH || "0.012");

  let nonce = await provider.getTransactionCount(deployer.address, "latest");

  // 1) Bet limits (skip if already correct)
  const curMax = await coinflip.maxBet();
  if (curMax !== maxBet || (await coinflip.minBet()) !== minBet) {
    await send("setBetLimits", deployer, await coinflip.setBetLimits.populateTransaction(minBet, maxBet), nonce++);
  } else console.log("[cfg] bet limits already set — skip");

  // 2) House bankroll (top up to target)
  const curBank = await coinflip.houseBankroll();
  if (curBank < houseTarget) {
    const top = houseTarget - curBank;
    await send("fundHouse", deployer, { ...(await coinflip.fundHouse.populateTransaction()), value: top }, nonce++);
  } else console.log("[cfg] house bankroll already funded — skip");

  // 3) Fund the Instant-Play burner
  const burnerKey = readEnvVar(path.join(__dirname, "..", "frontend", ".env.local"), "NEXT_PUBLIC_SEPOLIA_BURNER_KEY");
  if (burnerKey) {
    const burnerAddr = new ethers.Wallet(burnerKey).address;
    const bal = await provider.getBalance(burnerAddr);
    if (bal < burnerFund) {
      await send("fund burner", deployer, { to: burnerAddr, value: burnerFund - bal }, nonce++);
    } else console.log("[cfg] burner already funded — skip");
  }

  // 4) Persist metadata + frontend export
  const artifact = await artifacts.readArtifact("CoinFlip");
  const blockNumber = await provider.getBlockNumber();
  const meta = {
    network: network.name,
    chainId: Number((await provider.getNetwork()).chainId),
    address: addr,
    deployer: deployer.address,
    minBet: ethers.formatEther(minBet),
    maxBet: ethers.formatEther(maxBet),
    houseFunded: ethers.formatEther(await coinflip.houseBankroll()),
    blockNumber,
    deployedAt: new Date().toISOString(),
  };
  const dDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dDir, { recursive: true });
  fs.writeFileSync(path.join(dDir, "sepolia.json"), JSON.stringify(meta, null, 2));
  const feDir = path.join(__dirname, "..", "frontend", "src", "contracts");
  fs.mkdirSync(feDir, { recursive: true });
  fs.writeFileSync(path.join(feDir, "CoinFlip.json"), JSON.stringify({ abi: artifact.abi }, null, 2));
  fs.writeFileSync(path.join(feDir, "deployment-sepolia.json"), JSON.stringify(meta, null, 2));

  // Wire the frontend env (idempotent upsert of NEXT_PUBLIC_SEPOLIA_ADDRESS)
  const feEnv = path.join(__dirname, "..", "frontend", ".env.local");
  let env = fs.existsSync(feEnv) ? fs.readFileSync(feEnv, "utf8") : "";
  const re = /^NEXT_PUBLIC_SEPOLIA_ADDRESS=.*$/m;
  const line = `NEXT_PUBLIC_SEPOLIA_ADDRESS=${addr}`;
  env = re.test(env) ? env.replace(re, line) : env + (env && !env.endsWith("\n") ? "\n" : "") + line + "\n";
  fs.writeFileSync(feEnv, env);

  console.log(`\n[cfg] ✓ configured. bankroll=${meta.houseFunded} ETH, limits ${meta.minBet}-${meta.maxBet}`);
  console.log(`[cfg] wrote deployments/sepolia.json + frontend export + NEXT_PUBLIC_SEPOLIA_ADDRESS`);
}

main().catch((e) => {
  console.error("[cfg] FAILED:", e.message || e);
  process.exitCode = 1;
});
