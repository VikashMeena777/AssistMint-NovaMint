// ============================================
// AssistMint — Billing Server Actions
// Plan checkout + verification + usage tracking
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getPlanConfig, type PlanSlug, type BillingCycle } from '@/lib/utils/plan-limits';

// ─── Get Current Plan ───────────────────────

export async function getCurrentPlan(restaurantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('restaurants')
    .select('plan, plan_expires_at, trial_used')
    .eq('id', restaurantId)
    .single();

  if (error || !data) return { plan: 'free', plan_expires_at: null, trial_used: false, config: getPlanConfig('free') };

  const d = data as Record<string, unknown>;
  const planSlug = (d.plan as string) || 'free';
  return {
    plan: planSlug,
    plan_expires_at: d.plan_expires_at as string | null,
    trial_used: (d.trial_used as boolean) || false,
    config: getPlanConfig(planSlug),
  };
}

// ─── Get Plan Usage ─────────────────────────

export async function getPlanUsage(restaurantId: string) {
  const supabase = await createClient();

  // Get current month boundaries
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  // Parallel queries for usage counts
  const [ordersRes, itemsRes, couponsRes, combosRes, rewardsRes, campaignsRes, aiRes] = await Promise.all([
    // Orders this month
    supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd),
    // Total menu items
    supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId),
    // Active coupons
    supabase
      .from('coupons')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
    // Active combos
    supabase
      .from('combos')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
    // Active rewards
    supabase
      .from('rewards')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true),
    // Campaigns this month
    supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd),
    // AI responses this month
    supabase
      .from('ai_usage_log')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd),
  ]);

  return {
    orders: ordersRes.count || 0,
    items: itemsRes.count || 0,
    coupons: couponsRes.count || 0,
    combos: combosRes.count || 0,
    rewards: rewardsRes.count || 0,
    campaigns: campaignsRes.count || 0,
    ai: aiRes.count || 0,
  };
}

// ─── Create Plan Checkout ───────────────────

export async function createPlanCheckout(
  restaurantId: string,
  planSlug: PlanSlug,
  billingCycle: BillingCycle
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  if (planSlug === 'free') return { error: 'Cannot purchase the free plan.' };

  const planConfig = getPlanConfig(planSlug);
  const amount = billingCycle === 'annual' ? planConfig.annual : planConfig.monthly;

  if (amount <= 0) return { error: 'Invalid plan or pricing.' };

  // Get restaurant details
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name')
    .eq('id', restaurantId)
    .single();

  const restaurantName = (restaurant as Record<string, unknown>)?.name || 'Restaurant';

  // Create Cashfree order via standard PG Orders API
  const cfApiBase = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com'
    : 'https://sandbox.cashfree.com';

  const orderId = `PLAN_${restaurantId.substring(0, 8)}_${Date.now()}`;
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?tab=billing&status=success&order_id=${orderId}`;

  const orderPayload = {
    order_id: orderId,
    order_amount: amount,
    order_currency: 'INR',
    order_note: `${planConfig.name} Plan (${billingCycle}) for ${restaurantName}`,
    customer_details: {
      customer_id: user.id.substring(0, 50),
      customer_email: user.email || 'user@assistmint.com',
      customer_phone: '9999999999',
    },
    order_meta: {
      return_url: `${returnUrl}&cf_id={order_id}`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cashfree`,
    },
  };

  try {
    const response = await fetch(`${cfApiBase}/pg/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': process.env.CASHFREE_API_VERSION || '2025-01-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID || '',
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET || '',
      },
      body: JSON.stringify(orderPayload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Billing] Cashfree order creation failed:', JSON.stringify(data));
      return { error: data.message || 'Payment initialization failed. Please try again.' };
    }

    // Store pending plan upgrade
    await supabase.from('payments').insert({
      restaurant_id: restaurantId,
      cashfree_order_id: orderId,
      amount: amount * 100, // store in paise
      status: 'pending',
      metadata: {
        plan: planSlug,
        billing_cycle: billingCycle,
        restaurant_name: restaurantName,
        type: 'subscription',
      },
    });

    return {
      paymentSessionId: data.payment_session_id,
      cfOrderId: orderId,
    };
  } catch (error) {
    console.error('[Billing] Checkout error:', error);
    return { error: 'Something went wrong. Please try again.' };
  }
}

// ─── Verify Plan Payment ────────────────────

export async function verifyPlanPayment(restaurantId: string, cfOrderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Get payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('cashfree_order_id', cfOrderId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!payment) return { error: 'Payment not found.' };
  const p = payment as Record<string, unknown>;

  if (p.status === 'paid') {
    return { success: true, message: 'Payment already verified.' };
  }

  // Verify with Cashfree API
  const cfApiBase = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production'
    ? 'https://api.cashfree.com'
    : 'https://sandbox.cashfree.com';

  try {
    const response = await fetch(`${cfApiBase}/pg/orders/${cfOrderId}`, {
      headers: {
        'x-api-version': process.env.CASHFREE_API_VERSION || '2025-01-01',
        'x-client-id': process.env.CASHFREE_CLIENT_ID || '',
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET || '',
      },
    });

    const data = await response.json();

    if (data.order_status === 'PAID') {
      const metadata = p.metadata as Record<string, unknown>;
      const planSlug = metadata.plan as string;
      const billingCycle = metadata.billing_cycle as string;

      // Calculate expiry
      const expiresAt = new Date();
      if (billingCycle === 'annual') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      }

      // Update restaurant plan
      await supabase
        .from('restaurants')
        .update({
          plan: planSlug,
          plan_expires_at: expiresAt.toISOString(),
        })
        .eq('id', restaurantId);

      // Mark payment as paid
      await supabase
        .from('payments')
        .update({ status: 'paid' })
            .eq('cashfree_order_id', cfOrderId);

      return { success: true, plan: planSlug, expires_at: expiresAt.toISOString() };
    }

    return { error: 'Payment not completed yet.' };
  } catch (error) {
    console.error('[Billing] Verify error:', error);
    return { error: 'Verification failed. Please try again.' };
  }
}
