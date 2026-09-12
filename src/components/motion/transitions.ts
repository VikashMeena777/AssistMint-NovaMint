/**
 * Shared motion constants — the single source of "how ChirplyMint moves".
 * Premium rule: short (≤600ms), confident, near-zero bounce.
 */

export const EASE_OUT = [0.21, 0.47, 0.32, 0.98] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Card hover lift — soft settle, slight overshoot reads as expensive */
export const springSoft = { type: "spring", stiffness: 300, damping: 20 } as const;

/** Buttons — fast, tactile, no wobble */
export const springSnappy = { type: "spring", stiffness: 400, damping: 25 } as const;

/** Tap feedback — predictable timing, zero bounce */
export const springTap = { type: "spring", duration: 0.18, bounce: 0 } as const;
