"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, isAddress, parseEther, type Address } from "viem";
import { useEffect, useState } from "react";
import { AgentGuardVaultAbi, VAULT_ADDRESS } from "@/lib/contract";

type Policy = {
  agent: Address;
  maxSpend: bigint;
  maxRatioBps: bigint;
  reviewTimelock: bigint;
  allowedTargets: readonly Address[];
  blockedKeywords: readonly string[];
  exists: boolean;
};

export function PolicyCard() {
  const { address } = useAccount();
  const { data: policy, refetch } = useReadContract({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    functionName: "getPolicy",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  }) as { data: Policy | undefined; refetch: () => void };

  const [editing, setEditing] = useState(false);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="label">Policy</div>
        <button className="btn-secondary text-xs" onClick={() => setEditing((v) => !v)}>
          {editing ? "Cancel" : policy?.exists ? "Edit" : "Create"}
        </button>
      </div>

      {!editing && policy?.exists && (
        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <Field label="Agent address" mono>{short(policy.agent)}</Field>
          <Field label="Max spend / action">{formatEther(policy.maxSpend)} STT</Field>
          <Field label="Max ratio">{(Number(policy.maxRatioBps) / 100).toFixed(2)} %</Field>
          <Field label="Review timelock">{formatDuration(policy.reviewTimelock)}</Field>
          <Field label="Allowed targets">{policy.allowedTargets.length}</Field>
          <Field label="Blocked keywords">{policy.blockedKeywords.length}</Field>
        </dl>
      )}

      {!editing && !policy?.exists && (
        <div className="mt-3 text-sm text-zinc-400">
          No policy yet. Create one to authorize an agent to act for you.
        </div>
      )}

      {editing && <PolicyForm onDone={() => { setEditing(false); refetch(); }} />}
    </div>
  );
}

function Field({ label, children, mono = false }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="label">{label}</div>
      <div className={`mt-1 ${mono ? "font-mono text-xs" : "text-sm"}`}>{children}</div>
    </div>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

function formatDuration(s: bigint) {
  const n = Number(s);
  if (n === 0) return "instant";
  if (n < 3600) return `${Math.floor(n / 60)}m`;
  if (n < 86400) return `${Math.floor(n / 3600)}h`;
  return `${Math.floor(n / 86400)}d`;
}

function PolicyForm({ onDone }: { onDone: () => void }) {
  const [agent, setAgent] = useState("");
  const [maxSpend, setMaxSpend] = useState("10");
  const [maxRatioBps, setMaxRatioBps] = useState("5000");
  const [timelockHours, setTimelockHours] = useState("24");
  const [allowed, setAllowed] = useState("");
  const [blocked, setBlocked] = useState("");

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess, isLoading: confirming } = useWaitForTransactionReceipt({
    hash,
    query: { enabled: Boolean(hash) },
  });

  useEffect(() => {
    if (!isSuccess) return;
    const t = setTimeout(onDone, 200);
    return () => clearTimeout(t);
  }, [isSuccess, onDone]);

  const allowedAddrs = allowed
    .split(/[\s,]+/)
    .filter(Boolean)
    .filter((a) => isAddress(a)) as Address[];

  const blockedKeywords = blocked
    .split(/[\s,]+/)
    .filter(Boolean);

  function submit() {
    if (!isAddress(agent)) return;
    writeContract({
      address: VAULT_ADDRESS,
      abi: AgentGuardVaultAbi,
      functionName: "createPolicy",
      args: [
        agent as Address,
        parseEther(maxSpend || "0"),
        BigInt(maxRatioBps || "0"),
        BigInt((Number(timelockHours) || 0) * 3600),
        allowedAddrs,
        blockedKeywords,
      ],
    });
  }

  return (
    <div className="mt-3 grid grid-cols-2 gap-3">
      <Labeled span={2} label="Agent address (authorized to propose)">
        <input className="input font-mono" value={agent} onChange={(e) => setAgent(e.target.value)} placeholder="0x…" />
      </Labeled>
      <Labeled label="Max spend per action (STT)">
        <input className="input" value={maxSpend} onChange={(e) => setMaxSpend(e.target.value)} />
      </Labeled>
      <Labeled label="Max ratio of vault (bps)">
        <input className="input" value={maxRatioBps} onChange={(e) => setMaxRatioBps(e.target.value)} />
      </Labeled>
      <Labeled label="Review timelock (hours)">
        <input className="input" value={timelockHours} onChange={(e) => setTimelockHours(e.target.value)} />
      </Labeled>
      <Labeled span={2} label="Allowed target addresses (comma or space separated)">
        <textarea className="input min-h-16 font-mono text-xs" value={allowed} onChange={(e) => setAllowed(e.target.value)} />
      </Labeled>
      <Labeled span={2} label="Blocked keywords (comma or space separated)">
        <textarea className="input min-h-16 text-xs" value={blocked} onChange={(e) => setBlocked(e.target.value)} />
      </Labeled>
      <div className="col-span-2 flex items-center justify-end gap-2">
        <button className="btn-primary" disabled={isPending || confirming || !isAddress(agent)} onClick={submit}>
          {confirming ? "Confirming…" : "Save policy"}
        </button>
      </div>
    </div>
  );
}

function Labeled({ label, children, span = 1 }: { label: string; children: React.ReactNode; span?: 1 | 2 }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <div className="label">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}
