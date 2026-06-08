"use client";

import { ConnectButton } from "./ConnectButton";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-gradient-to-br from-emerald-400 to-emerald-700" />
          <div>
            <div className="text-sm font-semibold tracking-tight">AgentGuard</div>
            <div className="text-[10px] uppercase tracking-widest text-zinc-500">
              onchain firewall · powered by Somnia Agents
            </div>
          </div>
        </div>
        <ConnectButton />
      </div>
    </header>
  );
}
