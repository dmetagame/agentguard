"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import ParticleSphere from "./ParticleSphere";
import { APP_PATH, REPO_URL } from "@/lib/site";
import { gsap, SplitText, prefersReducedMotion } from "@/lib/gsap";

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const headline = headlineRef.current;
    const scan = scanRef.current;
    if (!section || !headline || prefersReducedMotion()) return;

    let split: SplitText | null = null;
    const ctx = gsap.context(() => {
      // Split after fonts load so line breaks are measured correctly.
      document.fonts.ready.then(() => {
        if (!headline.isConnected) return;
        split = new SplitText(headline, {
          type: "lines,words",
          mask: "lines",
          linesClass: "split-line",
        });
        gsap.from(split.words, {
          yPercent: 110,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.04,
          delay: 0.25,
        });
      });

      gsap.from("[data-hero-fade]", {
        opacity: 0,
        y: 16,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.1,
        delay: 0.7,
      });

      // Scan line: one sweep down the hero, then gone.
      if (scan) {
        gsap.fromTo(
          scan,
          { top: "8%", opacity: 0 },
          {
            top: "92%",
            opacity: 1,
            duration: 1.6,
            ease: "power1.inOut",
            delay: 0.9,
            onComplete: () => {
              gsap.to(scan, { opacity: 0, duration: 0.4 });
            },
          }
        );
      }
    }, section);

    return () => {
      split?.revert();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden border-b border-hairline"
    >
      {/* particle-network globe + starfield backdrop */}
      <ParticleSphere className="pointer-events-none absolute inset-0 h-full w-full opacity-50 lg:opacity-100" />

      {/* soft accent glow rising from the horizon */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-64"
        style={{
          background:
            "radial-gradient(ellipse 70% 100% at 50% 115%, rgba(215,255,62,0.08), transparent 70%)",
        }}
      />

      {/* scan line */}
      <div
        ref={scanRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 h-px opacity-0"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(215,255,62,0.5) 30%, rgba(236,238,244,0.6) 50%, rgba(215,255,62,0.5) 70%, transparent)",
        }}
      />

      <div className="relative mx-auto flex min-h-[92svh] max-w-6xl flex-col justify-center px-5 pb-20 pt-32 sm:px-8">
        <div>
          <div className="max-w-3xl">
            <p className="eyebrow mb-6" data-hero-fade>
              powered by Somnia Agents · Somnia Testnet
            </p>

            <h1 ref={headlineRef} className="text-ink">
              Onchain firewall for AI&nbsp;agents.
            </h1>

            <p
              className="mt-7 max-w-2xl text-base text-muted sm:text-lg"
              data-hero-fade
            >
              Autonomous agents shouldn&apos;t have unsupervised wallets.
              AgentGuard reviews every proposed action with consensus-verified
              Somnia Agents (LLM Inference + Parse-Website) before the vault
              will execute it.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4" data-hero-fade>
              <Link
                href={APP_PATH}
                className="mono bg-ink px-6 py-3 text-sm font-semibold text-background transition-colors hover:bg-accent"
              >
                Launch app →
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mono border border-hairline px-6 py-3 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
              >
                View source
              </a>
            </div>

            <div className="mt-10" data-hero-fade>
              <span className="mono inline-flex items-center gap-2 border border-hairline bg-surface px-3 py-1.5 text-xs text-muted">
                <span className="inline-block size-1.5 rounded-full bg-accent" />
                Built for the Somnia Agentathon.
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
