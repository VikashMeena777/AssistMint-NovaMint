// ============================================
// AssistMint — Plan Limit Enforcement
// Server-side utility to check limits before actions
// ============================================

import { createClient } from '@/lib/supabase/server';
import { getPlanConfig, isUnlimited, type PlanConfig } from './plan-limits';

// ─── Types ──────────────────────────────────

type LimitFeature =
  | 'orders'
  | 'items'
  | 'ai'
  | 'campaigns'
  | 'coupons'
  | 'combos'
  | 'rewards'
  | 'team';

interface LimitCheckResult {
  allowed: boolean;
  current: number;
  limit: number;
  feature: string;
  message: string;
}

// ─── Get Current Month Range ────────────────

function getMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
  return { start, end };
}

// ─── Check Specific Limit ───────────────────

export async function checkPlanLimit(
  restaurantId: string,
  feature: LimitFeature
): Promise<LimitCheckResult> {
  const supabase = await createClient();

  // 1. Get restaurant's current plan
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('plan')
    .eq('id', restaurantId)
    .single();

  const planSlug = (restaurant as Record<string, unknown>)?.plan as string || 'free';
  const config = getPlanConfig(planSlug);
  const limit = config[feature] as number;

  // Unlimited → always allowed
  if (isUnlimited(limit)) {
    return { allowed: true, current: 0, limit: -1, feature, message: '' };
  }

  // 2. Count current usage based on feature
  let current = 0;
  const { start: monthStart, end: monthEnd } = getMonthRange();

  switch (feature) {
    case 'orders': {
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      current = count || 0;
      break;
    }
    case 'items': {
      const { count } = await supabase
        .from('menu_items')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId);
      current = count || 0;
      break;
    }
    case 'ai': {
      const { count } = await supabase
        .from('ai_usage_log')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      current = count || 0;
      break;
    }
    case 'campaigns': {
      const { count } = await supabase
        .from('campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd);
      current = count || 0;
      break;
    }
    case 'coupons': {
      const { count } = await supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);
      current = count || 0;
      break;
    }
    case 'combos': {
      const { count } = await supabase
        .from('combos')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);
      current = count || 0;
      break;
    }
    case 'rewards': {
      const { count } = await supabase
        .from('rewards')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);
      current = count || 0;
      break;
    }
    case 'team': {
      // Team members would need a team_members table
      // For now, count is 1 (owner only)
      current = 1;
      break;
    }
  }

  const FEATURE_LABELS: Record<LimitFeature, string> = {
    orders: 'orders this month',
    items: 'menu items',
    ai: 'AI responses this month',
    campaigns: 'campaigns this month',
    coupons: 'active coupons',
    combos: 'active combos',
    rewards: 'active rewards',
    team: 'team members',
  };

  if (current >= limit) {
    const planName = config.name;
    return {
      allowed: false,
      current,
      limit,
      feature,
      message: `You've reached the ${FEATURE_LABELS[feature]} limit (${current}/${limit}) on the ${planName} plan. Upgrade to add more.`,
    };
  }

  return { allowed: true, current, limit, feature, message: '' };
}

// ─── Check Campaign Contacts Limit ──────────

export async function checkCampaignContactsLimit(
  restaurantId: string,
  contactCount: number
): Promise<LimitCheckResult> {
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('plan')
    .eq('id', restaurantId)
    .single();

  const planSlug = (restaurant as Record<string, unknown>)?.plan as string || 'free';
  const config = getPlanConfig(planSlug);
  const limit = config.campaignContacts;

  if (isUnlimited(limit)) {
    return { allowed: true, current: contactCount, limit: -1, feature: 'campaignContacts', message: '' };
  }

  if (contactCount > limit) {
    return {
      allowed: false,
      current: contactCount,
      limit,
      feature: 'campaignContacts',
      message: `Campaign targets ${contactCount} contacts, but your ${config.name} plan allows max ${limit} contacts per send. Upgrade for higher limits.`,
    };
  }

  return { allowed: true, current: contactCount, limit, feature: 'campaignContacts', message: '' };
}

// ─── Admin Client (for webhook/API context) ─

import { createClient as createAdminClient } from '@supabase/supabase-js';

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Log AI Usage ───────────────────────────
// Uses admin client because this runs from webhook (no user cookies)

export async function logAiUsage(
  restaurantId: string,
  customerId: string | null,
  tokensUsed: number = 1
): Promise<void> {
  await supabaseAdmin.from('ai_usage_log').insert({
    restaurant_id: restaurantId,
    customer_id: customerId,
    tokens_used: tokensUsed,
  }).then(() => {});
}

// ─── Check AI Limit (webhook-safe) ──────────
// Uses admin client because this runs from webhook (no user cookies)

export async function checkAiLimit(restaurantId: string): Promise<LimitCheckResult> {
  // Get plan
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('plan')
    .eq('id', restaurantId)
    .single();

  const planSlug = (restaurant as Record<string, unknown>)?.plan as string || 'free';
  const config = getPlanConfig(planSlug);
  const limit = config.ai;

  if (isUnlimited(limit)) {
    return { allowed: true, current: 0, limit: -1, feature: 'ai', message: '' };
  }

  const { start: monthStart, end: monthEnd } = getMonthRange();
  const { count } = await supabaseAdmin
    .from('ai_usage_log')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('created_at', monthStart)
    .lte('created_at', monthEnd);

  const current = count || 0;

  if (current >= limit) {
    return {
      allowed: false,
      current,
      limit,
      feature: 'ai',
      message: `AI response limit reached (${current}/${limit}) on the ${config.name} plan. Upgrade for more AI responses.`,
    };
  }

  return { allowed: true, current, limit, feature: 'ai', message: '' };
}
