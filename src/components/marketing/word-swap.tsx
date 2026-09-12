"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { spring } from "@/components/motion/tokens";

const WORDS = ["orders", "bookings", "payments", "regulars"];

/** P3 kinetic word-swap — popLayout, never a masked reveal. The swapped
 *  word sits over a marigold hand-underline that draws ONCE (pathLength,
 *  no cursor tracking) and stays put — a ledger flourish under the line. */
export function WordSwap() {
  const [i, setI] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    const id = setInterval(() => {
      // Skip the beat while the tab is hidden — no wasted renders.
      if (document.visibilityState !== "visible") return;
      setI((v) => (v + 1) % WORDS.length);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="relative inline-grid overflow-visible align-baseline">
      {/* invisible widest word reserves width — no reflow jitter */}
      <span aria-hidden className="invisible col-start-1 row-start-1">
        payments
      </span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={WORDS[i]}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={spring.entrance}
          className="col-start-1 row-start-1 text-primary"
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>

      {/* Hand-drawn seal underline — draws once after the headline lands */}
      <motion.svg
        aria-hidden
        viewBox="0 0 120 8"
        preserveAspectRatio="none"
        className="pointer-events-none absolute -bottom-1.5 left-0 h-2 w-full overflow-visible"
        fill="none"
      >
        <motion.path
          d="M2 5.2 C 20 2.4, 44 7, 62 4.4 S 100 2.2, 118 4.6"
          stroke="var(--seal)"
          strokeWidth={2.4}
          strokeLinecap="round"
          initial={{ pathLength: reduced ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.7, delay: 0.9, ease: "easeOut" }}
        />
      </motion.svg>
    </span>
  );
}
