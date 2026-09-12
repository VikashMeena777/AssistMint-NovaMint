// ─── AssistMint motion tokens ─────────────────
// One shared spring vocabulary so the whole product moves like one hand.
// WhatsApp itself animates in ~120–250ms with almost no bounce — messages
// LAND, they don't wobble. Every damping >= 25 (calm, no overshoot).
import type { Transition } from "motion/react";

export const spring = {
  /** toggles, pills, tick morphs — no visible bounce */
  snappy: { type: "spring", stiffness: 500, damping: 32 },
  /** cards, sections, chat bubbles */
  entrance: { type: "spring", stiffness: 320, damping: 28 },
  /** large surfaces, sticky-stage swaps */
  settle: { type: "spring", stiffness: 200, damping: 26 },
} satisfies Record<string, Transition>;

export const ease = {
  /** entrances (expo-ish, matches spring settle) */
  out: [0.16, 1, 0.3, 1] as const,
  /** exits only */
  in: [0.7, 0, 0.84, 0] as const,
};

/** ms, for CSS transitions */
export const DUR = { micro: 150, exit: 120, reveal: 260 };
