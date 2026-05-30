const { ethers, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8"));
  const provider = ethers.provider;
  const abi = (await artifacts.readArtifact("CoinFlip")).abi;
  const c = new ethers.Contract(dep.address, abi, provider);
  const burnerKey = fs.readFileSync(path.join(__dirname, "..", "frontend", ".env.local"), "utf8").match(/NEXT_PUBLIC_SEPOLIA_BURNER_KEY=(0x[0-9a-fA-F]+)/)[1];
  const burner = new ethers.Wallet(burnerKey).address;
  const [deployer] = await ethers.getSigners();

  const f = (w) => ethers.formatEther(w);
  console.log("deployer wallet ETH :", f(await provider.getBalance(deployer.address)), deployer.address);
  console.log("burner   wallet ETH :", f(await provider.getBalance(burner)), burner);
  console.log("burner   game balance:", f(await c.balances(burner)));
  console.log("house    bankroll    :", f(await c.houseBankroll()));
  console.log("total flips          :", (await c.totalFlips()).toString());
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
