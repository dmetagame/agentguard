"use client";

import { useEffect, type RefObject } from "react";
import { gsap, prefersReducedMotion } from "./gsap";

/**
 * Standard section reveal: children marked [data-reveal] fade/rise in,
 * staggered, when the section scrolls to "top 80%". No-op under reduced
 * motion (content stays visible — we animate FROM hidden, never set hidden
 * as a resting state).
 */
export function useReveal(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const targets = gsap.utils.toArray<HTMLElement>("[data-reveal]");
      if (!targets.length) return;
      gsap.from(targets, {
        opacity: 0,
        y: 20,
        duration: 0.7,
        ease: "power2.out",
        stagger: 0.12,
        scrollTrigger: { trigger: el, start: "top 80%", once: true },
      });
    }, el);

    return () => ctx.revert();
  }, [ref]);
}
