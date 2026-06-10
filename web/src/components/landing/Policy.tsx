"use client";

import { useRef } from "react";
import { useReveal } from "@/lib/useReveal";

const POLICY_SNIPPET = `{
  "spend_limits": {
    "USDC": { "per_action": "500", "per_day": "2000" }
  },
  "allowed_protocols": ["dex.xyz"],
  "allowed_counterparties": "owner_allowlist",
  "forbidden": [
    "unlimited_approvals",
    "ownership_transfers"
  ],
  "default": "REVIEW"
}`;

export default function Policy() {
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  return (
    <section ref={ref} className="border-b border-hairline">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-24 sm:px-8 sm:py-32 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow mb-6" data-reveal>
            programmable policy
          </p>
          <h2 className="max-w-md text-ink" data-reveal>
            The rules are yours. The enforcement is theirs.
          </h2>
          <p className="mt-6 max-w-xl text-muted" data-reveal>
            Policies are owner-defined rules the reviewers enforce: spend
            limits, allowed protocols and counterparties, forbidden action
            classes. The agent never sees a private key decision — it sees a
            verdict.
          </p>
        </div>

        <div data-reveal>
          <div className="border border-hairline bg-surface">
            <div className="flex items-center justify-between border-b border-hairline px-5 py-3">
              <span className="mono text-xs text-muted">policy.json</span>
              <span className="mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                example — illustrative
              </span>
            </div>
            <pre className="overflow-x-auto p-5 text-[0.8rem] leading-relaxed text-ink">
              <code>{POLICY_SNIPPET}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
