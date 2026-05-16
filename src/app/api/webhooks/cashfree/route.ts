// ============================================
// Cashfree Webhook — Payment status updates
// Fully wired to Supabase for order updates
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    // Verify webhook signature — ALWAYS required
    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Cashfree Webhook] CRITICAL: CASHFREE_WEBHOOK_SECRET not configured');
      return NextResponse.json({ message: 'Server misconfigured' }, { status: 200 });
    }

    const payload = timestamp + body;
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('base64');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      console.error('[Cashfree Webhook] Signature verification failed');
      return NextResponse.json({ message: 'Invalid signature' }, { status: 200 });
    }

    const data = JSON.parse(body);
    const eventType = data.type;

    switch (eventType) {
      case 'PAYMENT_SUCCESS_WEBHOOK':
        await handlePaymentSuccess(data.data);
        break;

      case 'PAYMENT_FAILED_WEBHOOK':
        await handlePaymentFailed(data.data);
        break;

      case 'PAYMENT_USER_DROPPED_WEBHOOK':
        await handlePaymentDropped(data.data);
        break;

      case 'REFUND_STATUS_WEBHOOK':
        await handleRefundStatus(data.data);
        break;

      default:
        console.log(`[Cashfree Webhook] Unhandled event: ${eventType}`);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Cashfree Webhook] Error:', error);
    // Always return 200 to prevent Cashfree retry storms
    return NextResponse.json({ message: 'Error processed' }, { status: 200 });
  }
}

// ─── Handlers ───────────────────────────────

interface PaymentData {
  order: {
    order_id: string;
    order_amount: number;
    order_currency: string;
    order_tags?: { restaurant_id?: string };
  };
  payment: {
    cf_payment_id: string;
    payment_status: string;
    payment_amount: number;
    payment_method: {
      upi?: { upi_id: string };
      card?: { card_number: string };
    };
  };
  customer_details: {
    customer_id: string;
    customer_phone: string;
  };
}

async function handlePaymentSuccess(data: PaymentData) {
  const cfOrderId = data.order.order_id;
  const amount = data.payment.payment_amount;
  const paymentId = data.payment.cf_payment_id;
  const paymentMethod = data.payment.payment_method.upi
    ? `UPI (${data.payment.payment_method.upi.upi_id})`
    : 'Card';

  console.log(`[Cashfree] Payment SUCCESS: cf_order=${cfOrderId}, amount=₹${amount}`);

  // Find the payment record by cashfree_order_id
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('order_id, restaurant_id')
    .eq('cashfree_order_id', cfOrderId)
    .single();

  if (!payment) {
    console.error(`[Cashfree] No payment record found for cf_order=${cfOrderId}`);
    return;
  }

  const p = payment as Record<string, unknown>;
  const orderId = p.order_id as string;
  const restaurantId = p.restaurant_id as string;

  // Update order status
  await supabaseAdmin
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: paymentMethod,
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  // Update payment record
  await supabaseAdmin
    .from('payments')
    .update({ status: 'completed' })
    .eq('cashfree_order_id', cfOrderId);

  // Send WhatsApp confirmation to customer
  try {
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('customer_id, total')
      .eq('id', orderId)
      .single();

    if (order) {
      const o = order as Record<string, unknown>;
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('phone')
        .eq('id', o.customer_id as string)
        .single();

      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('whatsapp_phone_id, whatsapp_token, name')
        .eq('id', restaurantId)
        .single();

      if (customer && restaurant) {
        const c = customer as Record<string, unknown>;
        const r = restaurant as Record<string, unknown>;
        if (r.whatsapp_phone_id && r.whatsapp_token) {
          const { sendTextMessage } = await import('@/lib/whatsapp/client');
          const totalRupees = ((o.total as number) / 100).toFixed(0);
          await sendTextMessage({
            phoneNumberId: r.whatsapp_phone_id as string,
            accessToken: r.whatsapp_token as string,
            to: c.phone as string,
            text: `✅ *Payment Received!*\n\nAmount: ₹${totalRupees}\nMethod: ${paymentMethod}\n\nYour order is confirmed and being prepared! 🎉\n\n— ${r.name}`,
          });
        }
      }
    }
  } catch (e) {
    console.error('[Cashfree] Failed to send WhatsApp confirmation:', e);
  }

  // Log activity
  await supabaseAdmin.from('activity_log').insert({
    restaurant_id: restaurantId,
    actor_type: 'system',
    action: 'payment.received',
    details: { order_id: orderId, amount, payment_method: paymentMethod, cf_payment_id: paymentId },
  }).then(() => {});
}

async function handlePaymentFailed(data: PaymentData) {
  const orderId = data.order.order_id;
  console.log(`[Cashfree] Payment FAILED: order=${orderId}`);

  await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'failed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
}

async function handlePaymentDropped(data: PaymentData) {
  const orderId = data.order.order_id;
  console.log(`[Cashfree] Payment DROPPED: order=${orderId}`);

  await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'dropped',
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);
}

interface RefundData {
  refund: {
    refund_id: string;
    refund_amount: number;
    refund_status: string;
  };
  order: {
    order_id: string;
  };
}

async function handleRefundStatus(data: RefundData) {
  const orderId = data.order.order_id;
  const refundStatus = data.refund.refund_status;
  console.log(
    `[Cashfree] Refund ${refundStatus}: refund=${data.refund.refund_id}, amount=₹${data.refund.refund_amount}`
  );

  if (refundStatus === 'SUCCESS') {
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }
}
