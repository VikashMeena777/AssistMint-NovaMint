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

    // Verify webhook signature
    const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const payload = timestamp + body;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(payload)
        .digest('base64');

      if (signature !== expectedSignature) {
        console.error('[Cashfree Webhook] Signature verification failed');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Cashfree Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
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
  const orderId = data.order.order_id;
  const amount = data.payment.payment_amount;
  const paymentId = data.payment.cf_payment_id;
  const paymentMethod = data.payment.payment_method.upi
    ? `UPI (${data.payment.payment_method.upi.upi_id})`
    : 'Card';

  console.log(`[Cashfree] Payment SUCCESS: order=${orderId}, amount=₹${amount}`);

  // 1. Update order status to 'confirmed' and store payment details
  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      status: 'confirmed',
      payment_status: 'paid',
      payment_method: paymentMethod,
      payment_id: paymentId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (error) {
    console.error(`[Cashfree] Failed to update order ${orderId}:`, error.message);
  }

  // 2. Log activity
  const restaurantId = data.order.order_tags?.restaurant_id;
  if (restaurantId) {
    await supabaseAdmin.from('activity_log').insert({
      restaurant_id: restaurantId,
      actor_type: 'system',
      action: 'payment.received',
      entity_type: 'order',
      entity_id: orderId,
      details: { amount, payment_method: paymentMethod, cf_payment_id: paymentId },
    }).then(() => {});
  }
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
