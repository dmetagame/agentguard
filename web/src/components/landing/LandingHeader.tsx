"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Logo from "./Logo";
import { APP_PATH, REPO_URL } from "@/lib/site";
import { gsap, prefersReducedMotion } from "@/lib/gsap";

export default function LandingHeader() {
  const lockupRef = useRef<HTMLAnchorElement>(null);

  // Brand moment: shield + legs draw in, then the node pops. ~1s total.
  useEffect(() => {
    const lockup = lockupRef.current;
    if (!lockup || prefersReducedMotion()) return;

    const shield = lockup.querySelector<SVGPathElement>("[data-logo-shield]");
    const legs = lockup.querySelector<SVGPathElement>("[data-logo-legs]");
    const node = lockup.querySelector<SVGCircleElement>("[data-logo-node]");
    if (!shield || !legs || !node) return;

    const ctx = gsap.context(() => {
      const shieldLen = shield.getTotalLength();
      const legsLen = legs.getTotalLength();

      const tl = gsap.timeline();
      tl.fromTo(
        shield,
        { strokeDasharray: shieldLen, strokeDashoffset: shieldLen },
        { strokeDashoffset: 0, duration: 0.55, ease: "power2.inOut" }
      )
        .fromTo(
          legs,
          { strokeDasharray: legsLen, strokeDashoffset: legsLen },
          { strokeDashoffset: 0, duration: 0.3, ease: "power2.out" },
          "-=0.15"
        )
        .fromTo(
          node,
          { scale: 0, transformOrigin: "center center" },
          { scale: 1, duration: 0.35, ease: "back.out(2.5)" },
          "-=0.1"
        );
    }, lockup);

    return () => ctx.revert();
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-hairline bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a
          ref={lockupRef}
          href="#"
          className="flex items-baseline gap-2.5 text-ink"
          aria-label="AgentGuard — home"
        >
          <Logo size={24} className="self-center" />
          <span className="font-display text-[1.05rem] font-medium tracking-tight">
            AgentGuard
          </span>
          <span className="mono hidden text-[0.65rem] uppercase tracking-[0.18em] text-muted sm:inline">
            onchain firewall
          </span>
        </a>

        <nav className="flex items-center gap-3">
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mono hidden text-xs text-muted transition-colors hover:text-ink sm:inline"
          >
            view source
          </a>
          <Link
            href={APP_PATH}
            className="mono border border-hairline bg-surface px-3.5 py-1.5 text-xs text-ink transition-colors hover:border-accent hover:text-accent"
          >
            launch app →
          </Link>
        </nav>
      </div>
    </header>
  );
}
