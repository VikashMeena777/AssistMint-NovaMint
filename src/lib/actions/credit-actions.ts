// ============================================
// AssistMint — Credit Server Actions
// Buy message credits via Cashfree (payment link,
// same pattern as bot-payment's createBotPaymentLink
// with per-restaurant creds or env fallback) +
// verification polling for the dashboard card.
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { getCreditPack } from '@/lib/utils/credit-packs';
import {
  getBalance,
  getCreditHistory,
  fulfilCreditPurchase,
  type CreditTransaction,
} from '@/lib/services/credit-service';

// 'use server' files may only export async functions. Do NOT re-export types
// from this file — the server-action compiler emits a runtime reference for
// type re-exports here and the chunk crashes with "CreditPack is not defined"
// (live incident 2026-09-13). Import types from
// '@/lib/services/credit-service' or '@/lib/utils/credit-packs' directly.

const CASHFREE_API_URL = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2023-08-01';

interface RestaurantCreds {
  clientId: string;
  clientSecret: string;
  name: string;
}

// ─── Ownership check ─────────────────────────

async function getOwnedRestaurant(
  supabase: Awaited<ReturnType<typeof createClient>>,
  restaurantId: string
): Promise<RestaurantCreds | null> {
  const { data } = await supabase
    .from('restaurants')
    .select('name, cashfree_client_id, cashfree_client_secret')
    .eq('id', restaurantId)
    .single();

  const r = data as Record<string, string | null> | null;
  if (!r) return null;

  return {
    clientId: r.cashfree_client_id || process.env.CASHFREE_CLIENT_ID || '',
    clientSecret: r.cashfree_client_secret || process.env.CASHFREE_CLIENT_SECRET || '',
    name: r.name || 'AssistMint Business',
  };
}

// ─── Buy Credits ─────────────────────────────

export async function buyCredits(
  restaurantId: string,
  packId: string
): Promise<{ link: string; cfOrderId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Ownership: the restaurant must belong to the caller
  const restaurant = await getOwnedRestaurant(supabase, restaurantId);
  if (!restaurant) return { error: 'Unauthorized' };

  const pack = getCreditPack(packId);
  if (!pack) return { error: 'Invalid credit pack.' };

  if (!restaurant.clientId || !restaurant.clientSecret) {
    return { error: 'Payments are not configured yet. Please try again later.' };
  }

  const cfOrderId = `CR_${restaurantId.substring(0, 8)}_${Date.now().toString(36)}`;
  const amountRupees = pack.pricePaise / 100;
  const cleanName = restaurant.name.replace(/[^\p{L}\p{N}\s.-]/gu, '').trim() || 'AssistMint Business';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamint.in';

  const headers = {
    'Content-Type': 'application/json',
    'x-api-version': CASHFREE_API_VERSION,
    'x-client-id': restaurant.clientId,
    'x-client-secret': restaurant.clientSecret,
  };

  try {
    // 1) Payment Links API — shareable URL (primary path)
    let link: string | null = null;
    const linkRes = await fetch(`${CASHFREE_API_URL}/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        link_id: cfOrderId,
        link_amount: amountRupees,
        link_currency: 'INR',
        link_purpose: `AssistMint message credits — ${pack.name} (${pack.credits.toLocaleString('en-IN')})`,
        link_notify: { send_sms: false, send_email: false },
        customer_details: {
          customer_name: cleanName,
          customer_phone: '9999999999',
        },
        link_meta: {
          notify_url: `${appUrl}/api/webhooks/cashfree`,
          return_url: `${appUrl}/api/payments/return?order_id=${cfOrderId}`,
        },
        link_expiry_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      }),
    });

    if (linkRes.ok) {
      const linkData = await linkRes.json();
      link = (linkData.link_url as string) || null;
    } else {
      const err = await linkRes.json().catch(() => null);
      console.error('[CreditActions] Cashfree link creation failed:', JSON.stringify(err));
    }

    // 2) Fallback: PG Orders API + hosted checkout URL
    if (!link) {
      const orderRes = await fetch(`${CASHFREE_API_URL}/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          order_id: cfOrderId,
          order_amount: amountRupees,
          order_currency: 'INR',
          order_note: `AssistMint message credits — ${pack.name}`,
          customer_details: {
            customer_id: user.id.substring(0, 50),
            customer_name: cleanName,
            customer_email: user.email || 'owner@assistmint.com',
            customer_phone: '9999999999',
          },
          order_meta: {
            return_url: `${appUrl}/api/payments/return?order_id=${cfOrderId}`,
            notify_url: `${appUrl}/api/webhooks/cashfree`,
          },
        }),
      });

      if (!orderRes.ok) {
        const err = await orderRes.json().catch(() => null);
        console.error('[CreditActions] Cashfree order fallback failed:', JSON.stringify(err));
        return { error: 'Payment initialization failed. Please try again.' };
      }

      const orderData = await orderRes.json();
      const sessionId = orderData.payment_session_id as string;
      const env = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? '' : 'sandbox.';
      link = `https://${env}cashfree.com/pg/view/order/${cfOrderId}?payment_session_id=${sessionId}`;
    }

    // 3) Record the pending purchase
    const { error: insertError } = await supabase.from('payments').insert({
      restaurant_id: restaurantId,
      cashfree_order_id: cfOrderId,
      amount: pack.pricePaise,
      status: 'pending',
      payment_link: link,
      metadata: {
        type: 'credits',
        pack_id: pack.id,
        credits: pack.credits,
      },
    });

    if (insertError) {
      console.error('[CreditActions] Failed to record pending credits payment:', insertError.message);
      return { error: 'Could not start the purchase. Please try again.' };
    }

    console.log(`[CreditActions] Created credits purchase link: ${cfOrderId}`);
    return { link, cfOrderId };
  } catch (error) {
    console.error('[CreditActions] Checkout error:', error);
    return { error: 'Something went wrong. Please try again.' };
  }
}

