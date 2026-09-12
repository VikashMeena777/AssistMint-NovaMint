"use client";

import { useMemo } from "react";
import { motion } from "motion/react";

/**
 * AuroraBackground — the marketing hero's ambient canvas.
 *
 * Layer stack (bottom → top):
 *   1. `.ink-canvas`  — the dark brand base (ink + faint mint radials)
 *   2. light overlay  — in light theme the ink base is swapped for the page
 *                       background so the section reads white (dark theme:
 *                       fully transparent, ink shows through)
 *   3. `.ink-grid`    — barely-there masked grid lines
 *   4. 3 aurora blobs — mint/teal, blur-3xl, drifting on the float-slow
 *                       keyframes at different durations
 *
 * Hard rules honored: NO mouse tracking, NO outer shadows, transform/opacity
 * animations only. Blobs sit at bg-primary/[0.04] in light and /0.07 in dark.
 */
export function AuroraBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      {/* 1 — dark ink base */}
      <div aria-hidden className="ink-canvas pointer-events-none absolute inset-0" />

      {/* 2 — light theme swaps the ink base for the page background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-background dark:bg-transparent"
      />

      {/* 3 — faint masked grid */}
      <div aria-hidden className="ink-grid pointer-events-none absolute inset-0" />

      {/* 4 — drifting mint/teal auroras (no tracking, no outer shadows) */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-28 -left-20 h-[420px] w-[420px] animate-float-slow rounded-full bg-primary/[0.04] blur-3xl dark:bg-primary/[0.07]" />
        <div
          className="absolute top-1/3 -right-28 h-[380px] w-[380px] animate-float-slow rounded-full bg-primary/[0.04] blur-3xl dark:bg-primary/[0.07]"
          style={{ animationDuration: "11s" }}
        />
        <div
          className="absolute -bottom-32 left-1/3 h-[360px] w-[360px] animate-float-slow rounded-full bg-chart-2/[0.04] blur-3xl dark:bg-chart-2/[0.07]"
          style={{ animationDuration: "14s" }}
        />
      </div>

      <div className="relative">{children}</div>
    </div>
  );
}

/**
 * FloatingParticles — a handful of mint motes drifting upward.
 * Config is generated inside useMemo from a deterministic seeded PRNG, so
 * every render (server, first client render and re-renders) produces the
 * exact same values: hydration-safe AND free of impure Math.random calls.
 */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function FloatingParticles() {
  const particles = useMemo(() => {
    const rand = mulberry32(0x4d1b7a);
    return Array.from({ length: 8 }).map(() => {
      const initialY = rand() * 100;
      return {
        initialX: `${rand() * 100}%`,
        initialY: `${initialY}%`,
        animateY: [null, `${rand() * 100}%`, `${initialY}%`] as [number | null, string, string],
        duration: 8 + rand() * 8,
        delay: rand() * 4,
      };
    });
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/30"
          initial={{
            x: p.initialX,
            y: p.initialY,
            opacity: 0,
          }}
          animate={{
            y: p.animateY,
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
