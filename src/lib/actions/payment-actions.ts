// ============================================
// AssistMint — Payment Server Actions
// Cashfree payment link generation + management
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

const CASHFREE_API_URL = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2023-08-01';

// ─── Create Payment Link for Order ──────────

export async function createPaymentLink(
  restaurantId: string,
  orderId: string
) {
  const supabase = await createClient();

  // Get order details
  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(saved_name, whatsapp_name, phone, email)')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!order) return { error: 'Order not found' };

  const o = order as Record<string, unknown>;
  const customer = o.customers as Record<string, unknown> | null;
  const totalAmount = (o.total as number) / 100; // Convert paise to rupees

  // Generate unique order ID for Cashfree
  const cfOrderId = `AM-${(o.order_number as string || orderId).slice(-8)}-${Date.now().toString(36)}`;

  try {
    const response = await fetch(`${CASHFREE_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': process.env.CASHFREE_CLIENT_ID || '',
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET || '',
      },
      body: JSON.stringify({
        order_id: cfOrderId,
        order_amount: totalAmount,
        order_currency: 'INR',
        customer_details: {
          customer_id: o.customer_id as string,
          customer_name: (customer?.saved_name as string) || (customer?.whatsapp_name as string) || 'Customer',
          customer_phone: (customer?.phone as string) || '',
          customer_email: (customer?.email as string) || undefined,
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/return?order_id=${cfOrderId}`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/cashfree`,
        },
        order_note: `Order from AssistMint - ${o.order_number}`,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[Cashfree] Create order failed:', result);
      return { error: result.message || 'Payment creation failed' };
    }

    // Save payment link to order
    await supabase
      .from('orders')
      .update({
        payment_id: cfOrderId,
        payment_status: 'pending',
        payment_link: result.payment_link || null,
      })
      .eq('id', orderId);

    // Also save to payments table
    await supabase.from('payments').insert({
      restaurant_id: restaurantId,
      order_id: orderId,
      cashfree_order_id: cfOrderId,
      amount: o.total_amount as number,
      status: 'pending',
      payment_link: result.payment_link || null,
    });

    revalidatePath('/dashboard/orders');
    revalidatePath('/dashboard/payments');

    return {
      paymentLink: result.payment_link as string,
      paymentSessionId: result.payment_session_id as string,
      cfOrderId,
    };
  } catch (error) {
    console.error('[Cashfree] Error:', error);
    return { error: 'Failed to connect to payment gateway' };
  }
}

// ─── Get Payments ───────────────────────────

export async function getPayments(
  restaurantId: string,
  filters?: {
    status?: string;
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from('payments')
    .select('*, orders(order_number, customer_id)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return { error: error.message, data: null, count: 0 };
  return { data, error: null, count: count || 0 };
}

// ─── Get Payment Stats ──────────────────────

export async function getPaymentStats(restaurantId: string) {
  const supabase = await createClient();

  // Total revenue (completed payments)
  const { data: completed } = await supabase
    .from('payments')
    .select('amount')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'completed');

  const totalRevenue = (completed || []).reduce(
    (sum, p) => sum + ((p as Record<string, unknown>).amount as number || 0),
    0
  );

  // Today's revenue
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'completed')
    .gte('created_at', today.toISOString());

  const todayRevenue = (todayPayments || []).reduce(
    (sum, p) => sum + ((p as Record<string, unknown>).amount as number || 0),
    0
  );

  // Pending count
  const { count: pendingCount } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'pending');

  return {
    totalRevenue,
    todayRevenue,
    pendingCount: pendingCount || 0,
  };
}

// ─── Send Payment Link via WhatsApp ─────────

export async function sendPaymentLinkToCustomer(
  restaurantId: string,
  orderId: string
) {
  const supabase = await createClient();

  // Get order with payment link and customer phone
  const { data: order } = await supabase
    .from('orders')
    .select('*, customers(phone)')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!order) return { error: 'Order not found' };

  const o = order as Record<string, unknown>;
  const customer = o.customers as Record<string, unknown> | null;
  const paymentLink = o.payment_link as string;

  if (!paymentLink) {
    return { error: 'No payment link generated yet' };
  }

  if (!customer?.phone) {
    return { error: 'Customer phone not found' };
  }

  // Get restaurant WhatsApp config
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('whatsapp_phone_id, whatsapp_token, name')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return { error: 'Restaurant not found' };

  const r = restaurant as Record<string, unknown>;
  if (!r.whatsapp_phone_id || !r.whatsapp_token) {
    return { error: 'WhatsApp not configured' };
  }

  // Import and send
  const { sendTextMessage } = await import('@/lib/whatsapp/client');
  const totalAmount = ((o.total as number) / 100).toFixed(2);

  await sendTextMessage({
    phoneNumberId: r.whatsapp_phone_id as string,
    accessToken: r.whatsapp_token as string,
    to: customer.phone as string,
    text: `💳 *Payment Request*\n\nOrder: #${o.order_number}\nAmount: ₹${totalAmount}\n\nPay securely here: ${paymentLink}\n\nThank you! 🌿`,
  });

  logActivity({
    restaurantId,
    actorType: 'owner',
    action: ACTIONS.PAYMENT_RECEIVED,
    details: { orderId, paymentLink },
  });

  return { success: true };
}
