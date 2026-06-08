"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther, parseEther } from "viem";
import { useState } from "react";
import { AgentGuardVaultAbi, VAULT_ADDRESS } from "@/lib/contract";

export function VaultBalance() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  const { data: balance, refetch } = useReadContract({
    address: VAULT_ADDRESS,
    abi: AgentGuardVaultAbi,
    functionName: "balances",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: confirming } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: Boolean(hash),
      gcTime: 0,
    },
  });

  async function deposit() {
    if (!amount) return;
    writeContract({
      address: VAULT_ADDRESS,
      abi: AgentGuardVaultAbi,
      functionName: "deposit",
      value: parseEther(amount),
    });
  }

  async function withdraw() {
    if (!amount) return;
    writeContract({
      address: VAULT_ADDRESS,
      abi: AgentGuardVaultAbi,
      functionName: "withdraw",
      args: [parseEther(amount)],
    });
  }

  return (
    <div className="card">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="label">Vault balance</div>
          <div className="mt-1 text-3xl font-semibold tracking-tight">
            {balance != null ? formatEther(balance as bigint) : "—"}
            <span className="ml-1 text-base font-normal text-zinc-500">STT</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="input"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          inputMode="decimal"
        />
        <button
          className="btn-primary"
          onClick={() => {
            deposit();
          }}
          disabled={isPending || confirming || !amount}
        >
          Deposit
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            withdraw();
          }}
          disabled={isPending || confirming || !amount}
        >
          Withdraw
        </button>
      </div>

      {hash && !confirming && (
        <div className="mt-2 text-xs text-emerald-400">
          Confirmed.{" "}
          <button
            className="underline"
            onClick={() => {
              reset();
              refetch();
              setAmount("");
            }}
          >
            ok
          </button>
        </div>
      )}
    </div>
  );
}
