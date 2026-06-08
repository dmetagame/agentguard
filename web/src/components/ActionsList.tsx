"use client";

import { useAccount, usePublicClient, useWatchContractEvent } from "wagmi";
import { useEffect, useState } from "react";
import { getAbiItem, parseAbiItem, type Address } from "viem";
import { AgentGuardVaultAbi, VAULT_ADDRESS } from "@/lib/contract";
import { ActionCard } from "./ActionCard";

const proposedEvent = getAbiItem({ abi: AgentGuardVaultAbi, name: "ActionProposed" });

export function ActionsList() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [ids, setIds] = useState<bigint[]>([]);

  useEffect(() => {
    if (!address || !publicClient) return;
    let cancelled = false;
    (async () => {
      try {
        const latest = await publicClient.getBlockNumber();
        const from = latest > 100_000n ? latest - 100_000n : 0n;
        const logs = await publicClient.getLogs({
          address: VAULT_ADDRESS,
          event: proposedEvent,
          args: { owner: address },
          fromBlock: from,
          toBlock: "latest",
        });
        if (cancelled) return;
        const sorted = logs
          .map((l) => (l.args as { actionId?: bigint }).actionId)
          .filter((x): x is bigint => x !== undefined)
          .sort((a, b) => (b > a ? 1 : -1));
        setIds(sorted);
      } catch (e) {
        console.warn("getLogs failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient]);

  useWatchContractEvent({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    eventName: "ActionProposed",
    onLogs(logs) {
      for (const log of logs) {
        const args = (log as unknown as { args: { owner?: Address; actionId?: bigint } }).args;
        if (args.owner?.toLowerCase() === address?.toLowerCase() && args.actionId !== undefined) {
          setIds((prev) => (prev.includes(args.actionId!) ? prev : [args.actionId!, ...prev]));
        }
      }
    },
  });

  if (!address) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="label">Your actions</div>
        <div className="text-xs text-zinc-500">{ids.length} total</div>
      </div>
      {ids.length === 0 ? (
        <div className="card text-sm text-zinc-500">No actions yet. Propose one above to start.</div>
      ) : (
        ids.map((id) => <ActionCard key={id.toString()} actionId={id} isOwner />)
      )}
    </div>
  );
}
