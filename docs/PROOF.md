# AgentGuard — On-chain Proof

Every verdict below is a real, finalized transaction on the **production vault**.
Anyone can verify them on the Somnia explorer — no wallet, no trust required.

- **Network:** Somnia Testnet (chainId 50312)
- **Explorer:** https://shannon-explorer.somnia.network
- **Vault:** [`0x3f64d310b88f8c89afd70cccd33094df7e7c3a91`](https://shannon-explorer.somnia.network/address/0x3f64d310b88f8c89afd70cccd33094df7e7c3a91)
- **Somnia Agent platform:** `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776`
- **LLM Inference Agent (Qwen3-30B):** `12847293847561029384`
- **Parse-Website Agent:** `12875401142070969085`

The dapp surfaces these live at **https://agentguard-beta.vercel.app/app** (proof cards read the verdict straight from the contract and render without a wallet).

---

## ✅ APPROVE — action #1 (safe payment)

A payment to an allowlisted recipient, within policy → approved and executed on-chain.

- decided: [`0x55afbc7373c73f67c58c69504eba9d92f4502ddd7d64488bdd74c26a4c033e3a`](https://shannon-explorer.somnia.network/tx/0x55afbc7373c73f67c58c69504eba9d92f4502ddd7d64488bdd74c26a4c033e3a)
- executed: [`0x33a8808d06885bf0e0d04cb78b8d47f0e5d5a6ab1f1f0886a77b2645c41f9dd3`](https://shannon-explorer.somnia.network/tx/0x33a8808d06885bf0e0d04cb78b8d47f0e5d5a6ab1f1f0886a77b2645c41f9dd3)

## ⛔ BLOCK — action #2 (suspicious drain)

An oversized transfer to an unknown address → blocked. `executeAction(#2)` reverts
on-chain with `NotApproved(Block)` — the block is enforced by the contract, not the UI.

- review requested: [`0x3e01ee959db2a04cf1ab765810a564fa7e7ce90868782186d8056f789f13ee77`](https://shannon-explorer.somnia.network/tx/0x3e01ee959db2a04cf1ab765810a564fa7e7ce90868782186d8056f789f13ee77)
- decided (BLOCK): [`0x51432bcda88b28f5e60c6664854981b3cf705b6a267e21378510ccb6d8b2ae97`](https://shannon-explorer.somnia.network/tx/0x51432bcda88b28f5e60c6664854981b3cf705b6a267e21378510ccb6d8b2ae97)

## ⏳ REVIEW — action #5 (unrecognized payee)

A plain transfer to a vendor not on the allowlist → held behind a 24-hour
human-review timelock the owner can veto.

- review requested: [`0x4f56c6bb4dfa1d2bb41d7fad9c1df54db413ab414d461dda34f34b8787ac9823`](https://shannon-explorer.somnia.network/tx/0x4f56c6bb4dfa1d2bb41d7fad9c1df54db413ab414d461dda34f34b8787ac9823)
- decided (REVIEW): [`0x351438752ac853201fe264ee50c485fdc5a6c27c261c59ff316babf89e613332`](https://shannon-explorer.somnia.network/tx/0x351438752ac853201fe264ee50c485fdc5a6c27c261c59ff316babf89e613332)

---

## Verify it yourself

```bash
# read any action's verdict + stage straight from the vault
cast call 0x3f64d310b88f8c89afd70cccd33094df7e7c3a91 \
  "getAction(uint256)((address,address,uint256,bytes,string,string,uint8,uint8,string,string,uint8,uint256,uint256,uint256,uint256))" \
  1 --rpc-url https://dream-rpc.somnia.network

# proving the BLOCK is enforced: this reverts with NotApproved(Block)
cast call 0x3f64d310b88f8c89afd70cccd33094df7e7c3a91 \
  "executeAction(uint256)(bool,bytes)" 2 \
  --rpc-url https://dream-rpc.somnia.network
```

Decision enum: `0=None, 1=Block, 2=Review, 3=Approve` · Stage enum: `0=Proposed, 1=ParsePending, 2=InferencePending, 3=Decided, 4=Executed, 5=Cancelled`.
