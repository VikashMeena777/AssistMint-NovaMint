"use client";

import { motion } from "framer-motion";

export function AuroraBackground({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-32 -left-32 h-96 w-96 rounded-full opacity-20 blur-[120px]"
          style={{ background: "radial-gradient(circle, #34d399 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-15 blur-[120px]"
          style={{ background: "radial-gradient(circle, #22d3ee 0%, transparent 70%)" }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full opacity-10 blur-[100px] animate-float-slow"
          style={{ background: "radial-gradient(circle, #a78bfa 0%, transparent 70%)" }}
        />
      </div>

      {/* Subtle grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative">{children}</div>
    </div>
  );
}

export function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-1 w-1 rounded-full bg-primary/30"
          initial={{
            x: `${Math.random() * 100}%`,
            y: `${Math.random() * 100}%`,
            opacity: 0,
          }}
          animate={{
            y: [null, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 8 + Math.random() * 8,
            repeat: Infinity,
            ease: "linear",
            delay: Math.random() * 4,
          }}
        />
      ))}
    </div>
  );
}
