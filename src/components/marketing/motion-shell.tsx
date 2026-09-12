"use client";

import { MotionConfig } from "motion/react";

/** Client boundary that applies the site-wide reduced-motion policy
 *  (MotionConfig) around every marketing page. */
export function MotionShell({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
