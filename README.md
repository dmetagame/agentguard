# AgentGuard

**An on-chain firewall for autonomous AI wallets.** Before an AI agent can move
funds, its proposed action is reviewed by consensus-verified [Somnia
Agents](https://docs.somnia.network/agents). Safe actions execute immediately,
dangerous actions are blocked, and ambiguous actions are held behind a
human-review timelock — all enforced by the vault contract, not by trust in the
agent.

- **Live site:** https://agentguard-beta.vercel.app — **launch the dapp at [/app](https://agentguard-beta.vercel.app/app)** (vault, policy, propose & review actions; the live proof cards render there without a wallet).
- **Network:** Somnia Testnet (chainId `50312`)
- **Vault:** [`0x3f64d310b88f8c89afd70cccd33094df7e7c3a91`](https://shannon-explorer.somnia.network/address/0x3f64d310b88f8c89afd70cccd33094df7e7c3a91)
- Built for the **Somnia Agentathon**.

---

## Why

Autonomous agents that hold a private key can already spend funds. Today the only
safety layer is the agent's own judgment — a prompt-injected page, a hallucinated
tool call, or a compromised key drains the wallet with nothing to stop it.

AgentGuard inserts a **programmable, on-chain checkpoint between intent and
settlement.** The agent proposes; Somnia Agents review; the vault enforces hard
policy caps the LLM verdict cannot override. Money only moves after the action
clears review.

## How it works

```
agent.proposeAction(target, value, data, reason, evidenceUrl)
        │
        ▼
requestAgentReview(actionId)         ← only owner or authorized agent, self-funding
        │
        ├─ evidenceUrl set?  ─ yes ─► Parse-Website Agent  (extracts a safety signal
        │                              from the dApp page; result feeds the prompt)
        │                                       │
        ▼                                       ▼
   LLM Inference Agent  (Qwen3-30B, temp=0, allowedValues=[APPROVE,REVIEW,BLOCK])
        │
        ▼  handleResponse() — gated to msg.sender == platform, strict-majority consensus
   ┌────────────┬─────────────────────────────┬──────────────────────────┐
   │ APPROVE    │ REVIEW                       │ BLOCK                    │
   │ execute now│ execute after 24h timelock   │ never executable         │
   └────────────┴─────────────────────────────┴──────────────────────────┘
        │
        ▼
executeAction(actionId)  — re-checks maxSpend / maxRatioBps as HARD caps,
                           fails closed if the outbound call reverts
```

Reviews are **paid from the owner's vault balance**, never from the shared
contract pool, so `sum(balances) <= address(this).balance` always holds and the
vault can't be drained by firing reviews.

## Live proof — three verdicts on testnet

All three outcomes are demonstrated on the production vault. Verdicts are read
live on the landing page; the transactions below prove each on-chain.

| Scenario        | Action | Verdict   | Result                | Proof |
|-----------------|:------:|-----------|-----------------------|-------|
| Safe payment      | `#1`   | `APPROVE` | Executed             | [decided](https://shannon-explorer.somnia.network/tx/0x55afbc7373c73f67c58c69504eba9d92f4502ddd7d64488bdd74c26a4c033e3a) · [executed](https://shannon-explorer.somnia.network/tx/0x33a8808d06885bf0e0d04cb78b8d47f0e5d5a6ab1f1f0886a77b2645c41f9dd3) |
| Suspicious drain  | `#2`   | `BLOCK`   | Never executable     | [review](https://shannon-explorer.somnia.network/tx/0x3e01ee959db2a04cf1ab765810a564fa7e7ce90868782186d8056f789f13ee77) · [decided](https://shannon-explorer.somnia.network/tx/0x51432bcda88b28f5e60c6664854981b3cf705b6a267e21378510ccb6d8b2ae97) |
| Unrecognized payee| `#5`   | `REVIEW`  | Held behind 24h timelock | [review](https://shannon-explorer.somnia.network/tx/0x4f56c6bb4dfa1d2bb41d7fad9c1df54db413ab414d461dda34f34b8787ac9823) · [decided](https://shannon-explorer.somnia.network/tx/0x351438752ac853201fe264ee50c485fdc5a6c27c261c59ff316babf89e613332) |

`executeAction(#2)` reverts with `NotApproved(Block)` — the block is enforced by
the contract, not just displayed in the UI. `executeAction(#5)` reverts with
`ReviewTimelockPending` until the 24h timelock elapses.

## Architecture

| Component | Address / ID |
|-----------|--------------|
| Vault (`AgentGuardVault`) | `0x3f64d310b88f8c89afd70cccd33094df7e7c3a91` |
| Somnia Agent Platform     | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` |
| LLM Inference Agent (Qwen3-30B) | `12847293847561029384` |
| Parse-Website Agent       | `12875401142070969085` |
| RPC | `https://dream-rpc.somnia.network` |
| Explorer | `https://shannon-explorer.somnia.network` |

- **`src/AgentGuardVault.sol`** — vault, policy, action lifecycle, async agent
  dispatch + callback.
- **`src/interfaces/ISomniaAgentPlatform.sol`** — platform interface and structs.
- **`web/`** — Next.js + wagmi/viem dashboard (deposit, policy, propose, review,
  execute, live proof cards).

## Security model

- **Solvency invariant.** Agent fees are debited from the owner's accounted
  balance, so deposited funds are always fully backed by contract ETH.
- **Authenticated reviews.** Only the owner or their authorized agent may propose
  or request review — closes the griefing vector of firing paid reviews on
  someone else's action.
- **Hard policy caps.** `maxSpend` and `maxRatioBps` are enforced in
  `executeAction` and an `APPROVE` verdict cannot exceed them.
- **Authenticated callbacks.** `handleResponse` is gated to the platform address;
  consensus requires a strict `Success` majority of the validator subcommittee.
- **Fail safe / fail closed.** A failed or timed-out review returns the action to
  `Proposed` (retryable, never auto-approved); a reverting outbound call rolls the
  whole execution back.

## Known limitations

Honest scope notes for reviewers:

- **Callback idempotency.** `handleResponse` validates the platform sender and
  fails safe on non-success, but does not additionally re-check that the action is
  still in the matching pending stage for the incoming request ID. On this single
  external platform a stale/duplicate callback is the relevant edge; hardening it
  (and clearing `requestToAction`/`requestKind` after use) is the top follow-up.
- **Review budgets are fixed fees.** `INFERENCE_BUDGET`/`PARSE_BUDGET` are charged
  to the vault up front. Any unused amount the platform rebates stays as protocol
  surplus in the contract — it is **not** re-credited per-user. Treat the review
  cost as a flat fee.
- **Allowlist & blocked keywords are review context, not hard gates.** They are
  fed to the LLM as policy signal. Only `maxSpend`/`maxRatioBps` are deterministic
  on-chain limits. (Interacting with a non-allowlisted target is exactly what the
  `REVIEW` timelock is for.)

## Build & test

Foundry (contract):

```bash
export PATH="$HOME/.foundry/bin:$PATH"
forge build
forge test -vv          # 11 tests: approve, block, review, timelock,
                        # fee-solvency, failed-review retry, maxSpend hard cap, auth
```

Frontend:

```bash
cd web
npm ci
npm run lint            # clean
npm run build
npm run dev             # http://localhost:3000
```

Deploy / seed (see `Makefile` and `script/`): deploys via `cast send` with a
chain gas estimate + margin + `--legacy`, and compiles with
`evm_version = "paris"` — Somnia charges ~12× vanilla EVM gas and rejects PUSH0.

## License

MIT
