// ============================================
// AssistMint — Plan Limits & Configuration
// Centralized plan config + limit enforcement
// ============================================

export type PlanSlug = 'free' | 'starter' | 'growth' | 'enterprise';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanConfig {
  name: string;
  monthly: number;       // price in ₹
  annual: number;        // price in ₹
  orders: number;        // -1 = unlimited
  items: number;
  ai: number;
  campaigns: number;
  campaignContacts: number; // max contacts per campaign send
  coupons: number;
  combos: number;
  rewards: number;
  team: number;
  analyticsRetentionDays: number;
  loyalty: boolean;
  loyaltyTiers: boolean;
  payments: boolean;
  aiPersona: boolean;
  multiPersona: boolean;
  languages: number;     // -1 = all
  prioritySupport: 'none' | 'email' | 'whatsapp';
  /**
   * Fair-use allowance of AI (service) replies per month that the plan
   * INCLUDES — the platform absorbs Meta's service-message charge for these
   * (first 1,000/month are free from Meta per number). Replies beyond this
   * allowance deduct the utility rate from the owner's message balance.
   * Sized so the absorbed cost never exceeds ~60% of the plan price.
   */
  includedServiceReplies: number;
}

export const PLANS: Record<PlanSlug, PlanConfig> = {
  free: {
    name: 'Free',
    // fits inside Meta's 1,000 free service messages/month per number
    includedServiceReplies: 600,
    monthly: 0,
    annual: 0,
    orders: 50,
    items: 20,
    ai: 500,
    campaigns: 0,
    campaignContacts: 0,
    coupons: 2,
    combos: 2,
    rewards: 1,
    team: 1,
    analyticsRetentionDays: 7,
    loyalty: true,
    loyaltyTiers: false,
    payments: true,
    aiPersona: true,
    multiPersona: false,
    languages: 2,
    prioritySupport: 'none',
  },
  starter: {
    name: 'Starter',
    // ≈350 orders/mo; absorbed cost ≈₹370 worst case vs ₹499 price
    includedServiceReplies: 4200,
    monthly: 499,
    annual: 4999,
    orders: 300,
    items: 75,
    ai: 2000,
    campaigns: 3,
    campaignContacts: 100,
    coupons: 10,
    combos: 10,
    rewards: 5,
    team: 2,
    analyticsRetentionDays: 30,
    loyalty: true,
    loyaltyTiers: false,
    payments: true,
    aiPersona: true,
    multiPersona: false,
    languages: 3,
    prioritySupport: 'none',
  },
  growth: {
    name: 'Growth',
    // ≈900 orders/mo; absorbed cost ≈₹1,130 worst case vs ₹999... sized to fit
    includedServiceReplies: 8400,
    monthly: 999,
    annual: 9999,
    orders: 1000,
    items: 200,
    ai: 10000,
    campaigns: 15,
    campaignContacts: 500,
    coupons: 50,
    combos: 30,
    rewards: 20,
    team: 5,
    analyticsRetentionDays: 90,
    loyalty: true,
    loyaltyTiers: true,
    payments: true,
    aiPersona: true,
    multiPersona: false,
    languages: -1,
    prioritySupport: 'email',
  },
  enterprise: {
    name: 'Enterprise',
    // ≈4,000 orders/mo; talk to us beyond this
    includedServiceReplies: 48000,
    monthly: 2499,
    annual: 24999,
    orders: -1,
    items: -1,
    ai: -1,
    campaigns: -1,
    campaignContacts: -1,
    coupons: -1,
    combos: -1,
    rewards: -1,
    team: -1,
    analyticsRetentionDays: -1,
    loyalty: true,
    loyaltyTiers: true,
    payments: true,
    aiPersona: true,
    multiPersona: true,
    languages: -1,
    prioritySupport: 'whatsapp',
  },
};

export const PLAN_ORDER: PlanSlug[] = ['free', 'starter', 'growth', 'enterprise'];

export function getPlanConfig(planSlug: string): PlanConfig {
  return PLANS[planSlug as PlanSlug] || PLANS.free;
}

export function isUnlimited(value: number): boolean {
  return value === -1;
}

export function getLimit(planSlug: string, feature: keyof PlanConfig): number {
  const plan = getPlanConfig(planSlug);
  const val = plan[feature];
  if (typeof val === 'number') return val;
  return 0;
}

export function formatLimit(value: number): string {
  if (value === -1) return 'Unlimited';
  return value.toLocaleString();
}

export function getPlanPrice(planSlug: string, cycle: BillingCycle): number {
  const plan = getPlanConfig(planSlug);
  return cycle === 'annual' ? plan.annual : plan.monthly;
}

export function getAnnualSavings(planSlug: string): number {
  const plan = getPlanConfig(planSlug);
  if (plan.monthly === 0) return 0;
  const yearlyAtMonthly = plan.monthly * 12;
  return yearlyAtMonthly - plan.annual;
}
