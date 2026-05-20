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
          customer_phone: customerPhone.replace(/^\+/, ''),
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamint.in'}/api/payments/return?order_id=${cfOrderId}`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://assistmint.novamint.in'}/api/webhooks/cashfree`,
        },
        order_note: `Order from AssistMint`,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[BotPayment] Cashfree order creation failed:', result);
      return null;
    }

    const paymentLink = result.payment_link as string || null;

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
