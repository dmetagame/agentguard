"use client";

import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { isAddress, parseEther, parseEventLogs, type Address, type Hex } from "viem";
import { useState } from "react";
import { AgentGuardVaultAbi, VAULT_ADDRESS } from "@/lib/contract";

export function ProposeActionForm() {
  const { address } = useAccount();
  const [target, setTarget] = useState("");
  const [value, setValue] = useState("");
  const [data, setData] = useState("0x");
  const [reason, setReason] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [reviewDeposit, setReviewDeposit] = useState("1");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: confirming, data: receipt } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  const lastActionId = receipt
    ? (() => {
        const logs = parseEventLogs({
          abi: AgentGuardVaultAbi,
          logs: receipt.logs,
          eventName: "ActionProposed",
        });
        return logs[0]?.args.actionId as bigint | undefined;
      })()
    : undefined;

  const { writeContract: triggerReview, data: reviewHash, isPending: reviewing } = useWriteContract();
  const { isLoading: reviewConfirming } = useWaitForTransactionReceipt({
    hash: reviewHash,
    query: { enabled: Boolean(reviewHash) },
  });

  function propose() {
    if (!address || !isAddress(target)) return;
    writeContract({
      address: VAULT_ADDRESS,
      abi: AgentGuardVaultAbi,
      functionName: "proposeAction",
      args: [address, target as Address, parseEther(value || "0"), data as Hex, reason, evidenceUrl],
    });
  }

  function review() {
    if (!lastActionId) return;
    triggerReview({
      address: VAULT_ADDRESS,
      abi: AgentGuardVaultAbi,
      functionName: "requestAgentReview",
      args: [lastActionId],
      value: parseEther(reviewDeposit || "1"),
    });
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div>
          <div className="label">Propose action</div>
          <div className="mt-1 text-xs text-zinc-500">
            Simulates what your agent would submit. Two-step: propose, then request the Somnia agent review.
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <div className="label">Target</div>
          <input className="input mt-1 font-mono" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="0x…" />
        </div>
        <div>
          <div className="label">Value (STT)</div>
          <input className="input mt-1" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0.0" />
        </div>
        <div>
          <div className="label">Calldata (hex)</div>
          <input className="input mt-1 font-mono" value={data} onChange={(e) => setData(e.target.value)} placeholder="0x" />
        </div>
        <div className="col-span-2">
          <div className="label">Reason</div>
          <input className="input mt-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="why is the agent doing this?" />
        </div>
        <div className="col-span-2">
          <div className="label">Evidence URL (optional — triggers Parse-Website agent)</div>
          <input className="input mt-1" value={evidenceUrl} onChange={(e) => setEvidenceUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div className="col-span-2 flex items-center justify-end gap-2">
          <button className="btn-primary" onClick={propose} disabled={!isAddress(target) || isPending || confirming}>
            {confirming ? "Proposing…" : "Propose"}
          </button>
        </div>
      </div>

      {lastActionId !== undefined && (
        <div className="mt-4 rounded-md border border-emerald-900/50 bg-emerald-950/30 p-3 text-sm">
          <div className="flex items-center justify-between">
            <div>
              Proposed action #<span className="font-mono">{lastActionId.toString()}</span>. Ready to request agent review.
            </div>
            <div className="flex items-center gap-2">
              <input
                className="input w-24"
                value={reviewDeposit}
                onChange={(e) => setReviewDeposit(e.target.value)}
                placeholder="STT deposit"
              />
              <button className="btn-primary" onClick={review} disabled={reviewing || reviewConfirming}>
                {reviewConfirming ? "Sending…" : "Request review"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
