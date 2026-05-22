// ============================================
// AssistMint — Loyalty & Rewards Server Actions
// Points engine + tier management + redemption
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

// ─── Config ─────────────────────────────────

const POINTS_PER_RUPEE = 1;   // 1 point per ₹1 spent
const TIER_THRESHOLDS = {
  bronze: 0,
  silver: 500,
  gold: 2000,
  platinum: 5000,
} as const;

const TIER_MULTIPLIERS = {
  bronze: 1,
  silver: 1.25,
  gold: 1.5,
  platinum: 2,
} as const;

// ─── Award Points for Order ─────────────────

export async function awardLoyaltyPoints(
  restaurantId: string,
  customerId: string,
  orderId: string,
  orderAmount: number // in paise
) {
  const supabase = await createClient();

  // Get customer's current tier for multiplier
  const { data: customer } = await supabase
    .from('customers')
    .select('loyalty_points, loyalty_tier')
    .eq('id', customerId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!customer) return { error: 'Customer not found' };
  const c = customer as Record<string, unknown>;

  const currentTier = (c.loyalty_tier as string) || 'bronze';
  const multiplier = TIER_MULTIPLIERS[currentTier as keyof typeof TIER_MULTIPLIERS] || 1;

  // Calculate points: (amount in rupees) × points_per_rupee × tier_multiplier
  const amountInRupees = orderAmount / 100;
  const basePoints = Math.floor(amountInRupees * POINTS_PER_RUPEE);
  const earnedPoints = Math.floor(basePoints * multiplier);

  const newTotal = ((c.loyalty_points as number) || 0) + earnedPoints;

  // Determine new tier
  let newTier = 'bronze';
  if (newTotal >= TIER_THRESHOLDS.platinum) newTier = 'platinum';
  else if (newTotal >= TIER_THRESHOLDS.gold) newTier = 'gold';
  else if (newTotal >= TIER_THRESHOLDS.silver) newTier = 'silver';

  // Update customer
  await supabase
    .from('customers')
    .update({
      loyalty_points: newTotal,
      loyalty_tier: newTier,
    })
    .eq('id', customerId);

  // Log the transaction
  await supabase.from('loyalty_transactions').insert({
    restaurant_id: restaurantId,
    customer_id: customerId,
    type: 'earn',
    points: earnedPoints,
    description: `Earned from order`,
    reference_id: orderId,
    reference_type: 'order',
  });

  logActivity({
    restaurantId,
    actorType: 'system',
    action: ACTIONS.LOYALTY_POINTS_EARNED,
    details: {
      customerId,
      orderId,
      pointsEarned: earnedPoints,
      newTotal,
      tier: newTier,
      tierChanged: newTier !== currentTier,
    },
  });

  revalidatePath('/dashboard/loyalty');
  return {
    pointsEarned: earnedPoints,
    totalPoints: newTotal,
    tier: newTier,
    tierUpgraded: newTier !== currentTier,
  };
}

// ─── Redeem Points ──────────────────────────

export async function redeemPoints(
  restaurantId: string,
  customerId: string,
  points: number,
  description: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data: customer } = await supabase
    .from('customers')
    .select('loyalty_points')
    .eq('id', customerId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!customer) return { error: 'Customer not found' };
  const currentPoints = (customer as Record<string, unknown>).loyalty_points as number || 0;

  if (currentPoints < points) {
    return { error: `Insufficient points. Customer has ${currentPoints} points.` };
  }

  const newTotal = currentPoints - points;

  await supabase
    .from('customers')
    .update({ loyalty_points: newTotal })
    .eq('id', customerId);

  await supabase.from('loyalty_transactions').insert({
    restaurant_id: restaurantId,
    customer_id: customerId,
    type: 'redeem',
    points: -points,
    description,
    reference_type: 'redemption',
  });

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: ACTIONS.LOYALTY_REWARD_REDEEMED,
    details: { customerId, pointsRedeemed: points, remaining: newTotal },
  });

  revalidatePath('/dashboard/loyalty');
  return { success: true, remaining: newTotal };
}

