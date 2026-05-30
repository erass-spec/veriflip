const { ethers, artifacts } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const dep = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8"));
  const provider = ethers.provider;
  const abi = (await artifacts.readArtifact("CoinFlip")).abi;
  const iface = new ethers.Interface(abi);
  const topic = iface.getEvent("BetSettled").topicHash;
  const latest = await provider.getBlockNumber();
  console.log("latest block:", latest, "contract:", dep.address);

  for (const span of [500, 2000, 5000, 10000, 50000, latest]) {
    const from = Math.max(0, latest - span);
    try {
      const logs = await provider.getLogs({ address: dep.address, topics: [topic], fromBlock: from, toBlock: "latest" });
      console.log(`span=${span} (from ${from}) -> OK, ${logs.length} events`);
    } catch (e) {
      console.log(`span=${span} (from ${from}) -> ERROR: ${(e.shortMessage || e.message || "").slice(0, 90)}`);
    }
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