// ─── Verify Credits Payment (poll target) ────

export async function verifyCreditsPayment(
  restaurantId: string,
  cfOrderId: string
): Promise<{ success: boolean; pending?: boolean; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Ownership: payment must belong to the caller's restaurant
  const { data: payment } = await supabase
    .from('payments')
    .select('id, status, metadata')
    .eq('cashfree_order_id', cfOrderId)
    .eq('restaurant_id', restaurantId)
    .single();

  const p = payment as { status: string; metadata: { type?: string } | null } | null;
  if (!p) return { success: false, error: 'Payment not found.' };
  if (p.metadata?.type !== 'credits') return { success: false, error: 'Not a credits purchase.' };

  // Already fulfilled (webhook or return route beat us to it)
  if (p.status === 'completed') return { success: true };

  // Ask Cashfree whether the link/order is paid
  const restaurant = await getOwnedRestaurant(supabase, restaurantId);
  if (!restaurant) return { success: false, error: 'Unauthorized' };

  if (!restaurant.clientId || !restaurant.clientSecret) {
    return { success: false, pending: true };
  }

  const headers = {
    'x-api-version': CASHFREE_API_VERSION,
    'x-client-id': restaurant.clientId,
    'x-client-secret': restaurant.clientSecret,
  };

  try {
    // Try as a payment link first, then as an order (fallback path)
    const linkRes = await fetch(`${CASHFREE_API_URL}/links/${cfOrderId}`, { headers });
    if (linkRes.ok) {
      const linkData = await linkRes.json();
      if (linkData.link_status === 'PAID') {
        const result = await fulfilCreditPurchase(cfOrderId);
        return result.ok
          ? { success: true }
          : { success: false, error: 'Verification failed. Please contact support.' };
      }
      return { success: false, pending: true };
    }

    const orderRes = await fetch(`${CASHFREE_API_URL}/orders/${cfOrderId}`, { headers });
    if (orderRes.ok) {
      const orderData = await orderRes.json();
      if (orderData.order_status === 'PAID') {
        const result = await fulfilCreditPurchase(cfOrderId);
        return result.ok
          ? { success: true }
          : { success: false, error: 'Verification failed. Please contact support.' };
      }
    }

    return { success: false, pending: true };
  } catch (error) {
    console.error('[CreditActions] Verify error:', error);
    return { success: false, pending: true };
  }
}

// ─── Overview (balance + history) for the UI ──

export async function getCreditsOverview(
  restaurantId: string
): Promise<{ balance: number; transactions: CreditTransaction[] } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single();

  if (!data) return { error: 'Unauthorized' };

  const [balance, transactions] = await Promise.all([
    getBalance(restaurantId),
    getCreditHistory(restaurantId, 50),
  ]);

  return { balance, transactions };
}

// ─── Balance only (compact chip in campaigns) ──

export async function getCreditsBalance(restaurantId: string): Promise<number | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('restaurants')
    .select('id')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single();

  if (!data) return null;

  return getBalance(restaurantId);
}
