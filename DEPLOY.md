# Deploying the Public Demo (Sepolia + Vercel)

## ✅ Status: contract is LIVE on Sepolia
- **CoinFlip:** [`0x4Dc741EB5D5e7491C50013228157f6427F59fd4b`](https://sepolia.etherscan.io/address/0x4Dc741EB5D5e7491C50013228157f6427F59fd4b) — deployed, limits 0.0002–0.002, house bankroll 0.02 ETH, Instant-Play burner funded.
- Full loop **verified on live Sepolia** in a real browser (connect → deposit → flip WON → ✓ VERIFIED → withdraw) and via `scripts/e2e-sepolia.js`.
- `frontend/.env.local` is wired (`NEXT_PUBLIC_SEPOLIA_ADDRESS` + burner key). `frontend/npm run build` passes.

**Only remaining step → deploy the frontend (needs your Vercel auth). Jump to Step 4.**

---

<details><summary>Steps 1–3 (already done — for reference / re-deploy)</summary>

Everything below was already executed. Keep for re-deploying from scratch.

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

</details>

## Step 4 — Deploy the frontend to Vercel  ← **DO THIS**
From the repo root. The command reads both env values straight from `frontend/.env.local`, so nothing secret is typed by hand:

```bash
cd frontend
npx vercel login            # one-time, if not already authed
npx vercel --prod \
  --build-env NEXT_PUBLIC_SEPOLIA_ADDRESS="$(grep '^NEXT_PUBLIC_SEPOLIA_ADDRESS=' .env.local | cut -d= -f2)" \
  --build-env NEXT_PUBLIC_SEPOLIA_BURNER_KEY="$(grep '^NEXT_PUBLIC_SEPOLIA_BURNER_KEY=' .env.local | cut -d= -f2)"
```

Accept the prompts (it auto-detects Next.js; **Root Directory = current dir**). Or via the **dashboard**: import the repo, set **Root Directory = `frontend`**, add the two `NEXT_PUBLIC_*` env vars (copy from `frontend/.env.local`), deploy. `vercel.json` is already there.

## Step 5 — Verify
- Open the Vercel URL → **Play → ⚡ Instant Play** → deposit a tiny amount → flip → confirm the verify panel shows **✓ VERIFIED** and the Etherscan link resolves.
- Update the live links in `README.md` and `docs/notion_submission.md`.

---
**If you skip Sepolia:** the app still runs fully locally (`npm run node` → `npm run deploy:local` → `cd frontend && npm run dev`) and the Loom records the complete verified loop. The public URL would then be landing-only.
