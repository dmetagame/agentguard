"use client";

import Link from "next/link";
import Logo from "./landing/Logo";
import { ConnectButton } from "./ConnectButton";

export function Header() {
  return (
    <header className="border-b border-hairline bg-background/80 backdrop-blur sticky top-0 z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5 text-ink">
          <Logo size={26} />
          <div>
            <div className="font-display text-sm font-medium tracking-tight">AgentGuard</div>
            <div className="mono text-[10px] uppercase tracking-widest text-zinc-500">
              onchain firewall · powered by Somnia Agents
            </div>
          </div>
        </Link>
        <ConnectButton />
      </div>
    </header>
  );
}
