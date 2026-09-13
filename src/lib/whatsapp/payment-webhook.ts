// ============================================
// AssistMint — WhatsApp Payment Webhook
// Reconciles Meta payment status webhooks
// (value.payments) for in-chat UPI invoices
// (order_details messages): updates payments and
// orders, and sends the native order_status
// message that updates the invoice in place.
// ============================================

import { createClient } from '@supabase/supabase-js';
import { convertCartToOrder, type Cart, type CartItem } from '@/lib/services/cart-engine';
import { notifyOwnerNewOrder } from '@/lib/services/owner-notifications';
import { sendOrderStatusMessage } from '@/lib/whatsapp/payments';
import type { Restaurant } from '@/lib/services/restaurant-service';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const SUCCESS_STATUSES = ['completed', 'success', 'succeeded', 'paid', 'captured', 'authorized'];
const FAILURE_STATUSES = ['failed', 'cancelled', 'canceled', 'expired', 'rejected', 'dropped'];

interface PaymentRow {
  id: string;
  order_id: string | null;
  restaurant_id: string;
  amount: number | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Handle a Meta payment status webhook for an in-chat UPI invoice.
 *
 * @param referenceId  The reference_id of the order_details message (stored in
 *                     payments.metadata.in_chat_reference_id when the invoice
 *                     was sent) — or a Cashfree order id as fallback
 * @param paymentStatus Meta's payment status string (e.g. 'completed', 'failed')
 */
export async function handlePaymentWebhook(params: {
  restaurant: Restaurant;
  paymentStatus: string;
  referenceId: string;
}): Promise<void> {
  const { restaurant, paymentStatus, referenceId } = params;
  if (!referenceId) {
    console.warn('[PaymentWebhook] Payment status webhook without reference id — skipping');
    return;
  }

  const statusLower = (paymentStatus || '').toLowerCase();
  const isSuccess = SUCCESS_STATUSES.includes(statusLower);
  const isFailure = FAILURE_STATUSES.includes(statusLower);

  // ── Look up the payment by in-chat reference (or Cashfree order id) ──
  const { data: byRef } = await supabaseAdmin
    .from('payments')
    .select('id, order_id, restaurant_id, amount, metadata')
    .eq('metadata->>in_chat_reference_id', referenceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let payment = (byRef as PaymentRow | null) || null;
  if (!payment) {
    const { data: byCf } = await supabaseAdmin
      .from('payments')
      .select('id, order_id, restaurant_id, amount, metadata')
      .eq('cashfree_order_id', referenceId)
      .limit(1)
      .maybeSingle();
    payment = (byCf as PaymentRow | null) || null;
  }

  if (!payment) {
    console.warn(`[PaymentWebhook] No payment found for reference ${referenceId} — skipping`);
    return;
  }

  const paymentMeta = payment.metadata || {};

  // ── Update the payments row ──
  await supabaseAdmin
    .from('payments')
    .update({ status: isSuccess ? 'completed' : isFailure ? 'failed' : statusLower })
    .eq('id', payment.id);

  // ── Resolve / ensure the order ──
  let orderId = payment.order_id;

  if (isSuccess && !orderId && paymentMeta.cart_id) {
    // UPI-intent payment completed outside Cashfree — create the order from
    // the cart session now (mirrors processSuccessfulPayment in bot-payment.ts)
    try {
      const { data: cartData } = await supabaseAdmin
        .from('cart_sessions')
        .select('*')
        .eq('id', paymentMeta.cart_id as string)
        .single();

      const cData = cartData as
        | {
            id: string;
            restaurant_id: string;
            customer_id: string;
            items: CartItem[] | null;
            subtotal: number | string | null;
            coupon_code: string | null;
            discount: number | string | null;
            delivery_fee: number | string | null;
            tax: number | string | null;
            total: number | string | null;
          }
        | null;

      if (cData) {
        const cartObj: Cart = {
          id: cData.id,
          restaurant_id: cData.restaurant_id,
          customer_id: cData.customer_id,
          items: cData.items || [],
          subtotal: Number(cData.subtotal) || 0,
          coupon_code: cData.coupon_code || undefined,
          discount: Number(cData.discount) || 0,
          delivery_fee: Number(cData.delivery_fee) || 0,
          tax: Number(cData.tax) || 0,
          total: Number(cData.total) || 0,
        };
        orderId = await convertCartToOrder(cartObj, 'delivery', undefined, undefined, 'online');
        if (orderId) {
          await supabaseAdmin.from('payments').update({ order_id: orderId }).eq('id', payment.id);
          notifyOwnerNewOrder(restaurant.id, orderId).catch((e) =>
            console.error('[PaymentWebhook] Owner notification failed:', e)
          );
        }
      }
    } catch (e) {
      console.error('[PaymentWebhook] Cart→order conversion failed:', e);
    }
  }

  // ── Update the order status ──
  let customerPhone = (paymentMeta.customer_phone as string) || '';
  let orderNumber = '';
  if (orderId) {
    const orderUpdate: Record<string, unknown> = {
      payment_status: isSuccess ? 'paid' : isFailure ? 'failed' : 'pending',
      updated_at: new Date().toISOString(),
    };
    if (isSuccess) {
      orderUpdate.status = 'confirmed';
      orderUpdate.payment_method = 'upi_in_chat';
    }
    await supabaseAdmin.from('orders').update(orderUpdate).eq('id', orderId);

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('customer_phone, order_number')
      .eq('id', orderId)
      .single();
    const o = order as { customer_phone: string | null; order_number: string | number | null } | null;
    if (o) {
      customerPhone = o.customer_phone || customerPhone;
      orderNumber = o.order_number ? String(o.order_number) : '';
    }
  }

  // ── Send the native order_status message (updates the invoice in place) ──
  if ((isSuccess || isFailure) && restaurant.whatsapp_token && restaurant.whatsapp_phone_id) {
    if (!customerPhone) {
      console.warn(`[PaymentWebhook] No customer phone for reference ${referenceId} — skipping order_status send`);
      return;
    }
    try {
      await sendOrderStatusMessage({
        phoneNumberId: restaurant.whatsapp_phone_id,
        accessToken: restaurant.whatsapp_token,
        to: customerPhone,
        referenceId,
        status: isSuccess ? 'completed' : 'canceled',
        description: isSuccess
          ? `Payment received ✅${orderNumber ? ` Order #${orderNumber} confirmed.` : ''}`
          : 'Payment failed. Please try again or reply COD.',
        paymentStatus: isSuccess ? 'captured' : 'failed',
        paymentTimestamp: Math.floor(Date.now() / 1000),
        bodyText: isSuccess
          ? 'Payment received ✅ Your order is confirmed and being prepared!'
          : 'Payment failed ❌ Please try again or reply COD to pay on delivery.',
      });
      console.log(`[PaymentWebhook] order_status (${statusLower}) sent for reference ${referenceId}`);
    } catch (e) {
      console.error('[PaymentWebhook] Failed to send order_status message:', e);
    }
  }
}
