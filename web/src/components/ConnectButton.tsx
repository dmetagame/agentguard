"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain, useChainId } from "wagmi";
import { somniaTestnet } from "@/lib/chain";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    const injected = connectors.find((c) => c.id === "injected") ?? connectors[0];
    return (
      <button
        className="btn-primary"
        onClick={() => injected && connect({ connector: injected })}
        disabled={isPending}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (chainId !== somniaTestnet.id) {
    return (
      <div className="flex items-center gap-2">
        <span className="chip border border-amber-700 bg-amber-500/10 text-amber-300">Wrong network</span>
        <button className="btn-primary" onClick={() => switchChain({ chainId: somniaTestnet.id })}>
          Switch to Somnia
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="chip border border-emerald-700 bg-emerald-500/10 text-emerald-300">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button className="btn-secondary" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
