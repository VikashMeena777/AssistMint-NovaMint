// ============================================
// AssistMint — Messaging Credit Service
// Prepaid credits for business-initiated WhatsApp
// sends (broadcasts, win-back, review requests).
// Customer replies within the 24h window stay
// free — deduction only happens at the explicit
// spend sites in broadcast-service and the two
// crons. All access via the service role (pattern
// from bot-payment.ts).
// ============================================

import { createClient } from '@supabase/supabase-js';
import { logActivity } from '@/lib/utils/activity-logger';
import { CREDIT_PACKS, getCreditPack, formatPaise } from '@/lib/utils/credit-packs';

export { CREDIT_PACKS, getCreditPack };
export type { MessageBalancePack, CreditPackId } from '@/lib/utils/credit-packs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export type CreditReason =
  | 'purchase'
  | 'campaign'
  | 'broadcast'
  | 'business_message'
  | 'service'
  | 'refund'
  | 'bonus';

export interface CreditTransaction {
  id: string;
  restaurant_id: string;
  delta: number;
  reason: string;
  reference: string | null;
  balance_after: number;
  created_at: string;
}

export interface SpendResult {
  ok: boolean;
  /** Wallet balance after the spend (or current balance when insufficient). */
  balance: number | null;
  /** True when the wallet could not cover the amount (vs. a system error). */
  insufficient: boolean;
}

// ─── Get Balance (auto-creates the wallet row) ──

export async function getBalance(restaurantId: string): Promise<number> {
  // Ensure a wallet row exists (ON CONFLICT DO NOTHING — never clobbers)
  await supabaseAdmin
    .from('credit_wallets')
    .upsert({ restaurant_id: restaurantId }, { onConflict: 'restaurant_id', ignoreDuplicates: true });

  const { data, error } = await supabaseAdmin
    .from('credit_wallets')
    .select('balance')
    .eq('restaurant_id', restaurantId)
    .single();

  if (error) {
    console.error('[CreditService] getBalance failed:', error.message);
    return 0;
  }
  return ((data as Record<string, unknown> | null)?.balance as number) || 0;
}

// ─── Add Credits (purchase / refund / bonus) ──

export async function addCredits(
  restaurantId: string,
  amount: number,
  reason: CreditReason,
  reference?: string | null
): Promise<number | null> {
  if (amount <= 0) return getBalance(restaurantId);

  const { data, error } = await supabaseAdmin.rpc('add_credits', {
    p_restaurant_id: restaurantId,
    p_amount: amount,
    p_reason: reason,
    p_reference: reference ?? null,
  });

  if (error) {
    console.error('[CreditService] add_credits failed:', error.message);
    return null;
  }
  return (data as number) ?? null;
}

// ─── Spend Credits (atomic via RPC, cannot overdraw) ──

export async function spendCredits(
  restaurantId: string,
  amount: number,
  reason: CreditReason,
  reference?: string | null
): Promise<SpendResult> {
  if (amount <= 0) return { ok: true, balance: await getBalance(restaurantId), insufficient: false };

  const { data, error } = await supabaseAdmin.rpc('spend_credits', {
    p_restaurant_id: restaurantId,
    p_amount: amount,
    p_reason: reason,
    p_reference: reference ?? null,
  });

  if (error) {
    if (error.message.includes('insufficient_credits')) {
      // Report the current balance so callers can show a helpful message
      return { ok: false, balance: await getBalance(restaurantId), insufficient: true };
    }
    console.error('[CreditService] spend_credits failed:', error.message);
    return { ok: false, balance: null, insufficient: false };
  }

  return { ok: true, balance: (data as number) ?? null, insufficient: false };
}

// ─── Has Sufficient ──────────────────────────

export async function hasSufficient(restaurantId: string, amount: number): Promise<boolean> {
  return (await getBalance(restaurantId)) >= amount;
}

// ─── Transaction History ─────────────────────

export async function getCreditHistory(restaurantId: string, limit = 50): Promise<CreditTransaction[]> {
  const { data, error } = await supabaseAdmin
    .from('credit_transactions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[CreditService] getCreditHistory failed:', error.message);
    return [];
  }
  return (data || []) as unknown as CreditTransaction[];
}

// ─── Fulfil a credits purchase (idempotent) ──
// Called from the Cashfree webhook and the payment
// return route. Atomic claim pending → completed
// (0 rows = already processed), then addCredits.

export async function fulfilCreditPurchase(
  cfOrderId: string
): Promise<{ ok: boolean; alreadyFulfilled: boolean; balancePaise?: number; restaurantId?: string }> {
  console.log(`[CreditService] Fulfilling credits purchase: ${cfOrderId}`);

  // Atomic state transition 'pending' → 'completed' (prevents webhook/return double-fulfilment)
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('payments')
    .update({ status: 'completed' })
    .eq('cashfree_order_id', cfOrderId)
    .eq('status', 'pending')
    .select();

  if (claimError) {
    console.error('[CreditService] Payment claim failed:', claimError.message);
    return { ok: false, alreadyFulfilled: false };
  }

  // No row updated — already processed (or unknown order). Confirm it exists.
  if (!claimed || claimed.length === 0) {
    const { data: existing } = await supabaseAdmin
      .from('payments')
      .select('id, status, restaurant_id, metadata')
      .eq('cashfree_order_id', cfOrderId)
      .single();

    if (!existing) {
      console.error(`[CreditService] Payment not found for ${cfOrderId}`);
      return { ok: false, alreadyFulfilled: false };
    }
    return { ok: true, alreadyFulfilled: true };
  }

  const payment = claimed[0] as {
    id: string;
    restaurant_id: string;
    metadata: { balance_paise?: number; pack_id?: string } | null;
  };
  const restaurantId = payment.restaurant_id;
  const balancePaise = payment.metadata?.balance_paise || 0;
  const packId = payment.metadata?.pack_id || null;

  if (balancePaise <= 0) {
    console.error(`[CreditService] Credits payment ${cfOrderId} has no balance in metadata`);
    // Revert so a fixed record can still be fulfilled
    await supabaseAdmin
      .from('payments')
      .update({ status: 'pending' })
      .eq('cashfree_order_id', cfOrderId);
    return { ok: false, alreadyFulfilled: false };
  }

  const balance = await addCredits(restaurantId, balancePaise, 'purchase', cfOrderId);
  if (balance === null) {
    console.error(`[CreditService] addCredits failed for ${cfOrderId} — reverting to pending`);
    await supabaseAdmin
      .from('payments')
      .update({ status: 'pending' })
      .eq('cashfree_order_id', cfOrderId);
    return { ok: false, alreadyFulfilled: false };
  }

  logActivity({
    restaurantId,
    actorType: 'system',
    action: 'credits.purchased',
    details: { balance_paise: balancePaise, pack_id: packId, cf_order_id: cfOrderId, balance_after: balance },
  });

  console.log(`[CreditService] Added ${formatPaise(balancePaise)} balance to ${restaurantId} (balance: ${formatPaise(balance)})`);
  return { ok: true, alreadyFulfilled: false, balancePaise, restaurantId };
}
