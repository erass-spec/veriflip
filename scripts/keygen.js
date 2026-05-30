const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Generates a fresh deployer wallet for Sepolia. Writes the private key into .env
// (gitignored) and prints ONLY the public address. Never logs the private key.
function main() {
  const wallet = ethers.Wallet.createRandom();
  const envPath = path.join(__dirname, "..", ".env");

  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  if (/^DEPLOYER_PRIVATE_KEY=.+/m.test(env)) {
    console.log("[keygen] DEPLOYER_PRIVATE_KEY already set in .env — refusing to overwrite.");
    console.log(`[keygen] existing key is for a wallet you already control. Aborting.`);
    return;
  }
  const line = `DEPLOYER_PRIVATE_KEY=${wallet.privateKey}\n`;
  if (/^DEPLOYER_PRIVATE_KEY=\s*$/m.test(env)) {
    env = env.replace(/^DEPLOYER_PRIVATE_KEY=\s*$/m, line.trim());
  } else {
    env += (env.endsWith("\n") || env === "" ? "" : "\n") + line;
  }
  fs.writeFileSync(envPath, env);

  console.log("\n[keygen] New Sepolia deployer wallet generated.");
  console.log(`[keygen] PUBLIC ADDRESS: ${wallet.address}`);
  console.log("[keygen] Private key written to .env (gitignored). It was NOT printed.");
  console.log("[keygen] Fund this address with Sepolia ETH from a faucet before deploying.\n");

  // Persist only the public address to state.
  const statePath = path.join(__dirname, "..", "project_state.json");
  if (fs.existsSync(statePath)) {
    const state = JSON.parse(fs.readFileSync(statePath, "utf8"));
    state.sepolia_deployer_address = wallet.address;
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  }
}

main();
