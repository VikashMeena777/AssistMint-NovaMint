// ============================================
// AssistMint — Bot Payment Service
// Creates Cashfree payment links using admin
// access (no user session needed)
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const CASHFREE_API_URL = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

const CASHFREE_API_VERSION = process.env.CASHFREE_API_VERSION || '2023-08-01';

/**
 * Create a Cashfree payment link for an order (bot-side, no user session).
 * Returns payment link URL or null.
 */
export async function createBotPaymentLink(
  restaurantId: string,
  orderId: string,
  customerPhone: string,
  customerName: string,
  totalPaise: number
): Promise<string | null> {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[BotPayment] Cashfree credentials not configured');
    return null;
  }

  const totalRupees = totalPaise / 100;
  const cfOrderId = `AM-${orderId.slice(-8)}-${Date.now().toString(36)}`;
  const cleanPhone = customerPhone.replace(/^\+91/, '').replace(/^\+/, '');

  try {
    // Use Cashfree Payment Links API — returns a shareable URL
    const response = await fetch(`${CASHFREE_API_URL}/links`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
      },
      body: JSON.stringify({
        link_id: cfOrderId,
        link_amount: totalRupees,
        link_currency: 'INR',
        link_purpose: `Order from AssistMint`,
        link_notify: {
          send_sms: false,
          send_email: false,
        },
        customer_details: {
          customer_name: customerName || 'Customer',
          customer_phone: cleanPhone,
        },
        link_meta: {
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamint.in'}/api/webhooks/cashfree`,
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamint.in'}/api/payments/return?order_id=${cfOrderId}`,
        },
        link_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min expiry
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[BotPayment] Cashfree link creation failed:', JSON.stringify(result));

      // Fallback: try /orders API and build checkout URL
      return await createFallbackPaymentSession(
        clientId, clientSecret, cfOrderId, totalRupees,
        orderId, cleanPhone, customerName, restaurantId, totalPaise
      );
    }

    const paymentLink = (result.link_url as string) || null;
    console.log(`[BotPayment] Created payment link: ${paymentLink}`);

    // Save to orders table
    await supabaseAdmin
      .from('orders')
      .update({
        payment_id: cfOrderId,
        payment_status: 'pending',
        payment_link: paymentLink,
      })
      .eq('id', orderId);

    // Save to payments table
    await supabaseAdmin.from('payments').insert({
      restaurant_id: restaurantId,
      order_id: orderId,
      cashfree_order_id: cfOrderId,
      amount: totalPaise,
      status: 'pending',
      payment_link: paymentLink,
    });

    return paymentLink;
  } catch (error) {
    console.error('[BotPayment] Error creating payment link:', error);
    return null;
  }
}

/**
 * Fallback: Create order via /orders API and build checkout URL from session ID
 */
async function createFallbackPaymentSession(
  clientId: string,
  clientSecret: string,
  cfOrderId: string,
  totalRupees: number,
  orderId: string,
  customerPhone: string,
  customerName: string,
  restaurantId: string,
  totalPaise: number
): Promise<string | null> {
  try {
    const response = await fetch(`${CASHFREE_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': CASHFREE_API_VERSION,
        'x-client-id': clientId,
        'x-client-secret': clientSecret,
      },
      body: JSON.stringify({
        order_id: cfOrderId,
        order_amount: totalRupees,
        order_currency: 'INR',
        customer_details: {
          customer_id: orderId.slice(-12),
          customer_name: customerName || 'Customer',
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamint.in'}/api/payments/return?order_id=${cfOrderId}`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamint.in'}/api/webhooks/cashfree`,
        },
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[BotPayment] Fallback order also failed:', JSON.stringify(result));
      return null;
    }

    const sessionId = result.payment_session_id as string;
    // Build Cashfree hosted checkout URL
    const env = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production' ? '' : 'sandbox.';
    const paymentLink = `https://${env}cashfree.com/pg/view/order/${cfOrderId}?payment_session_id=${sessionId}`;

    // Save records
    await supabaseAdmin.from('orders').update({
      payment_id: cfOrderId,
      payment_status: 'pending',
      payment_link: paymentLink,
    }).eq('id', orderId);

    await supabaseAdmin.from('payments').insert({
      restaurant_id: restaurantId,
      order_id: orderId,
      cashfree_order_id: cfOrderId,
      amount: totalPaise,
      status: 'pending',
      payment_link: paymentLink,
    });

    return paymentLink;
  } catch (e) {
    console.error('[BotPayment] Fallback payment failed:', e);
    return null;
  }
}
