#!/usr/bin/env bash
# One-shot Sepolia deploy. Run from repo root: bash scripts/deploy-sepolia.sh
# Prereqs: `npm run keygen` has created .env (DEPLOYER_PRIVATE_KEY) and
# frontend/.env.local (NEXT_PUBLIC_SEPOLIA_BURNER_KEY), and the deployer is funded.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ] || ! grep -q '^DEPLOYER_PRIVATE_KEY=0x' .env; then
  echo "✗ No deployer key. Run: npm run keygen"
  exit 1
fi

echo "▶ Compiling…"
npx hardhat compile

echo "▶ Deploying to Sepolia (deploys, sets low bet limits, funds house + burner)…"
npx hardhat run scripts/deploy.js --network sepolia

ADDR=$(node -e "console.log(require('./deployments/sepolia.json').address)")
echo ""
echo "✅ Deployed at $ADDR"
echo ""
echo "Next — wire the frontend and deploy it:"
echo "  1) echo 'NEXT_PUBLIC_SEPOLIA_ADDRESS=$ADDR' >> frontend/.env.local"
echo "  2) cd frontend && npm run build"
echo "  3) See DEPLOY.md for the Vercel commands (set the same env vars there)."
