// ============================================
// Cashfree Webhook — Payment status updates
// Fully wired to Supabase for order updates
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { webhookLimiter, checkRateLimit } from '@/lib/utils/rate-limiter';
import { processSuccessfulPayment } from '@/lib/services/bot-payment';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'anonymous';
    const rl = await checkRateLimit(webhookLimiter, `cf:${ip}`);
    if (!rl.success) {
      return NextResponse.json({ message: 'Rate limited' }, { status: 200 });
    }

    const body = await req.text();
    const signature = req.headers.get('x-webhook-signature') || '';
    const timestamp = req.headers.get('x-webhook-timestamp') || '';

    // Parse body early to determine which restaurant this payment belongs to
    let webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
    try {
      const parsedData = JSON.parse(body);
      const cfOrderId = parsedData?.data?.order?.order_id;
      if (cfOrderId) {
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('restaurant_id')
          .eq('cashfree_order_id', cfOrderId)
          .single();

        if (payment) {
          const { data: restaurant } = await supabaseAdmin
            .from('restaurants')
            .select('cashfree_webhook_secret')
            .eq('id', (payment as any).restaurant_id)
            .single();

          const r = restaurant as Record<string, any> | null;
          if (r?.cashfree_webhook_secret) {
            webhookSecret = r.cashfree_webhook_secret;
          }
        }
      }
    } catch (parseError) {
      console.error('[Cashfree Webhook] Failed to parse body or fetch dynamic secret:', parseError);
    }

    // Verify webhook signature — ALWAYS required
    if (!webhookSecret) {
      console.error('[Cashfree Webhook] CRITICAL: Webhook secret not configured');
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
  const paymentId = data.payment.cf_payment_id;
  const paymentMethod = data.payment.payment_method.upi
    ? `UPI (${data.payment.payment_method.upi.upi_id})`
    : 'Card';

  console.log(`[Cashfree] Payment SUCCESS: cf_order=${cfOrderId}`);

  await processSuccessfulPayment(cfOrderId, paymentMethod, paymentId);
}

async function handlePaymentFailed(data: PaymentData) {
  const cfOrderId = data.order.order_id;
  console.log(`[Cashfree] Payment FAILED: cf_order=${cfOrderId}`);

  // Fetch the payment record to see if order_id is present
  const { data: payment } = await supabaseAdmin
    .from('payments')
    .update({ status: 'failed' })
    .eq('cashfree_order_id', cfOrderId)
    .select('order_id')
    .single();

  const orderId = (payment as any)?.order_id;
  if (orderId) {
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }
}

async function handlePaymentDropped(data: PaymentData) {
  const cfOrderId = data.order.order_id;
  console.log(`[Cashfree] Payment DROPPED: cf_order=${cfOrderId}`);

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .update({ status: 'failed' })
    .eq('cashfree_order_id', cfOrderId)
    .select('order_id')
    .single();

  const orderId = (payment as any)?.order_id;
  if (orderId) {
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'dropped',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }
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
  const cfOrderId = data.order.order_id;
  const refundStatus = data.refund.refund_status;
  console.log(
    `[Cashfree] Refund ${refundStatus}: refund=${data.refund.refund_id}, amount=₹${data.refund.refund_amount}`
  );

  const { data: payment } = await supabaseAdmin
    .from('payments')
    .select('order_id')
    .eq('cashfree_order_id', cfOrderId)
    .single();

  const orderId = (payment as any)?.order_id;
  if (orderId && refundStatus === 'SUCCESS') {
    await supabaseAdmin
      .from('orders')
      .update({
        payment_status: 'refunded',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }
}
