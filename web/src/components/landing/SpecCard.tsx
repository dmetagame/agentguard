"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useReveal } from "@/lib/useReveal";
import { gsap, prefersReducedMotion } from "@/lib/gsap";
import {
  APP_PATH,
  CHAIN_ID,
  NETWORK_NAME,
  VAULT_ADDRESS,
} from "@/lib/site";

export default function SpecCard() {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  useReveal(sectionRef);

  // Scan-line motif recurs here: one sweep across the spec card on entry.
  useEffect(() => {
    const card = cardRef.current;
    const scan = scanRef.current;
    if (!card || !scan || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        scan,
        { top: "0%", opacity: 0 },
        {
          top: "100%",
          opacity: 1,
          duration: 1.2,
          ease: "power1.inOut",
          scrollTrigger: { trigger: card, start: "top 70%", once: true },
          onComplete: () => {
            gsap.to(scan, { opacity: 0, duration: 0.3 });
          },
        }
      );
    }, card);

    return () => ctx.revert();
  }, []);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(VAULT_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (permissions / non-secure context) — ignore
    }
  }

  return (
    <section ref={sectionRef} className="border-b border-hairline">
      <div className="mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
        <p className="eyebrow mb-6" data-reveal>
          deployment
        </p>
        <h2 className="max-w-xl text-ink" data-reveal>
          Live on Somnia Testnet.
        </h2>

        <div className="mt-14 max-w-3xl" data-reveal>
          <div
            ref={cardRef}
            className="relative overflow-hidden border border-hairline bg-surface"
          >
            <div
              ref={scanRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 h-px opacity-0"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(215,255,62,0.5) 35%, rgba(236,238,244,0.6) 50%, rgba(215,255,62,0.5) 65%, transparent)",
              }}
            />

            <div className="flex items-center gap-2.5 border-b border-hairline px-5 py-3">
              <span className="inline-block size-1.5 rounded-full bg-accent" />
              <span className="mono text-xs text-muted">
                agentguard · somnia-testnet
              </span>
            </div>

            <dl className="mono divide-y divide-hairline text-sm">
              <div className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_1fr]">
                <dt className="text-muted">network</dt>
                <dd className="text-ink">{NETWORK_NAME}</dd>
              </div>
              <div className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_1fr]">
                <dt className="text-muted">chainId</dt>
                <dd className="text-ink">{CHAIN_ID}</dd>
              </div>
              <div className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_1fr]">
                <dt className="text-muted">vault</dt>
                <dd className="flex flex-wrap items-center gap-3 text-ink">
                  <span className="break-all">{VAULT_ADDRESS}</span>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="mono shrink-0 border border-hairline px-2 py-0.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
                    aria-label="Copy vault address to clipboard"
                  >
                    {copied ? "copied ✓" : "copy"}
                  </button>
                </dd>
              </div>
              <div className="grid gap-1 px-5 py-4 sm:grid-cols-[140px_1fr]">
                <dt className="text-muted">stack</dt>
                <dd className="text-ink">
                  Foundry (Solidity contracts) + TypeScript + Next.js web
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-5">
            <p className="text-sm text-muted">
              Connect a wallet on Somnia Testnet to view the vault, policies,
              and review actions.
            </p>
            <Link
              href={APP_PATH}
              className="mono bg-ink px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-accent"
            >
              Launch app →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
