"use client";

import { useAccount, usePublicClient } from "wagmi";
import { useEffect, useState } from "react";
import { AgentGuardVaultAbi, VAULT_ADDRESS } from "@/lib/contract";
import { ActionCard } from "./ActionCard";

// Discovery by enumeration, not log scanning. Action IDs are sequential
// (`nextActionId` increments on every propose), so we read the counter and
// fetch each action directly. This is fully reliable regardless of how many
// blocks have passed — Somnia produces ~100k blocks in under three hours, so
// any fixed `getLogs` window silently loses older demo actions. We cap the
// look-back at the most recent MAX_SCAN actions to bound the number of reads.
const MAX_SCAN = 250n;

export function ActionsList() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [ids, setIds] = useState<bigint[]>([]);
  const [manualId, setManualId] = useState("");
  const [extra, setExtra] = useState<bigint[]>([]);
  const [tick, setTick] = useState(0);

  // Re-enumerate on an interval so newly proposed actions appear without a
  // manual refresh. The setState lives in a callback (not the effect body),
  // which keeps it clear of the synchronous-setState-in-effect lint rule.
  useEffect(() => {
    const t = window.setInterval(() => setTick((n) => n + 1), 8000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (!address || !publicClient) return;
    let cancelled = false;
    (async () => {
      try {
        const next = (await publicClient.readContract({
          address: VAULT_ADDRESS,
          abi: AgentGuardVaultAbi,
          functionName: "nextActionId",
        })) as bigint;

        const start = next > MAX_SCAN + 1n ? next - MAX_SCAN : 1n;
        const wanted = address.toLowerCase();
        const mine: bigint[] = [];
        for (let id = start; id < next; id++) {
          try {
            const a = (await publicClient.readContract({
              address: VAULT_ADDRESS,
              abi: AgentGuardVaultAbi,
              functionName: "getAction",
              args: [id],
            })) as { owner: string };
            if (a.owner.toLowerCase() === wanted) mine.push(id);
          } catch {
            // skip unreadable id
          }
        }
        if (cancelled) return;
        mine.sort((a, b) => (b > a ? 1 : -1));
        setIds(mine);
      } catch (e) {
        console.warn("action enumeration failed", e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [address, publicClient, tick]);

  function addManual() {
    try {
      const id = BigInt(manualId.trim());
      if (id <= 0n) return;
      setExtra((prev) => (prev.includes(id) ? prev : [id, ...prev]));
      setManualId("");
    } catch {
      // ignore non-numeric input
    }
  }

  if (!address) return null;

  const extraOnly = extra.filter((id) => !ids.includes(id));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="label">Your actions</div>
        <div className="text-xs text-zinc-500">{ids.length} total</div>
      </div>

      <div className="flex items-center gap-2">
        <input
          className="input text-xs"
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addManual()}
          placeholder="View any action by ID (e.g. 1)"
          inputMode="numeric"
        />
        <button className="btn-secondary shrink-0 text-xs" onClick={addManual}>
          Look up
        </button>
      </div>

      {ids.length === 0 && extraOnly.length === 0 ? (
        <div className="card text-sm text-zinc-500">No actions yet. Propose one below to start.</div>
      ) : (
        <>
          {ids.map((id) => (
            <ActionCard key={id.toString()} actionId={id} isOwner />
          ))}
          {extraOnly.map((id) => (
            <ActionCard key={`x-${id.toString()}`} actionId={id} isOwner={false} />
          ))}
        </>
      )}
    </div>
  );
}
