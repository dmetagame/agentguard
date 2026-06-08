## AgentGuard — dev, deploy, seed
##
## Usage:
##   cp .env.example .env && fill in the blanks
##   make build           — compile contracts
##   make test            — run forge tests
##   make deploy          — deploy AgentGuardVault to Somnia Testnet,
##                          write address to .env and web/.env.local
##   make seed            — seed the deployed vault with 3 demo actions
##   make seed-review     — seed AND fire requestAgentReview on each
##   make web-dev         — start the Next.js dashboard

SHELL := /bin/bash

ifneq (,$(wildcard .env))
include .env
export
endif

FORGE      ?= forge
RPC_FLAG   ?= --rpc-url $(SOMNIA_TESTNET_RPC)
BROADCAST  ?= --broadcast
PK_FLAG    ?= --private-key $(DEPLOYER_PK)

.PHONY: build test deploy seed seed-review web-dev web-build clean

build:
	$(FORGE) build

test:
	$(FORGE) test -vv

## Somnia's EVM accounts ~12× the gas vs vanilla EVM, so forge's local sim
## under-estimates massively. Deploy bypasses forge script and uses `cast
## send` with eth_estimateGas. Seed targets bump --gas-estimate-multiplier
## high enough that each individual tx survives.

deploy:
	@if [ -z "$$DEPLOYER_PK" ]; then echo "Set DEPLOYER_PK in .env"; exit 1; fi
	$(FORGE) build
	@bc=$$(jq -r '.bytecode.object' out/AgentGuardVault.sol/AgentGuardVault.json); \
	args=$$(cast abi-encode 'constructor(address,uint256,uint256)' \
		"$$SOMNIA_PLATFORM" "$$SOMNIA_INFERENCE_AGENT_ID" "$$SOMNIA_PARSE_AGENT_ID"); \
	data="$$bc$${args#0x}"; \
	est=$$(cast estimate $(RPC_FLAG) --create "$$data"); \
	gas=$$(( est + est / 2 )); \
	echo "estimated $$est gas; sending with $$gas"; \
	out=$$(cast send $(RPC_FLAG) $(PK_FLAG) --legacy --gas-limit "$$gas" --create "$$data" --json); \
	addr=$$(echo "$$out" | jq -r '.contractAddress'); \
	status=$$(echo "$$out" | jq -r '.status'); \
	if [ "$$status" != "0x1" ] || [ -z "$$addr" ]; then echo "Deploy failed: $$out"; exit 1; fi; \
	echo "Deployed vault: $$addr"; \
	if grep -q '^VAULT=' .env; then \
		sed -i.bak "s|^VAULT=.*|VAULT=$$addr|" .env && rm .env.bak; \
	else \
		echo "VAULT=$$addr" >> .env; \
	fi; \
	mkdir -p web; \
	printf 'NEXT_PUBLIC_VAULT_ADDRESS=%s\nNEXT_PUBLIC_SOMNIA_PLATFORM=%s\n' \
		"$$addr" "$$SOMNIA_PLATFORM" > web/.env.local; \
	echo "Wrote address to .env and web/.env.local"

seed:
	@SEED_FIRE_REVIEW=0 ./script/seed.sh

seed-review:
	@SEED_FIRE_REVIEW=1 ./script/seed.sh

web-dev:
	cd web && npm run dev

web-build:
	cd web && npm run build

clean:
	$(FORGE) clean
	rm -rf web/.next web/out
