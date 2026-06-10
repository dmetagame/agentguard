"use client";

import { useReadContract } from "wagmi";
import { formatEther, type Address, type Hex } from "viem";
import { AgentGuardVaultAbi, Decision, Stage, VAULT_ADDRESS } from "@/lib/contract";
import { EXPLORER, PROOFS, type Proof } from "@/lib/proofs";

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
          className="text-xs text-zinc-500 underline hover:text-accent"
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
  const settled = decision === proof.verdict;

  const tone =
    proof.verdict === "Approve"
      ? "border-approve/50 bg-approve/5"
      : proof.verdict === "Block"
      ? "border-block/60 bg-block/5"
      : "border-review/60 bg-review/5";

  const chip =
    decision === "Approve"
      ? "text-approve border-approve/50"
      : decision === "Block"
      ? "text-block border-block/60"
      : decision === "Review"
      ? "text-review border-review/60"
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
        {settled && <span className="text-[11px] text-approve">✓ on-chain</span>}
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
              className="text-zinc-400 underline hover:text-accent"
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
