# AgentGuard — Submission

**An on-chain firewall for autonomous AI wallets.**

| | |
|---|---|
| **Live site** | https://agentguard-beta.vercel.app |
| **Dapp** | https://agentguard-beta.vercel.app/app |
| **Pitch deck (3 slides, animated)** | https://agentguard-beta.vercel.app/submission-deck.html |
| **One-slide pitch** | https://agentguard-beta.vercel.app/submission-slide.html |
| **Source** | https://github.com/dmetagame/agentguard |
| **Network** | Somnia Testnet (chainId 50312) |
| **Vault** | [`0x3f64d310b88f8c89afd70cccd33094df7e7c3a91`](https://shannon-explorer.somnia.network/address/0x3f64d310b88f8c89afd70cccd33094df7e7c3a91) |
| **Proof of all three verdicts** | [PROOF.md](./PROOF.md) |

---

## The problem

AI agents are starting to hold private keys and move funds autonomously. The moment they do, they become an unbounded liability: one prompt injection, one hallucinated trade, or one malicious counterparty drains the wallet — with nothing on-chain to stop it. Today the only safety layer is the agent's own judgment, which is exactly the thing under attack.

## What AgentGuard does

AgentGuard inserts a **programmable, on-chain checkpoint between an agent's intent and settlement.** Funds live in a vault contract. An agent can *propose* actions but can never execute them directly. Every proposed action is reviewed by **consensus-verified Somnia Agents** before the vault will move a cent, producing one of three verdicts:

- **APPROVE** → the vault executes it immediately, no human in the loop.
- **REVIEW** → ambiguous; held behind a 24-hour timelock the owner can veto.
- **BLOCK** → policy violation; never executable, enforced by the contract.

The owner defines a **policy** — per-action spend cap, max ratio of the vault, review timelock, target allowlist, blocked keywords — and the agents enforce it.

## How it works (the agent pipeline)

When a review is requested, the vault dispatches an **asynchronous request to the Somnia Agent platform** (`createRequest`) and waits for a callback (`handleResponse`) — no off-chain oracle:

1. **Parse-Website Agent** (optional) — if the action carries an evidence URL, it scrapes the page and extracts a structured safety signal (e.g. whether the target is audited), fed forward into the prompt.
2. **LLM Inference Agent** (Qwen3-30B; deterministic: temperature 0, fixed `allowedValues = [APPROVE, REVIEW, BLOCK]`) — judges the action against the owner's policy and returns one verdict.
3. **On-chain consensus** — the verdict comes from a validator subcommittee; the contract accepts only a strict-majority result, and `handleResponse` is gated to `msg.sender == platform`. The verdict is written on-chain (`ActionDecided`) and the vault disposes of the action.

## Live proof — all three verdicts on-chain

| Scenario | Action | Verdict | Result |
|---|---|---|---|
| Safe payment to an allowlisted recipient | #1 | **APPROVE** | Executed on-chain |
| Oversized transfer to an unknown address | #2 | **BLOCK** | `executeAction` reverts `NotApproved(Block)` |
| Plain transfer to a non-allowlisted payee | #5 | **REVIEW** | Held behind a 24h timelock |

Transaction links in [PROOF.md](./PROOF.md). The dapp's proof cards read these verdicts **live from the contract** and render **without a wallet**.

## Security model

- **Solvency invariant** — review fees are charged to the owner's accounted balance, never the shared pool, so `sum(balances) ≤ contract balance` always holds.
- **Authenticated reviews** — only the owner or their authorized agent can propose or request a review.
- **Hard policy caps** — `maxSpend` / `maxRatioBps` are enforced at execution; even an APPROVE can't exceed them.
- **Authenticated callbacks + consensus** — verdicts accepted only from the platform, only on a strict-majority result.
- **Fail-safe / fail-closed** — a failed/timed-out review returns the action to *Proposed* (retryable, never auto-approved); a reverting outbound call rolls the whole execution back.

Covered by **11 passing Foundry tests** (approve, block, review, timelock, fee-solvency, failed-review retry, max-spend hard cap, auth).

## Engineering context

- **Platform integration** required deriving the callback selector from the platform's canonical signature (incl. tuple struct layouts — a wrong selector means validators silently skip), funding requests above the real deposit floor, and mapping request IDs back to actions (the platform `Request` struct carries no agent ID).
- **Somnia specifics** — ~12× vanilla-EVM gas and no PUSH0, so contracts compile with `evm_version = "paris"` and deploy via `cast send` with a chain gas estimate + margin + `--legacy`.
- **Two security audits** — a self-audit closed a critical solvency hole and added on-chain policy enforcement; an independent automated audit's findings were then addressed (completed the live three-verdict proof, reliable action discovery, in-card review, full README, OG/metadata).

## Known limitations (honest scope)

- Verdicts are LLM-driven and non-deterministic.
- The REVIEW proof (#5) is a fresh inference-only action; the original evidence-URL path failed on an unreachable demo URL — which demonstrated the fail-safe (action returned to *Proposed*).
- Callback idempotency, per-user rebate accounting, and hard allowlist enforcement are documented as follow-ups in the repo README.

## Stack

Foundry / Solidity vault · Somnia Agent platform (Parse-Website + LLM Inference) · Next.js + wagmi/viem dashboard, deployed on Vercel.
