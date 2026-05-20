// ============================================
// AssistMint — Bot Payment Service
// Creates Cashfree payment links for WhatsApp
// (shareable URLs, no JS SDK needed)
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
 * Create a Cashfree payment link for WhatsApp bot orders.
 * Uses /pg/links API which returns a shareable URL (no JS SDK needed).
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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamint.in';

  // Try /pg/links API — returns a shareable payment URL for WhatsApp
  const paymentLink = await createPaymentLinkViaLinksAPI(
    clientId, clientSecret, cfOrderId, totalRupees,
    cleanPhone, customerName, appUrl
  );

  if (paymentLink) {
    console.log(`[BotPayment] Created payment link: ${paymentLink}`);

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
  }

  // Fallback: /pg/orders + build redirect page URL
  const fallbackLink = await createPaymentViaOrdersAPI(
    clientId, clientSecret, cfOrderId, totalRupees,
    orderId, cleanPhone, customerName, restaurantId, totalPaise, appUrl
  );

  return fallbackLink;
}

/**
 * PRIMARY: /pg/links API — returns a direct shareable URL
 */
async function createPaymentLinkViaLinksAPI(
  clientId: string,
  clientSecret: string,
  cfOrderId: string,
  totalRupees: number,
  customerPhone: string,
  customerName: string,
  appUrl: string
): Promise<string | null> {
  try {
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
        link_purpose: 'Order from AssistMint',
        link_notify: { send_sms: false, send_email: false },
        customer_details: {
          customer_name: customerName || 'Customer',
          customer_phone: customerPhone,
        },
        link_meta: {
          notify_url: `${appUrl}/api/webhooks/cashfree`,
          return_url: `${appUrl}/api/payments/return?order_id=${cfOrderId}`,
        },
        link_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[BotPayment] /pg/links failed:', JSON.stringify(result));
      return null;
    }

    return (result.link_url as string) || null;
  } catch (e) {
    console.error('[BotPayment] /pg/links error:', e);
    return null;
  }
}

/**
 * FALLBACK: /pg/orders API — creates order, builds a redirect page URL
 * since payment_session_id can't be used as a direct link
 */
async function createPaymentViaOrdersAPI(
  clientId: string,
  clientSecret: string,
  cfOrderId: string,
  totalRupees: number,
  orderId: string,
  customerPhone: string,
  customerName: string,
  restaurantId: string,
  totalPaise: number,
  appUrl: string
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
          customer_id: `cust_${customerPhone.slice(-10)}`,
          customer_name: customerName || 'Customer',
          customer_phone: customerPhone,
        },
        order_meta: {
          return_url: `${appUrl}/api/payments/return?order_id=${cfOrderId}`,
          notify_url: `${appUrl}/api/webhooks/cashfree`,
        },
        order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('[BotPayment] /pg/orders also failed:', JSON.stringify(result));
      return null;
    }

    const sessionId = result.payment_session_id as string;
    if (!sessionId) {
      console.error('[BotPayment] No payment_session_id in response');
      return null;
    }

    // Build a redirect page URL that loads Cashfree JS SDK and opens checkout
    const paymentPageUrl = `${appUrl}/pay?session=${encodeURIComponent(sessionId)}&order=${encodeURIComponent(cfOrderId)}`;

    console.log(`[BotPayment] Created fallback payment page: ${paymentPageUrl}`);

    await supabaseAdmin.from('orders').update({
      payment_id: cfOrderId,
      payment_status: 'pending',
      payment_link: paymentPageUrl,
    }).eq('id', orderId);

    await supabaseAdmin.from('payments').insert({
      restaurant_id: restaurantId,
      order_id: orderId,
      cashfree_order_id: cfOrderId,
      amount: totalPaise,
      status: 'pending',
      payment_link: paymentPageUrl,
    });

    return paymentPageUrl;
  } catch (e) {
    console.error('[BotPayment] Fallback payment failed:', e);
    return null;
  }
}
