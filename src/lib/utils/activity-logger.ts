// ============================================
// AssistMint — Activity Logger (Audit Trail)
// ============================================

import { createClient } from '@supabase/supabase-js';

// Use service role for logging (bypasses RLS)
const supabaseAdmin = process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    )
  : null;

type ActorType = 'system' | 'owner' | 'staff' | 'customer' | 'bot';

interface LogActivityOptions {
  restaurantId: string;
  actorType: ActorType;
  actorId?: string;
  action: string;
  details?: Record<string, unknown>;
}

/**
 * Log an activity — fire-and-forget, never blocks the main flow.
 * Uses service role to bypass RLS.
 */
export function logActivity(options: LogActivityOptions): void {
  if (!supabaseAdmin) return;

  const { restaurantId, actorType, actorId, action, details } = options;

  // Fire-and-forget — don't await, don't block
  void supabaseAdmin
    .from('activity_log')
    .insert({
      restaurant_id: restaurantId,
      actor_type: actorType,
      actor_id: actorId || null,
      action,
      details: details || {},
    })
    .then(({ error }) => {
      if (error) console.error('[Activity Logger] Failed:', error.message);
    });
}

// ─── Common Action Constants ────────────────

export const ACTIONS = {
  // Orders
  ORDER_PLACED: 'order.placed',
  ORDER_CONFIRMED: 'order.confirmed',
  ORDER_PREPARING: 'order.preparing',
  ORDER_READY: 'order.ready',
  ORDER_DELIVERED: 'order.delivered',
  ORDER_CANCELLED: 'order.cancelled',

  // Menu
  MENU_ITEM_CREATED: 'menu.item_created',
  MENU_ITEM_UPDATED: 'menu.item_updated',
  MENU_ITEM_DELETED: 'menu.item_deleted',
  MENU_CATEGORY_CREATED: 'menu.category_created',
  MENU_CATEGORY_DELETED: 'menu.category_deleted',

  // Customers
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_BLOCKED: 'customer.blocked',
  CUSTOMER_UNBLOCKED: 'customer.unblocked',

  // Campaigns
  CAMPAIGN_SENT: 'campaign.sent',
  CAMPAIGN_SCHEDULED: 'campaign.scheduled',

  // Bot
  BOT_CONVERSATION: 'bot.conversation',
  BOT_HANDOFF: 'bot.handoff_to_human',

  // Loyalty
  LOYALTY_POINTS_EARNED: 'loyalty.points_earned',
  LOYALTY_REWARD_REDEEMED: 'loyalty.reward_redeemed',

  // Payments
  PAYMENT_RECEIVED: 'payment.received',
  PAYMENT_REFUNDED: 'payment.refunded',

  // Settings
  SETTINGS_UPDATED: 'settings.updated',
  PLAN_UPGRADED: 'plan.upgraded',
  PLAN_DOWNGRADED: 'plan.downgraded',

  // Staff
  STAFF_ADDED: 'staff.added',
  STAFF_REMOVED: 'staff.removed',

  // Coupons
  COUPON_CREATED: 'coupon.created',
  COUPON_USED: 'coupon.used',

  // Combos
  COMBO_CREATED: 'combo.created',
  COMBO_DELETED: 'combo.deleted',
} as const;
