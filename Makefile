# Wibe — development & deployment automation
# NOTE: recipe lines are indented with REAL TAB characters (required by make).

FRONTEND := frontend
ENV_FILE := $(FRONTEND)/.env.local

.DEFAULT_GOAL := help
.PHONY: help dev build test node deploy-local deploy

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

dev: ## Run the frontend dev server (http://localhost:3000)
	cd $(FRONTEND) && npm run dev

build: ## Production build of the frontend
	cd $(FRONTEND) && npm run build

test: ## Run the smart-contract test suite
	npx hardhat test

node: ## Start a local Hardhat node
	npx hardhat node

deploy-local: ## Deploy the contract to the local node + export ABI
	npx hardhat run scripts/deploy.js --network localhost

deploy: ## [Fallback] Manual Vercel prod deploy — normally a push to main auto-deploys
	@test -f $(ENV_FILE) || { echo "ERROR: missing $(ENV_FILE) — run 'npm run keygen' and the Sepolia deploy first."; exit 1; }
	cd $(FRONTEND) && npx vercel --prod \
		--build-env NEXT_PUBLIC_SEPOLIA_ADDRESS="$$(grep '^NEXT_PUBLIC_SEPOLIA_ADDRESS=' .env.local | cut -d= -f2)" \
		--build-env NEXT_PUBLIC_SEPOLIA_BURNER_KEY="$$(grep '^NEXT_PUBLIC_SEPOLIA_BURNER_KEY=' .env.local | cut -d= -f2)"
