// ============================================
// AssistMint — In-Chat Payment Service
// When a Cashfree payment succeeds for an order
// that had a native in-chat UPI invoice
// (order_details message sent by the orchestrator
// when business_config.upi_vpa is configured),
// this updates the invoice in place with an
// order_status message.
// ============================================

import { createClient } from '@supabase/supabase-js';
import { sendOrderStatusMessage } from '@/lib/whatsapp/payments';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

/**
 * After a successful Cashfree payment: if an in-chat UPI invoice was sent for
 * this payment (flagged via payments.metadata.in_chat_invoice = true when the
 * orchestrator sent the order_details message), send the native order_status
 * message so the customer's invoice updates in place.
 *
 * Safe no-op when no in-chat invoice was used. Never throws.
 */
export async function sendInChatOrderStatusUpdate(
  cfOrderId: string,
  orderId: string
): Promise<void> {
  try {
    // 1. Find the payment row and check the in-chat invoice flag
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select('id, restaurant_id, metadata')
      .eq('cashfree_order_id', cfOrderId)
      .single();

    const p = payment as
      | { restaurant_id: string; metadata: Record<string, unknown> | null }
      | null;
    if (!p || !p.metadata?.in_chat_invoice) return;

    const referenceId = (p.metadata.in_chat_reference_id as string) || cfOrderId;

    // 2. Resolve restaurant WhatsApp credentials + the order/customer
    const { data: restaurant } = await supabaseAdmin
      .from('restaurants')
      .select('name, whatsapp_phone_id, whatsapp_access_token')
      .eq('id', p.restaurant_id)
      .single();
    const r = restaurant as
      | { name: string; whatsapp_phone_id: string | null; whatsapp_access_token: string | null }
      | null;
    if (!r?.whatsapp_phone_id || !r.whatsapp_access_token) return;

    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('customer_phone, order_number')
      .eq('id', orderId)
      .single();
    const o = order as
      | { customer_phone: string | null; order_number: string | number | null }
      | null;
    if (!o?.customer_phone) return;
    const orderNumber = o.order_number ? String(o.order_number) : '';

    // 3. Update the native invoice in place
    await sendOrderStatusMessage({
      phoneNumberId: r.whatsapp_phone_id,
      accessToken: r.whatsapp_access_token,
      to: o.customer_phone,
      referenceId,
      status: 'completed',
      description: `Payment received ✅${orderNumber ? ` Order #${orderNumber} confirmed.` : ''}`,
      paymentStatus: 'captured',
      paymentTimestamp: Math.floor(Date.now() / 1000),
      bodyText: `Payment received ✅ Your order from *${r.name}* is confirmed and being prepared! 🍳`,
    });

    console.log(`[InChatPayment] order_status sent for cf_order=${cfOrderId} ref=${referenceId}`);
  } catch (e) {
    console.error('[InChatPayment] Failed to send in-chat order status update:', e);
  }
}
