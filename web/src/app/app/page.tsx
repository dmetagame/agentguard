"use client";

import { useAccount } from "wagmi";
import { Header } from "@/components/Header";
import { VaultBalance } from "@/components/VaultBalance";
import { PolicyCard } from "@/components/PolicyCard";
import { ProposeActionForm } from "@/components/ProposeActionForm";
import { ActionsList } from "@/components/ActionsList";
import { EventLog } from "@/components/EventLog";
import { PublicProofs } from "@/components/PublicProofs";
import { VAULT_ADDRESS } from "@/lib/contract";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <section className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight">
            Onchain firewall for AI agents
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Every action proposed by an autonomous agent is reviewed by Somnia
            Agents (LLM Inference + optional Parse-Website) before the vault
            will execute it. Verdicts are <span className="text-approve">APPROVE</span>,{" "}
            <span className="text-review">REVIEW</span> (24h timelock), or{" "}
            <span className="text-block">BLOCK</span>.
          </p>
          <div className="mt-3 text-xs text-zinc-500">
            Vault: <span className="font-mono">{VAULT_ADDRESS}</span> · Somnia Testnet (chainId 50312)
          </div>
        </section>

        <PublicProofs />

        {!isConnected ? (
          <div className="rounded-2xl border border-hairline bg-surface/60 p-8 text-center">
            <p className="text-sm text-zinc-300">
              Connect a wallet on Somnia Testnet to manage your vault, set a policy, and propose &amp; review actions.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <ActionsList />
              <ProposeActionForm />
            </div>
            <div className="space-y-6">
              <VaultBalance />
              <PolicyCard />
              <EventLog />
            </div>
          </div>
        )}
      </main>
      <footer className="border-t border-zinc-800 bg-zinc-950/60">
        <div className="mx-auto max-w-6xl px-6 py-4 text-[11px] text-zinc-500">
          AgentGuard · built for the Somnia Agentathon · source on{" "}
          <a
            href="https://github.com/dmetagame/agentguard"
            className="text-zinc-300 hover:text-accent"
            target="_blank"
            rel="noreferrer"
          >
            github.com/dmetagame/agentguard
          </a>
        </div>
      </footer>
    </>
  );
}
