"use client";

import { motion, useInView, useMotionValue, useSpring } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { EASE_OUT, springSoft } from "./transitions";

/**
 * FadeIn — one-line entrance animation for any block.
 * Pages stay Server Components; this is the client boundary.
 */
type Dir = "up" | "down" | "left" | "right" | "none";
const offsets: Record<Dir, { x?: number; y?: number }> = {
  up: { y: 24 },
  down: { y: -24 },
  left: { x: 24 },
  right: { x: -24 },
  none: {},
};

export function FadeIn({
  children,
  direction = "up",
  delay = 0,
  once = true,
  className,
}: {
  children: ReactNode;
  direction?: Dir;
  delay?: number;
  once?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offsets[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, amount: 0.3 }}
      transition={{ duration: 0.55, ease: EASE_OUT, delay }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Stagger — parent/child pair for coordinated grid reveals.
 * Children need no props; variants propagate.
 */
const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};
const listItem = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE_OUT } },
};

export function Stagger({
  children,
  className,
  amount = 0.15,
}: {
  children: ReactNode;
  className?: string;
  amount?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={list}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={listItem}>
      {children}
    </motion.div>
  );
}

/**
 * AnimatedCard — hover lift + mint glow. The glow is a pre-rendered
 * layer whose OPACITY animates (compositor-cheap); box-shadow is never
 * animated directly.
 */
export function AnimatedCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.article
      className={`group relative ${className ?? ""}`}
      whileHover={{ y: -4, scale: 1.012 }}
      transition={springSoft}
    >
      {/* Hover = lift only. The old mint gradient overlay sat BEHIND
          translucent card backgrounds and tinted them green on hover. */}
      <div className="relative rounded-[inherit]">{children}</div>
    </motion.article>
  );
}

/**
 * Magnetic — element drifts toward the cursor. Signature CTA moment.
 * Motion values drive the DOM directly: zero React re-renders per frame.
 */
export function Magnetic({
  children,
  strength = 0.3,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 200, damping: 15, mass: 0.2 });
  const y = useSpring(my, { stiffness: 200, damping: 15, mass: 0.2 });

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x, y }}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        mx.set((e.clientX - (r.left + r.width / 2)) * strength);
        my.set((e.clientY - (r.top + r.height / 2)) * strength);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * CountUp — number ticker that plays once when scrolled into view.
 * Spring-driven; renders the final value immediately for no-JS/SEO.
 */
export function CountUp({
  to,
  duration = 1.6,
  prefix = "",
  suffix = "",
  decimals = 0,
  className,
}: {
  to: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { duration, bounce: 0 });

  useEffect(() => {
    if (inView) mv.set(to);
  }, [inView, mv, to]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      if (ref.current) {
        ref.current.textContent = `${prefix}${v.toLocaleString("en-IN", {
          maximumFractionDigits: decimals,
          minimumFractionDigits: decimals,
        })}${suffix}`;
      }
    });
    return unsub;
  }, [spring, prefix, suffix, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {to.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}
