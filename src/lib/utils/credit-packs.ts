// ============================================
// AssistMint — Message Balance (shared config)
// Client-safe: no server-only imports here.
//
// MODEL (loss-proof): wallets hold PAISE of WhatsApp
// message spend. Packs sell balance at a 40% markup.
// Sending deducts the REAL Meta per-message cost by
// type (MESSAGE_COSTS_PAISE — India rates, rounded up
// to whole paise), so the wallet can never go negative
// against Meta's bill and every pack is profitable:
//   worst case (all balance spent on marketing):
//     pay ₹140 for ₹100 balance → Meta cost ≈ ₹94.93 → 32% margin
//   best case (all utility):
//     Meta cost ≈ ₹11.50 → 92% margin
// Customer-initiated replies inside the 24h window are
// FREE (no deduction) — that's the bot's chat replies.
// ============================================

export type CreditPackId = 'starter' | 'growth' | 'scale';

export interface MessageBalancePack {
  id: CreditPackId;
  name: string;
  /** Message-spend balance the business receives, in paise. */
  balancePaise: number;
  /** What they pay, in paise (40% markup over face value). */
  pricePaise: number;
}

export const CREDIT_PACKS: Record<CreditPackId, MessageBalancePack> = {
  starter: { id: 'starter', name: 'Starter', balancePaise: 10000, pricePaise: 14000 },
  growth: { id: 'growth', name: 'Growth', balancePaise: 50000, pricePaise: 70000 },
  scale: { id: 'scale', name: 'Scale', balancePaise: 100000, pricePaise: 140000 },
};

/**
 * Meta's per-message cost to us, in PAISE (India rates supplied by the owner
 * 2026-09-14, rounded UP to whole paise so tiny buffers never turn losses):
 *   marketing 0.8631 → 87 | utility 0.115 → 12 | authentication 0.115 → 12
 *   authentication_international 2.4971 → 250 | service free until
 *   Oct 1 2026, then utility-rate → pre-set to 12 (only used when we
 *   start deducting for service replies).
 * Update this table when Meta revises rates — profitability is guaranteed
 * at any rate below the 40% markup ceiling (₹1.40 per ₹1 of balance).
 */
export const MESSAGE_COSTS_PAISE = {
  marketing: 87,
  utility: 12,
  authentication: 12,
  authentication_international: 250,
  service: 12,
} as const;

export type MessageCostType = keyof typeof MESSAGE_COSTS_PAISE;

export function getCreditPack(packId: string): MessageBalancePack | null {
  return CREDIT_PACKS[packId as CreditPackId] || null;
}

/** Paise → "₹100" display string. */
export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