// ─── Get Loyalty Transactions ───────────────

export async function getLoyaltyTransactions(
  restaurantId: string,
  filters?: {
    customerId?: string;
    type?: 'earn' | 'redeem';
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from('loyalty_transactions')
    .select('*, customers(whatsapp_name, phone)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (filters?.customerId) {
    query = query.eq('customer_id', filters.customerId);
  }
  if (filters?.type) {
    query = query.eq('type', filters.type);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return { error: error.message, data: null, count: 0 };
  return { data, error: null, count: count || 0 };
}

// ─── Get Loyalty Stats ──────────────────────

export async function getLoyaltyStats(restaurantId: string) {
  const supabase = await createClient();

  // Total points in circulation
  const { data: customers } = await supabase
    .from('customers')
    .select('loyalty_points, loyalty_tier')
    .eq('restaurant_id', restaurantId);

  const totalPoints = (customers || []).reduce(
    (sum, c) => sum + ((c as Record<string, unknown>).loyalty_points as number || 0),
    0
  );

  // Tier distribution
  const tiers = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  for (const c of customers || []) {
    const tier = (c as Record<string, unknown>).loyalty_tier as string || 'bronze';
    if (tier in tiers) tiers[tier as keyof typeof tiers]++;
  }

  // Total points earned (all time)
  const { data: earnedData } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('restaurant_id', restaurantId)
    .eq('type', 'earn');

  const totalEarned = (earnedData || []).reduce(
    (sum, t) => sum + ((t as Record<string, unknown>).points as number || 0),
    0
  );

  // Total points redeemed (all time)
  const { data: redeemedData } = await supabase
    .from('loyalty_transactions')
    .select('points')
    .eq('restaurant_id', restaurantId)
    .eq('type', 'redeem');

  const totalRedeemed = (redeemedData || []).reduce(
    (sum, t) => sum + Math.abs((t as Record<string, unknown>).points as number || 0),
    0
  );

  return {
    totalPoints,
    totalEarned,
    totalRedeemed,
    tiers,
    activeMembers: (customers || []).length,
  };
}

// ─── Get Customer Loyalty Details ───────────

export async function getCustomerLoyalty(restaurantId: string, customerId: string) {
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from('customers')
    .select('loyalty_points, loyalty_tier, total_orders, total_spent')
    .eq('id', customerId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!customer) return { error: 'Customer not found' };
  const c = customer as Record<string, unknown>;

  const currentPoints = (c.loyalty_points as number) || 0;
  const currentTier = (c.loyalty_tier as string) || 'bronze';

  // Calculate progress to next tier
  let nextTier: string | null = null;
  let pointsToNext = 0;

  if (currentTier === 'bronze') {
    nextTier = 'silver';
    pointsToNext = TIER_THRESHOLDS.silver - currentPoints;
  } else if (currentTier === 'silver') {
    nextTier = 'gold';
    pointsToNext = TIER_THRESHOLDS.gold - currentPoints;
  } else if (currentTier === 'gold') {
    nextTier = 'platinum';
    pointsToNext = TIER_THRESHOLDS.platinum - currentPoints;
  }

  // Recent transactions
  const { data: recentTx } = await supabase
    .from('loyalty_transactions')
    .select('*')
    .eq('customer_id', customerId)
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(10);

  return {
    points: currentPoints,
    tier: currentTier,
    multiplier: TIER_MULTIPLIERS[currentTier as keyof typeof TIER_MULTIPLIERS] || 1,
    nextTier,
    pointsToNext: Math.max(0, pointsToNext),
    totalOrders: (c.total_orders as number) || 0,
    totalSpent: (c.total_spent as number) || 0,
    recentTransactions: recentTx || [],
  };
}
