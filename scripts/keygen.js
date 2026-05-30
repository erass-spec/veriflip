const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Generates the two keys the public Sepolia demo needs, writes them to gitignored
// env files, and prints ONLY public addresses. Private keys are never logged.
//
//  1) DEPLOYER  -> .env (DEPLOYER_PRIVATE_KEY)         : owner, funded by faucet
//  2) BURNER    -> frontend/.env.local                : the "Instant Play" player
//     (NEXT_PUBLIC_SEPOLIA_BURNER_KEY — intentionally ships in the client bundle;
//      testnet-only, low maxBet. See docs/security_review.md.)
function upsert(file, key, value) {
  let env = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  const re = new RegExp(`^${key}=.*$`, "m");
  if (re.test(env)) env = env.replace(re, `${key}=${value}`);
  else env += (env && !env.endsWith("\n") ? "\n" : "") + `${key}=${value}\n`;
  fs.writeFileSync(file, env);
}

function main() {
  const root = path.join(__dirname, "..");
  const envPath = path.join(root, ".env");
  const feEnvPath = path.join(root, "frontend", ".env.local");

  // --- Deployer ---
  let deployerAddr;
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  const m = existing.match(/^DEPLOYER_PRIVATE_KEY=(0x[0-9a-fA-F]{64})\s*$/m);
  if (m) {
    deployerAddr = new ethers.Wallet(m[1]).address;
    console.log("[keygen] DEPLOYER_PRIVATE_KEY already present — keeping it.");
  } else {
    const w = ethers.Wallet.createRandom();
    upsert(envPath, "DEPLOYER_PRIVATE_KEY", w.privateKey);
    deployerAddr = w.address;
    console.log("[keygen] generated new deployer key -> .env");
  }

  // --- Player burner ---
  let burnerAddr;
  const feExisting = fs.existsSync(feEnvPath) ? fs.readFileSync(feEnvPath, "utf8") : "";
  const bm = feExisting.match(/^NEXT_PUBLIC_SEPOLIA_BURNER_KEY=(0x[0-9a-fA-F]{64})\s*$/m);
  if (bm) {
    burnerAddr = new ethers.Wallet(bm[1]).address;
    console.log("[keygen] burner key already present — keeping it.");
  } else {
    const b = ethers.Wallet.createRandom();
    upsert(feEnvPath, "NEXT_PUBLIC_SEPOLIA_BURNER_KEY", b.privateKey);
    burnerAddr = b.address;
    console.log("[keygen] generated new player burner -> frontend/.env.local");
  }

  console.log("\n========================================================");
  console.log(" DEPLOYER (owner) — FUND THIS from a Sepolia faucet:");
  console.log("   " + deployerAddr);
  console.log(" PLAYER BURNER (auto-funded by the deploy script):");
  console.log("   " + burnerAddr);
  console.log("========================================================\n");

  // Persist only public addresses to state.
  const statePath = path.join(root, "project_state.json");
  if (fs.existsSync(statePath)) {
    const s = JSON.parse(fs.readFileSync(statePath, "utf8"));
    s.sepolia_deployer_address = deployerAddr;
    s.sepolia_burner_address = burnerAddr;
    fs.writeFileSync(statePath, JSON.stringify(s, null, 2));
  }
}

main();
