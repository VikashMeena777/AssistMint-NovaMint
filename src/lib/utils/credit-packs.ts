// ============================================
// AssistMint — Credit Packs (shared config)
// Client-safe: no server-only imports here.
// Prices carry our margin over Meta's per-message
// utility rate (₹19.8 / ₹17.9 / ₹15 per 100 credits).
// ============================================

export type CreditPackId = 'starter' | 'growth' | 'scale';

export interface CreditPack {
  id: CreditPackId;
  name: string;
  credits: number;
  /** Price in paise (₹99 / ₹449 / ₹1,499). */
  pricePaise: number;
  /** Per-100-credit rate for display, in paise. */
  ratePaisePer100: number;
}

export const CREDIT_PACKS: Record<CreditPackId, CreditPack> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    credits: 500,
    pricePaise: 9900,
    ratePaisePer100: 1980,
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    credits: 2500,
    pricePaise: 44900,
    ratePaisePer100: 1790,
  },
  scale: {
    id: 'scale',
    name: 'Scale',
    credits: 10000,
    pricePaise: 149900,
    ratePaisePer100: 1500,
  },
};

export function getCreditPack(packId: string): CreditPack | null {
  return CREDIT_PACKS[packId as CreditPackId] || null;
}

export function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}
