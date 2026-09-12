"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { spring } from "@/components/motion/tokens";

// ─── Animated Counter ───────────────────────
// rAF-driven count-up that plays once when scrolled into view.

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 2,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "-50px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let startTime: number | null = null;
    let raf = 0;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(eased * value));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [visible, value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString("en-IN")}
      {suffix}
    </span>
  );
}

// ─── Section Reveal ─────────────────────────
// Entrance = opacity + y 14→0 on a calm spring (damping ≥ 25, from tokens).

export function SectionReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ ...spring.entrance, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Stagger Container + Item ───────────────
// Parent orchestrates; children rise 14px and fade in on entrance springs.

export function StaggerContainer({
  children,
  className = "",
  staggerDelay = 0.06,
}: {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: {
          opacity: 1,
          y: 0,
          transition: spring.entrance,
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── Marquee (P9) ───────────────────────────
// Duplicated track translated -50% — the seam lands exactly because each
// half carries `pr` equal to its internal gap. The animation itself lives
// in globals.css as `.animate-marquee` (48s linear, pauses on hover, and
// the reduced-motion net freezes it into a static row).

export function Marquee({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // Pause the CSS track while the tab is hidden — no compositor work for
  // nobody. (Style-only, zero re-renders.)
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const onVis = () => {
      track.style.animationPlayState = document.hidden ? "paused" : "running";
    };
    document.addEventListener("visibilitychange", onVis);
    onVis();
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div className={`overflow-hidden ${className}`}>
      <div ref={trackRef} className="animate-marquee flex w-max whitespace-nowrap">
        <div className="flex items-center gap-8 pr-8">{children}</div>
        <div className="flex items-center gap-8 pr-8" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
