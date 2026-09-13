// ============================================
// AssistMint — Message Balance (shared config)
// Client-safe: no server-only imports here.
//
// MODEL (loss-proof): wallets hold PAISE of WhatsApp
// message spend. Packs sell balance at a 25% markup
// over face value. Sending deducts Meta's ACTUAL
// per-message cost by type (MESSAGE_COSTS_PAISE), so:
//   worst case (all balance spent on marketing, Meta ₹0.78/msg):
//     cost to us ₹78 per ₹100 balance sold at ₹125 → 38% margin.
//   best case (all utility): cost ₹12 → 88% margin.
// Customer-initiated replies inside the 24h window are FREE (no deduction).
// ============================================

export type CreditPackId = 'starter' | 'growth' | 'scale';

export interface MessageBalancePack {
  id: CreditPackId;
  name: string;
  /** Message-spend balance the business receives, in paise. */
  balancePaise: number;
  /** What they pay, in paise (25% markup over face value). */
  pricePaise: number;
}

export const CREDIT_PACKS: Record<CreditPackId, MessageBalancePack> = {
  starter: { id: 'starter', name: 'Starter', balancePaise: 10000, pricePaise: 12500 },
  growth: { id: 'growth', name: 'Growth', balancePaise: 50000, pricePaise: 62500 },
  scale: { id: 'scale', name: 'Scale', balancePaise: 100000, pricePaise: 125000 },
};

/**
 * Meta's per-message cost to us, in paise (India, per-message model).
 * Marketing templates are the expensive kind; utility/authentication are
 * cheap. Update this table if Meta revises rates — the wallet model keeps
 * us profitable at any rate below our 25% markup ceiling (₹1.25 per ₹1).
 */
export const MESSAGE_COSTS_PAISE = {
  marketing: 78,
  utility: 12,
  authentication: 12,
} as const;

export type MessageCostType = keyof typeof MESSAGE_COSTS_PAISE;

export function getCreditPack(packId: string): MessageBalancePack | null {
  return CREDIT_PACKS[packId as CreditPackId] || null;
}

/** Paise → "₹100" display string. */
export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
