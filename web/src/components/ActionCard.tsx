"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther, type Address, type Hex } from "viem";
import { useEffect, useState } from "react";
import { AgentGuardVaultAbi, Decision, Stage, VAULT_ADDRESS } from "@/lib/contract";

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

const EXPLORER = "https://shannon-explorer.somnia.network";

export function ActionCard({ actionId, isOwner }: { actionId: bigint; isOwner: boolean }) {
  const { data: action, refetch } = useReadContract({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    functionName: "getAction",
    args: [actionId],
    query: { refetchInterval: 4000 },
  }) as { data: Action | undefined; refetch: () => void };

  const { data: readyAt } = useReadContract({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    functionName: "executableAt",
    args: [actionId],
    query: { refetchInterval: 4000 },
  }) as { data: bigint | undefined };

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess, refetch]);

  // Live clock kept in state (never read Date.now() during render — it makes
  // render impure and the React compiler lint flags it).
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const id = window.setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  // Default top-up covers the worst-case agent budget (parse 0.35 + inference
  // 0.25). The contract draws from the owner's vault balance first and only
  // uses msg.value for any shortfall, so any surplus stays withdrawable.
  const [reviewDeposit, setReviewDeposit] = useState("0.6");

  if (!action) return null;

  const stage = Stage[action.stage];
  const decision = Decision[action.decision];
  const tone =
    decision === "Approve"
      ? "bg-approve/10 text-approve border-approve/50"
      : decision === "Block"
      ? "bg-block/10 text-block border-block/60"
      : decision === "Review"
      ? "bg-review/10 text-review border-review/60"
      : "bg-zinc-800 text-zinc-400 border-zinc-700";

  const ready = readyAt !== undefined && readyAt > 0n && readyAt < 2n ** 200n;
  const countdown = ready ? Math.max(0, Number(readyAt) - now) : 0;
  const canExecute = isOwner && stage === "Decided" && (decision === "Approve" || (decision === "Review" && countdown === 0));
  const canReview = isOwner && stage === "Proposed";
  const pending = isPending || confirming;
  const inFlight = stage === "ParsePending" || stage === "InferencePending";

  function execute() {
    writeContract({
      address: VAULT_ADDRESS,
      abi: AgentGuardVaultAbi,
      functionName: "executeAction",
      args: [actionId],
    });
  }

  function cancel() {
    writeContract({
      address: VAULT_ADDRESS,
      abi: AgentGuardVaultAbi,
      functionName: "cancelAction",
      args: [actionId],
    });
  }

  function review() {
    writeContract({
      address: VAULT_ADDRESS,
      abi: AgentGuardVaultAbi,
      functionName: "requestAgentReview",
      args: [actionId],
      value: parseEther(reviewDeposit || "0"),
    });
  }

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500">#{actionId.toString()}</span>
            <span className={`chip border ${tone}`}>{decision}</span>
            <span className="chip border border-zinc-700 bg-zinc-800/60 text-zinc-300">{stage}</span>
          </div>
          <div className="mt-2 text-sm">
            Send <span className="font-medium">{formatEther(action.value)} STT</span> to{" "}
            <a
              href={`${EXPLORER}/address/${action.target}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs underline"
            >
              {short(action.target)}
            </a>
          </div>
          {action.reason && <div className="mt-1 text-xs text-zinc-400">&ldquo;{action.reason}&rdquo;</div>}
          {action.evidenceUrl && (
            <div className="mt-1 text-xs text-zinc-500">
              evidence:{" "}
              <a href={action.evidenceUrl} target="_blank" rel="noreferrer" className="underline">
                {action.evidenceUrl}
              </a>
            </div>
          )}
        </div>
        {isOwner && stage !== "Executed" && stage !== "Cancelled" && (
          <button className="btn-secondary text-xs" onClick={cancel} disabled={pending}>
            Cancel
          </button>
        )}
      </div>

      {action.explanation && (
        <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-300">
          <div className="label mb-1">Agent verdict</div>
          {action.explanation}
        </div>
      )}

      {action.parsedEvidence && (
        <div className="mt-2 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
          <div className="label mb-1">Parsed evidence</div>
          {action.parsedEvidence}
        </div>
      )}

      {inFlight && (
        <div className="mt-3 text-xs text-sky-300">
          ⏳ Awaiting Somnia agents… ({stage === "ParsePending" ? "parsing evidence" : "LLM inference"})
        </div>
      )}

      {stage === "Decided" && decision === "Review" && countdown > 0 && (
        <div className="mt-3 text-xs text-review">
          ⏳ Executable in {formatCountdown(countdown)} (timelock unlocks at {new Date(Number(readyAt) * 1000).toLocaleString()})
        </div>
      )}

      {canReview && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-sky-900/50 bg-sky-950/20 p-3">
          <div className="text-xs text-zinc-400">
            Send to the Somnia agents for review.
            {action.evidenceUrl ? " Parse-Website runs first, then LLM Inference." : " LLM Inference decides the verdict."}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <input
              className="input w-20 text-xs"
              value={reviewDeposit}
              onChange={(e) => setReviewDeposit(e.target.value)}
              placeholder="STT"
              inputMode="decimal"
            />
            <button className="btn-primary text-xs" onClick={review} disabled={pending}>
              {pending ? "Sending…" : "Request review"}
            </button>
          </div>
        </div>
      )}

      {canExecute && (
        <div className="mt-3">
          <button className="btn-primary" onClick={execute} disabled={pending}>
            {confirming ? "Executing…" : decision === "Approve" ? "Execute" : "Execute (post-timelock)"}
          </button>
        </div>
      )}
    </div>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatCountdown(s: number) {
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 86400)}d ${Math.floor((s % 86400) / 3600)}h`;
}
