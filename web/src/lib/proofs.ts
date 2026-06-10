import { VAULT_ADDRESS } from "./contract";

export const EXPLORER = "https://shannon-explorer.somnia.network";
export const txUrl = (hash: string) => `${EXPLORER}/tx/${hash}`;
export const addrUrl = (addr: string) => `${EXPLORER}/address/${addr}`;
export const vaultUrl = () => addrUrl(VAULT_ADDRESS);

export type Verdict = "Approve" | "Block" | "Review";
export type ProofTx = { label: string; hash: string };

export type Proof = {
  id: bigint;
  verdict: Verdict;
  scenario: string;
  blurb: string;
  // Ordered oldest → newest; the last entry is the canonical outcome proof.
  txs: ProofTx[];
};

// The live, on-chain demo actions on the production vault. Single source of
// truth for both the dapp's PublicProofs surface and the landing Verdicts
// section, so the verifiable transactions can never drift between the two.
export const PROOFS: Proof[] = [
  {
    id: 1n,
    verdict: "Approve",
    scenario: "Safe payment",
    blurb: "Pay an allowlisted recipient within policy → approved and executed.",
    txs: [
      { label: "decided", hash: "0x55afbc7373c73f67c58c69504eba9d92f4502ddd7d64488bdd74c26a4c033e3a" },
      { label: "executed", hash: "0x33a8808d06885bf0e0d04cb78b8d47f0e5d5a6ab1f1f0886a77b2645c41f9dd3" },
    ],
  },
  {
    id: 2n,
    verdict: "Block",
    scenario: "Suspicious drain",
    blurb: "Oversized transfer to an unknown address → blocked, never executable.",
    txs: [
      { label: "review", hash: "0x3e01ee959db2a04cf1ab765810a564fa7e7ce90868782186d8056f789f13ee77" },
      { label: "decided", hash: "0x51432bcda88b28f5e60c6664854981b3cf705b6a267e21378510ccb6d8b2ae97" },
    ],
  },
  {
    id: 5n,
    verdict: "Review",
    scenario: "Unrecognized payee",
    blurb: "Plain transfer to a vendor not on the allowlist → held behind a 24h human-review timelock.",
    txs: [
      { label: "review", hash: "0x4f56c6bb4dfa1d2bb41d7fad9c1df54db413ab414d461dda34f34b8787ac9823" },
      { label: "decided", hash: "0x351438752ac853201fe264ee50c485fdc5a6c27c261c59ff316babf89e613332" },
    ],
  },
];

export const proofByVerdict = (v: Verdict): Proof | undefined =>
  PROOFS.find((p) => p.verdict === v);
