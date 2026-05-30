# Deploying the Public Demo (Sepolia + Vercel)

Everything is prepared. There is exactly **one step only you can do** — fund the deployer from a faucet — then two commands.

## Step 1 — Fund the deployer (YOU)
Keys are already generated (private keys live in gitignored `.env` and `frontend/.env.local`; only public addresses are recorded).

**Send ~0.1 Sepolia test ETH to the deployer:**

```
0x3bd06a28375b6c0E81564eDe001697F9B47E62A4
```

Faucets: https://sepoliafaucet.com · https://www.alchemy.com/faucets/ethereum-sepolia · https://faucet.quicknode.com/ethereum/sepolia

(The player burner `0xd989CAef0B5b45C4dA1924712fa3Bc8aD3d7426A` is funded automatically by the deploy script — you don't need to fund it.)

> Optional but recommended: set a reliable RPC in `.env`:
> `SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<your-key>`

## Step 2 — Deploy the contract
```bash
bash scripts/deploy-sepolia.sh
```
This compiles, deploys, sets low testnet bet limits (0.0002–0.002 ETH), funds the house bankroll (0.02 ETH), funds the Instant-Play burner (0.012 ETH), and writes `deployments/sepolia.json` + the frontend ABI. It prints the contract address.

## Step 3 — Wire & build the frontend
```bash
echo "NEXT_PUBLIC_SEPOLIA_ADDRESS=<address printed above>" >> frontend/.env.local
cd frontend && npm run build
```

## Step 4 — Deploy the frontend to Vercel
```bash
cd frontend
npx vercel login          # one-time, if not already authed
npx vercel --prod \
  --build-env NEXT_PUBLIC_SEPOLIA_ADDRESS=<address> \
  --build-env NEXT_PUBLIC_SEPOLIA_BURNER_KEY=<value from frontend/.env.local>
```
Or in the Vercel dashboard: set **Root Directory = `frontend`**, add both `NEXT_PUBLIC_*` env vars, and deploy. `vercel.json` is already in `frontend/`.

## Step 5 — Verify
- Open the Vercel URL → **Play → ⚡ Instant Play** → deposit a tiny amount → flip → confirm the verify panel shows **✓ VERIFIED** and the Etherscan link resolves.
- Update the live links in `README.md` and `docs/notion_submission.md`.

---
**If you skip Sepolia:** the app still runs fully locally (`npm run node` → `npm run deploy:local` → `cd frontend && npm run dev`) and the Loom records the complete verified loop. The public URL would then be landing-only.
