"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/gsap";

/**
 * Lenis smooth scroll, driven by the GSAP ticker so ScrollTrigger and the
 * scroll position can never drift apart. Skipped entirely under reduced
 * motion (native scrolling still works; ScrollTrigger listens to the native
 * scroller by default).
 */
export default function LenisProvider() {
  useEffect(() => {
    if (prefersReducedMotion()) return;

    const lenis = new Lenis();

    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);

  return null;
}
