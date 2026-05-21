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
}

export const PLANS: Record<PlanSlug, PlanConfig> = {
  free: {
    name: 'Free',
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
