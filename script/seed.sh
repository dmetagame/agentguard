#!/usr/bin/env bash
# Seeds a deployed AgentGuardVault with a 24h-timelock policy, a deposit,
# and one proposed action per demo scenario. Uses `cast send` instead of
# `forge script` because Somnia's gas accounting breaks forge's local sim.
#
# Env vars (read from .env via Makefile):
#   VAULT, DEPLOYER_PK, SOMNIA_TESTNET_RPC
#   DEMO_RECIPIENT, DEMO_DRAINER, DEMO_UNKNOWN_DAPP, DEMO_EVIDENCE_URL
#   DEMO_DEPOSIT_WEI, DEMO_REVIEW_DEPOSIT_WEI
#   SEED_FIRE_REVIEW=1 to also call requestAgentReview on each action

set -euo pipefail

: "${VAULT:?VAULT not set}"
: "${DEPLOYER_PK:?DEPLOYER_PK not set}"
: "${SOMNIA_TESTNET_RPC:?SOMNIA_TESTNET_RPC not set}"
: "${DEMO_RECIPIENT:?DEMO_RECIPIENT not set}"
: "${DEMO_DRAINER:?DEMO_DRAINER not set}"
: "${DEMO_UNKNOWN_DAPP:?DEMO_UNKNOWN_DAPP not set}"

DEMO_EVIDENCE_URL="${DEMO_EVIDENCE_URL:-https://unknown.fi}"
DEMO_DEPOSIT_WEI="${DEMO_DEPOSIT_WEI:-2000000000000000000}"
DEMO_REVIEW_DEPOSIT_WEI="${DEMO_REVIEW_DEPOSIT_WEI:-400000000000000000}"
SEED_FIRE_REVIEW="${SEED_FIRE_REVIEW:-0}"

RPC="$SOMNIA_TESTNET_RPC"
PK="$DEPLOYER_PK"
DEPLOYER=$(cast wallet address --private-key "$PK")

# Tip: cast send already does its own gas estimation server-side when no
# --gas-limit is passed. Somnia's estimateGas is correct; only forge's
# local sim is off. So we just let cast handle it, with a 2× safety bump.
send() {
  local to="$1" value="$2"; shift 2
  local sig="$1"; shift
  local args=("$@")
  local est
  est=$(cast estimate --rpc-url "$RPC" --from "$DEPLOYER" --value "$value" "$to" "$sig" "${args[@]}")
  local gas=$(( est * 3 / 2 ))
  cast send --rpc-url "$RPC" --private-key "$PK" --legacy --gas-limit "$gas" \
    --value "$value" "$to" "$sig" "${args[@]}" --json | jq -r '.transactionHash + "  status=" + .status'
}

echo "Seeding $VAULT from $DEPLOYER"
echo "  deposit:        $(cast --from-wei "$DEMO_DEPOSIT_WEI") STT"
echo "  review deposit: $(cast --from-wei "$DEMO_REVIEW_DEPOSIT_WEI") STT each"
echo "  fire reviews:   $SEED_FIRE_REVIEW"
echo

MAX_SPEND=$(( DEMO_DEPOSIT_WEI / 2 ))
A1_VALUE=$(( DEMO_DEPOSIT_WEI / 4 ))
A2_VALUE=$(( DEMO_DEPOSIT_WEI * 9 / 10 ))
A3_VALUE=$(( DEMO_DEPOSIT_WEI / 20 ))

echo "→ createPolicy"
send "$VAULT" 0 \
  "createPolicy(address,uint256,uint256,uint256,address[],string[])" \
  "$DEPLOYER" "$MAX_SPEND" 5000 86400 \
  "[$DEMO_RECIPIENT]" '["drain","rug"]'

echo "→ deposit($DEMO_DEPOSIT_WEI)"
send "$VAULT" "$DEMO_DEPOSIT_WEI" "deposit()"

echo "→ proposeAction #1 (safe payment)"
send "$VAULT" 0 \
  "proposeAction(address,address,uint256,bytes,string,string)" \
  "$DEPLOYER" "$DEMO_RECIPIENT" "$A1_VALUE" "0x" "pay invoice for compute" ""

echo "→ proposeAction #2 (suspicious drain)"
send "$VAULT" 0 \
  "proposeAction(address,address,uint256,bytes,string,string)" \
  "$DEPLOYER" "$DEMO_DRAINER" "$A2_VALUE" "0x" "withdraw funds" ""

echo "→ proposeAction #3 (ambiguous action)"
send "$VAULT" 0 \
  "proposeAction(address,address,uint256,bytes,string,string)" \
  "$DEPLOYER" "$DEMO_UNKNOWN_DAPP" "$A3_VALUE" "0xdeadbeef" "swap on unknown dex" "$DEMO_EVIDENCE_URL"

if [[ "$SEED_FIRE_REVIEW" == "1" ]]; then
  echo "→ requestAgentReview #1"
  send "$VAULT" "$DEMO_REVIEW_DEPOSIT_WEI" "requestAgentReview(uint256)" 1
  echo "→ requestAgentReview #2"
  send "$VAULT" "$DEMO_REVIEW_DEPOSIT_WEI" "requestAgentReview(uint256)" 2
  echo "→ requestAgentReview #3"
  send "$VAULT" "$DEMO_REVIEW_DEPOSIT_WEI" "requestAgentReview(uint256)" 3
fi

echo "done."
