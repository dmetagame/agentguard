"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/gsap";

const POINTS = 260;
const LINK_DIST = 0.34; // link threshold in unit-sphere space
const ACCENT = "215,255,62";
const INK = "236,238,244";

/**
 * Rotating particle-network globe (canvas 2D, no WebGL dependency).
 * Points sit on a fibonacci sphere; rotation preserves pairwise distances,
 * so the link graph is computed once. Under reduced motion a single static
 * frame is drawn. The loop pauses when the tab is hidden.
 */
export default function ParticleSphere({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // fibonacci sphere
    const pts: { x: number; y: number; z: number }[] = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < POINTS; i++) {
      const y = 1 - (i / (POINTS - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const th = golden * i;
      pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r });
    }

    // static link graph (distances are rotation-invariant)
    const pairs: [number, number][] = [];
    for (let i = 0; i < POINTS; i++) {
      for (let j = i + 1; j < POINTS; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const dz = pts[i].z - pts[j].z;
        if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
          pairs.push([i, j]);
        }
      }
    }

    const accentIdx = new Set<number>();
    for (let i = 7; i < POINTS; i += 23) accentIdx.add(i);

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.1 + 0.3,
      a: Math.random() * 0.4 + 0.1,
    }));

    let w = 0;
    let h = 0;
    let rot = 0;
    let raf = 0;
    const reduced = prefersReducedMotion();

    function resize() {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const proj = new Array<{ sx: number; sy: number; z: number }>(POINTS);

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);

      // starfield
      ctx.fillStyle = `rgb(${INK})`;
      for (const s of stars) {
        ctx.globalAlpha = s.a;
        ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
      }
      ctx.globalAlpha = 1;

      const wide = w >= 1024;
      const cx = wide ? w * 0.7 : w * 0.5;
      const cy = h * 0.46;
      const R = Math.min(wide ? w * 0.24 : w * 0.42, h * 0.4);

      const cosR = Math.cos(rot);
      const sinR = Math.sin(rot);
      const tilt = 0.4;
      const cosT = Math.cos(tilt);
      const sinT = Math.sin(tilt);

      for (let i = 0; i < POINTS; i++) {
        const p = pts[i];
        const x = p.x * cosR + p.z * sinR;
        const z = p.z * cosR - p.x * sinR;
        const y2 = p.y * cosT - z * sinT;
        const z2 = z * cosT + p.y * sinT;
        const persp = 1 / (1.75 - z2 * 0.55);
        proj[i] = { sx: cx + x * R * persp, sy: cy + y2 * R * persp, z: z2 };
      }

      ctx.lineWidth = 0.6;
      for (const [i, j] of pairs) {
        const a = proj[i];
        const b = proj[j];
        const depth = (a.z + b.z) / 2; // -1 (back) … 1 (front)
        ctx.strokeStyle = `rgba(${INK},${0.04 + (depth + 1) * 0.09})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      for (let i = 0; i < POINTS; i++) {
        const q = proj[i];
        const t = (q.z + 1) / 2;
        const isAccent = accentIdx.has(i);
        if (isAccent) {
          ctx.fillStyle = `rgba(${ACCENT},${0.35 + t * 0.65})`;
          ctx.shadowColor = `rgba(${ACCENT},0.8)`;
          ctx.shadowBlur = 6 + t * 6;
        } else {
          ctx.fillStyle = `rgba(${INK},${0.2 + t * 0.6})`;
          ctx.shadowBlur = 0;
        }
        ctx.beginPath();
        ctx.arc(q.sx, q.sy, (isAccent ? 1.6 : 0.9) + t * 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    function frame() {
      rot += 0.0016;
      draw();
      raf = requestAnimationFrame(frame);
    }

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) draw();
    });
    ro.observe(canvas);

    if (reduced) {
      // single static frame — no animation
      draw();
    } else {
      raf = requestAnimationFrame(frame);
    }

    const onVisibility = () => {
      if (reduced) return;
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(frame);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
