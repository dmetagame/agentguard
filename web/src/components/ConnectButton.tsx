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
        <span className="chip border border-review/60 bg-review/10 text-review">Wrong network</span>
        <button className="btn-primary" onClick={() => switchChain({ chainId: somniaTestnet.id })}>
          Switch to Somnia
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="chip border border-accent/50 bg-accent/10 text-accent">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button className="btn-secondary" onClick={() => disconnect()}>
        Disconnect
      </button>
    </div>
  );
}
