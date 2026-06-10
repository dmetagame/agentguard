"use client";

import { useEffect, useRef } from "react";
import { useReveal } from "@/lib/useReveal";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import { proofByVerdict, txUrl, vaultUrl, type Verdict } from "@/lib/proofs";

const VERDICTS = [
  {
    label: "APPROVE",
    verdict: "Approve" as Verdict,
    color: "#22c787",
    className: "text-approve",
    title: "Executes.",
    detail:
      "The action satisfies policy. The vault executes it onchain — no human in the loop, no delay.",
  },
  {
    label: "REVIEW",
    verdict: "Review" as Verdict,
    color: "#f5a623",
    className: "text-review",
    title: "24h timelock — owner can veto.",
    detail:
      "Ambiguous or borderline. The action is held for 24 hours; the owner can veto before it executes.",
  },
  {
    label: "BLOCK",
    verdict: "Block" as Verdict,
    color: "#ff5d5d",
    className: "text-block",
    title: "Rejected, logged.",
    detail:
      "Policy violation. The vault refuses to execute it — the block is enforced onchain and recorded in the action log.",
  },
] as const;

type LogSegment = { text: string; color?: string };

const LOG_LINES: LogSegment[][] = [
  [
    { text: "agent: swap 500 STT on dex.xyz" },
    { text: " → parse-website: contract verified" },
    { text: " → llm-inference: intent matches policy" },
    { text: " → VERDICT: APPROVE", color: "#22c787" },
  ],
  [
    { text: "agent: approve unlimited spend to 0x9a…f3" },
    { text: " → policy: unlimited approvals forbidden" },
    { text: " → VERDICT: BLOCK", color: "#ff5d5d" },
  ],
  [
    { text: "agent: send 1,200 STT to new counterparty 0x4c…a1" },
    { text: " → llm-inference: counterparty not in allowlist" },
    { text: " → VERDICT: REVIEW (24h timelock)", color: "#f5a623" },
  ],
];

function LogTrack() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden="true">
      {LOG_LINES.map((line, i) => (
        <span key={i} className="mono whitespace-nowrap pr-16 text-xs text-muted">
          {line.map((seg, j) => (
            <span key={j} style={seg.color ? { color: seg.color } : undefined}>
              {seg.text}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

export default function Verdicts() {
  const sectionRef = useRef<HTMLElement>(null);
  const tickerRef = useRef<HTMLDivElement>(null);
  useReveal(sectionRef);

  // Stamp animation: verdict label slams down onto the card, border flashes
  // its verdict color once, then settles back to hairline.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.utils
        .toArray<HTMLElement>("[data-verdict-card]")
        .forEach((card, i) => {
          const label = card.querySelector<HTMLElement>("[data-verdict-label]");
          const color = card.dataset.verdictColor ?? "#232837";
          if (!label) return;

          gsap
            .timeline({
              scrollTrigger: { trigger: card, start: "top 80%", once: true },
              delay: i * 0.18,
            })
            .fromTo(
              label,
              { scale: 2.1, opacity: 0 },
              { scale: 1, opacity: 1, duration: 0.22, ease: "power4.in" }
            )
            // 1-frame settle, like a rubber stamp landing
            .to(label, { scale: 0.96, duration: 0.05, ease: "none" })
            .to(label, { scale: 1, duration: 0.09, ease: "power1.out" })
            .fromTo(
              card,
              { borderColor: color },
              { borderColor: "#232837", duration: 0.9, ease: "power2.out" },
              "<-0.05"
            );
        });

      // Action-log marquee
      const track = tickerRef.current?.querySelector("[data-ticker-track]");
      if (track) {
        gsap.to(track, {
          xPercent: -50,
          duration: 36,
          ease: "none",
          repeat: -1,
        });
      }
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="border-b border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <p className="eyebrow mb-6" data-reveal>
          the checkpoint
        </p>
        <h2 className="max-w-xl text-ink" data-reveal>
          Every action gets a verdict.
        </h2>
        <p className="mt-6 max-w-2xl text-muted" data-reveal>
          Three outcomes. Nothing executes without one. Each card links to the
          real transaction that proves it, live on Somnia Testnet.
        </p>
        <a
          href={vaultUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="mono mt-4 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
          data-reveal
        >
          view the live vault on the explorer ↗
        </a>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {VERDICTS.map((v) => {
            const proof = proofByVerdict(v.verdict);
            const canonical = proof?.txs[proof.txs.length - 1];
            return (
              <div
                key={v.label}
                data-verdict-card
                data-verdict-color={v.color}
                data-reveal
                className="flex flex-col border border-hairline bg-surface p-8"
              >
                <div
                  data-verdict-label
                  className={`mono text-3xl font-semibold tracking-tight ${v.className}`}
                >
                  {v.label}
                </div>
                <div className="mono mt-5 text-sm text-ink">{v.title}</div>
                <p className="mt-3 text-sm text-muted">{v.detail}</p>
                {proof && canonical && (
                  <a
                    href={txUrl(canonical.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mono mt-6 inline-flex items-center gap-1.5 text-xs text-muted underline-offset-4 transition-colors hover:text-accent hover:underline"
                  >
                    <span className="inline-block size-1.5 rounded-full bg-accent" />
                    live proof · action #{proof.id.toString()} ↗
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* action-log ticker */}
      <div
        ref={tickerRef}
        className="overflow-hidden border-t border-hairline bg-surface/60 py-3"
        role="img"
        aria-label="Example action log: agent proposals reviewed and given verdicts"
      >
        <div data-ticker-track className="flex w-max">
          <LogTrack />
          <LogTrack />
        </div>
      </div>
    </section>
  );
}
