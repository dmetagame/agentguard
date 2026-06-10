"use client";

import { useEffect, useRef } from "react";
import { useReveal } from "@/lib/useReveal";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

const STEPS = [
  {
    id: "01",
    name: "agent proposes",
    detail: "The agent submits its intended action. It cannot execute directly.",
  },
  {
    id: "02",
    name: "vault holds",
    detail: "The AgentGuard vault takes custody of the action, pending review.",
  },
  {
    id: "03",
    name: "agents review",
    detail:
      "Consensus-verified Somnia Agents review it: LLM Inference judges intent vs policy; optional Parse-Website verifies external context.",
  },
  {
    id: "04",
    name: "verdict onchain",
    detail: "The verdict is returned onchain — not by a trusted offchain oracle.",
  },
  {
    id: "05",
    name: "vault disposes",
    detail: "Executes, timelocks for 24h, or blocks.",
  },
];

function Connector() {
  return (
    <div
      className="flex items-center justify-center self-stretch py-1 lg:py-0"
      aria-hidden="true"
    >
      {/* horizontal (desktop) */}
      <svg
        viewBox="0 0 40 8"
        className="hidden h-2 w-10 lg:block"
        fill="none"
      >
        <path
          data-connector
          d="M0 4 H32 M28 0.5 L33.5 4 L28 7.5"
          stroke="#8b93a5"
          strokeWidth="1.5"
        />
      </svg>
      {/* vertical (mobile) */}
      <svg viewBox="0 0 8 32" className="h-8 w-2 lg:hidden" fill="none">
        <path
          data-connector
          d="M4 0 V24 M0.5 20 L4 25.5 L7.5 20"
          stroke="#8b93a5"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

export default function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null);
  useReveal(sectionRef);

  // Connectors draw themselves in (strokeDashoffset) after the cards land.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const connectors = gsap.utils.toArray<SVGPathElement>("[data-connector]");
      connectors.forEach((path) => {
        const len = path.getTotalLength();
        gsap.fromTo(
          path,
          { strokeDasharray: len, strokeDashoffset: len },
          {
            strokeDashoffset: 0,
            duration: 0.5,
            ease: "power2.out",
            scrollTrigger: {
              trigger: path,
              start: "top 85%",
              once: true,
            },
            delay: 0.5,
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="border-b border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <p className="eyebrow mb-6" data-reveal>
          how it works
        </p>
        <h2 className="max-w-xl text-ink" data-reveal>
          The agent proposes. The firewall disposes.
        </h2>

        <div className="mt-14 flex flex-col items-stretch lg:flex-row">
          {STEPS.map((step, i) => (
            <div key={step.id} className="contents">
              {i > 0 && <Connector />}
              <div
                className="flex-1 border border-hairline bg-surface p-5"
                data-reveal
              >
                <div className="mono text-xs text-muted">{step.id}</div>
                <div className="mono mt-3 text-sm font-semibold text-ink">
                  {step.name}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted">
                  {step.detail}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-12 border-l-2 border-accent bg-surface/60 px-6 py-5"
          data-reveal
        >
          <p className="max-w-3xl text-sm text-ink">
            Review is consensus-verified onchain, not a trusted offchain
            oracle. The vault will not move funds without a verdict it can
            verify.
          </p>
        </div>
      </div>
    </section>
  );
}
