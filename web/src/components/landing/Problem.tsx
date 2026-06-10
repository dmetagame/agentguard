"use client";

import { useRef } from "react";
import { useReveal } from "@/lib/useReveal";

const VECTORS = [
  {
    id: "01",
    name: "prompt injection",
    detail: "Hostile content steers the model into signing what an attacker wants.",
  },
  {
    id: "02",
    name: "hallucinated trades",
    detail: "The model invents an action that was never in its mandate.",
  },
  {
    id: "03",
    name: "malicious counterparties",
    detail: "A plausible-looking contract or address that drains on contact.",
  },
];

export default function Problem() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section ref={ref} className="border-b border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <p className="eyebrow mb-6" data-reveal>
          the problem
        </p>
        <h2 className="max-w-xl text-ink" data-reveal>
          A wallet that signs whatever the model says is an unbounded
          liability.
        </h2>
        <p className="mt-6 max-w-2xl text-muted" data-reveal>
          AI agents with signing keys are a new attack surface: prompt
          injection, hallucinated trades, malicious counterparties. AgentGuard
          puts a programmable checkpoint between the agent&apos;s intent and
          the chain.
        </p>

        <div className="mt-14 grid gap-px border border-hairline bg-hairline sm:grid-cols-3">
          {VECTORS.map((v) => (
            <div key={v.id} className="bg-surface p-6" data-reveal>
              <div className="mono text-xs text-muted">{v.id}</div>
              <div className="mono mt-3 text-sm font-semibold text-ink">
                {v.name}
              </div>
              <p className="mt-2 text-sm text-muted">{v.detail}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
