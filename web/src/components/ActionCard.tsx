"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, type Address, type Hex } from "viem";
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

  if (!action) return null;

  const stage = Stage[action.stage];
  const decision = Decision[action.decision];
  const tone =
    decision === "Approve"
      ? "bg-emerald-500/10 text-emerald-300 border-emerald-700"
      : decision === "Block"
      ? "bg-red-500/10 text-red-300 border-red-800"
      : decision === "Review"
      ? "bg-amber-500/10 text-amber-300 border-amber-800"
      : "bg-zinc-800 text-zinc-400 border-zinc-700";

  const now = Math.floor(Date.now() / 1000);
  const ready = readyAt !== undefined && readyAt > 0n && readyAt < 2n ** 200n;
  const countdown = ready ? Math.max(0, Number(readyAt) - now) : 0;
  const canExecute = isOwner && stage === "Decided" && (decision === "Approve" || (decision === "Review" && countdown === 0));

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

  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500">#{actionId.toString()}</span>
            <span className={`chip border ${tone}`}>{decision}</span>
            <span className="chip border border-zinc-700 bg-zinc-800/60 text-zinc-300">{stage}</span>
            {action.score > 0 && (
              <span className="chip border border-zinc-700 bg-zinc-900 text-zinc-400">
                score {action.score}
              </span>
            )}
          </div>
          <div className="mt-2 text-sm">
            Send <span className="font-medium">{formatEther(action.value)} STT</span> to{" "}
            <span className="font-mono text-xs">{short(action.target)}</span>
          </div>
          {action.reason && <div className="mt-1 text-xs text-zinc-400">"{action.reason}"</div>}
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
          <button className="btn-secondary text-xs" onClick={cancel} disabled={isPending || confirming}>
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

      {stage === "Decided" && decision === "Review" && countdown > 0 && (
        <div className="mt-3 text-xs text-amber-300">
          ⏳ Executable in {formatCountdown(countdown)} (timelock unlocks at {new Date(Number(readyAt) * 1000).toLocaleString()})
        </div>
      )}

      {canExecute && (
        <div className="mt-3">
          <button className="btn-primary" onClick={execute} disabled={isPending || confirming}>
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
