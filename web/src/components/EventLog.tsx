"use client";

import { useWatchContractEvent } from "wagmi";
import { useState } from "react";
import { AgentGuardVaultAbi, VAULT_ADDRESS, Decision } from "@/lib/contract";

type Entry = {
  ts: number;
  name: string;
  text: string;
};

export function EventLog() {
  const [entries, setEntries] = useState<Entry[]>([]);

  function push(name: string, text: string) {
    setEntries((prev) => [{ ts: Date.now(), name, text }, ...prev].slice(0, 30));
  }

  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    eventName: "ActionProposed",
    onLogs(logs) {
      for (const l of logs) {
        const args = (l as unknown as { args: { actionId: bigint; target: string } }).args;
        push("Proposed", `#${args.actionId} → ${short(args.target)}`);
      }
    },
  });

  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    eventName: "ParseRequested",
    onLogs(logs) {
      for (const l of logs) {
        const args = (l as unknown as { args: { actionId: bigint; requestId: bigint } }).args;
        push("Parse →", `#${args.actionId} req ${args.requestId}`);
      }
    },
  });

  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    eventName: "InferenceRequested",
    onLogs(logs) {
      for (const l of logs) {
        const args = (l as unknown as { args: { actionId: bigint; requestId: bigint } }).args;
        push("Inference →", `#${args.actionId} req ${args.requestId}`);
      }
    },
  });

  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    eventName: "ActionDecided",
    onLogs(logs) {
      for (const l of logs) {
        const args = (l as unknown as { args: { actionId: bigint; decision: number; score: number } }).args;
        push("Decided", `#${args.actionId} ${Decision[args.decision]} (score ${args.score})`);
      }
    },
  });

  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    eventName: "ActionExecuted",
    onLogs(logs) {
      for (const l of logs) {
        const args = (l as unknown as { args: { actionId: bigint; success: boolean } }).args;
        push("Executed", `#${args.actionId} ${args.success ? "OK" : "reverted"}`);
      }
    },
  });

  return (
    <div className="card">
      <div className="label">Activity</div>
      <div className="mt-2 space-y-1 font-mono text-xs">
        {entries.length === 0 && <div className="text-zinc-600">Waiting for events…</div>}
        {entries.map((e, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-zinc-600">{new Date(e.ts).toLocaleTimeString()}</span>
            <span className="text-emerald-400 w-20">{e.name}</span>
            <span className="text-zinc-300">{e.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function short(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
