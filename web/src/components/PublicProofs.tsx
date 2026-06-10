"use client";

import { useReadContract } from "wagmi";
import { formatEther, type Address, type Hex } from "viem";
import { AgentGuardVaultAbi, Decision, Stage, VAULT_ADDRESS } from "@/lib/contract";

const EXPLORER = "https://shannon-explorer.somnia.network";

type Action = {
  owner: Address;
  target: Address;
  value: bigint;
  data: Hex;
  reason: string;
  evidenceUrl: string;
  decision: number;
  score: number;
  explanation: string;
  parsedEvidence: string;
  stage: number;
  parseRequestId: bigint;
  inferenceRequestId: bigint;
  createdAt: bigint;
  decidedAt: bigint;
};

type Proof = {
  id: bigint;
  scenario: string;
  blurb: string;
  expect: "Approve" | "Block" | "Review";
  txs: { label: string; hash: string }[];
};

// Live, on-chain demo actions on the production vault. The verdict + stage are
// read live from the chain (so this surface can never overclaim); the tx links
// point at the exact transactions that prove each outcome.
const PROOFS: Proof[] = [
  {
    id: 1n,
    scenario: "Safe payment",
    blurb: "Pay an allowlisted recipient within policy → approved and executed.",
    expect: "Approve",
    txs: [
      { label: "decided", hash: "0x55afbc7373c73f67c58c69504eba9d92f4502ddd7d64488bdd74c26a4c033e3a" },
      { label: "executed", hash: "0x33a8808d06885bf0e0d04cb78b8d47f0e5d5a6ab1f1f0886a77b2645c41f9dd3" },
    ],
  },
  {
    id: 2n,
    scenario: "Suspicious drain",
    blurb: "Oversized transfer to an unknown address → blocked, never executable.",
    expect: "Block",
    txs: [
      { label: "review", hash: "0x3e01ee959db2a04cf1ab765810a564fa7e7ce90868782186d8056f789f13ee77" },
      { label: "decided", hash: "0x51432bcda88b28f5e60c6664854981b3cf705b6a267e21378510ccb6d8b2ae97" },
    ],
  },
  {
    id: 5n,
    scenario: "Unrecognized payee",
    blurb: "Plain transfer to a vendor not on the allowlist → held behind a 24h human-review timelock.",
    expect: "Review",
    txs: [
      { label: "review", hash: "0x4f56c6bb4dfa1d2bb41d7fad9c1df54db413ab414d461dda34f34b8787ac9823" },
      { label: "decided", hash: "0x351438752ac853201fe264ee50c485fdc5a6c27c261c59ff316babf89e613332" },
    ],
  },
];

export function PublicProofs() {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Live proof — three verdicts on Somnia Testnet
        </h2>
        <a
          href={`${EXPLORER}/address/${VAULT_ADDRESS}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-zinc-500 underline hover:text-emerald-400"
        >
          vault on explorer ↗
        </a>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PROOFS.map((p) => (
          <ProofCard key={p.id.toString()} proof={p} />
        ))}
      </div>
    </section>
  );
}

function ProofCard({ proof }: { proof: Proof }) {
  const { data: action } = useReadContract({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    functionName: "getAction",
    args: [proof.id],
    query: { refetchInterval: 8000 },
  }) as { data: Action | undefined };

  const decision = action ? Decision[action.decision] : undefined;
  const stage = action ? Stage[action.stage] : undefined;
  const settled = decision === proof.expect;

  const tone =
    proof.expect === "Approve"
      ? "border-emerald-700 bg-emerald-500/5"
      : proof.expect === "Block"
      ? "border-red-800 bg-red-500/5"
      : "border-amber-800 bg-amber-500/5";

  const chip =
    decision === "Approve"
      ? "text-emerald-300 border-emerald-700"
      : decision === "Block"
      ? "text-red-300 border-red-800"
      : decision === "Review"
      ? "text-amber-300 border-amber-800"
      : "text-zinc-400 border-zinc-700";

  return (
    <div className={`card border ${tone}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{proof.scenario}</div>
        <span className="font-mono text-[11px] text-zinc-500">#{proof.id.toString()}</span>
      </div>
      <p className="mt-1 text-xs leading-5 text-zinc-400">{proof.blurb}</p>

      <div className="mt-3 flex items-center gap-2">
        <span className={`chip border ${chip}`}>{decision ?? "—"}</span>
        <span className="chip border border-zinc-700 bg-zinc-800/60 text-zinc-300">{stage ?? "…"}</span>
        {settled && <span className="text-[11px] text-emerald-400">✓ on-chain</span>}
      </div>

      {action && (
        <div className="mt-3 text-xs text-zinc-500">
          {formatEther(action.value)} STT →{" "}
          <a
            href={`${EXPLORER}/address/${action.target}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono underline"
          >
            {action.target.slice(0, 6)}…{action.target.slice(-4)}
          </a>
        </div>
      )}

      {proof.txs.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
          {proof.txs.map((t) => (
            <a
              key={t.hash}
              href={`${EXPLORER}/tx/${t.hash}`}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-400 underline hover:text-emerald-400"
            >
              {t.label} ↗
            </a>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-[11px] text-zinc-600">proof tx pending finalization</div>
      )}
    </div>
  );
}
