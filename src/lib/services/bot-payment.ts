// ============================================
// AssistMint — Bot Payment Service
// Creates Cashfree payment links using admin
// access (no user session needed)
// ============================================

import { createClient } from '@supabase/supabase-js';
import { convertCartToOrder, type Cart } from '@/lib/services/cart-engine';
import { notifyOwnerNewOrder } from '@/lib/services/owner-notifications';
import { sendTextMessage } from '@/lib/whatsapp/client';

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
 * Create a Cashfree payment link for an order or a cart session (bot-side, no user session).
 * Returns payment link URL or null.
 */
export async function createBotPaymentLink(
  restaurantId: string,
  orderId: string,
  customerPhone: string,
  customerName: string,
  totalPaise: number,
  isCart?: boolean
): Promise<string | null> {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[BotPayment] Cashfree credentials not configured');
    return null;
  }

  const totalRupees = totalPaise / 100;
  const cfOrderId = isCart
    ? `AM-C-${orderId.slice(-8)}-${Date.now().toString(36)}`
    : `AM-${orderId.slice(-8)}-${Date.now().toString(36)}`;
  const cleanPhone = customerPhone.replace(/^\+91/, '').replace(/^\+/, '');
  // Cashfree rejects names with emojis/special chars — strip them
  const cleanName = (customerName || 'Customer').replace(/[^\p{L}\p{N}\s.-]/gu, '').trim() || 'Customer';

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
          customer_name: cleanName,
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
        orderId, cleanPhone, customerName, restaurantId, totalPaise, isCart
      );
    }

    const paymentLink = (result.link_url as string) || null;
    console.log(`[BotPayment] Created payment link: ${paymentLink}`);

    if (isCart) {
      // Save metadata to cart session
      const { data: cartData } = await supabaseAdmin
        .from('cart_sessions')
        .select('metadata')
        .eq('id', orderId)
        .single();
      const currentMeta = (cartData as any)?.metadata || {};
      await supabaseAdmin
        .from('cart_sessions')
        .update({
          status: 'pending_payment',
          metadata: {
            ...currentMeta,
            payment_id: cfOrderId,
            payment_status: 'pending',
            payment_link: paymentLink,
          }
        })
        .eq('id', orderId);
    } else {
      // Save to orders table
      await supabaseAdmin
        .from('orders')
        .update({
          payment_id: cfOrderId,
          payment_status: 'pending',
          payment_link: paymentLink,
        })
        .eq('id', orderId);
    }

    // Save to payments table
    await supabaseAdmin.from('payments').insert({
      restaurant_id: restaurantId,
      order_id: isCart ? null : orderId,
      cashfree_order_id: cfOrderId,
      amount: totalPaise,
      status: 'pending',
      payment_link: paymentLink,
      metadata: isCart ? {
        cart_id: orderId,
        customer_phone: customerPhone,
        customer_name: customerName,
      } : null,
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
  totalPaise: number,
  isCart?: boolean
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
          customer_name: (customerName || 'Customer').replace(/[^\p{L}\p{N}\s.-]/gu, '').trim() || 'Customer',
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
    if (isCart) {
      const { data: cartData } = await supabaseAdmin
        .from('cart_sessions')
        .select('metadata')
        .eq('id', orderId)
        .single();
      const currentMeta = (cartData as any)?.metadata || {};
      await supabaseAdmin
        .from('cart_sessions')
        .update({
          status: 'pending_payment',
          metadata: {
            ...currentMeta,
            payment_id: cfOrderId,
            payment_status: 'pending',
            payment_link: paymentLink,
          }
        })
        .eq('id', orderId);
    } else {
      await supabaseAdmin.from('orders').update({
        payment_id: cfOrderId,
        payment_status: 'pending',
        payment_link: paymentLink,
      }).eq('id', orderId);
    }

    await supabaseAdmin.from('payments').insert({
      restaurant_id: restaurantId,
      order_id: isCart ? null : orderId,
      cashfree_order_id: cfOrderId,
      amount: totalPaise,
      status: 'pending',
      payment_link: paymentLink,
      metadata: isCart ? {
        cart_id: orderId,
        customer_phone: customerPhone,
        customer_name: customerName,
      } : null,
    });

    return paymentLink;
  } catch (e) {
    console.error('[BotPayment] Fallback payment failed:', e);
    return null;
  }
}

/**
 * Process a successful payment (idempotent atomic operation).
 * Handles cart-to-order dynamic conversion if no order exists yet.
 */
export async function processSuccessfulPayment(
  cfOrderId: string,
  paymentMethod: string,
  cfPaymentId?: string
): Promise<{ success: boolean; orderId: string | null }> {
  console.log(`[PaymentProcessor] Processing payment: ${cfOrderId}`);

  // Atomic state transition 'pending' -> 'completed' to prevent race conditions
  const { data: payments, error: updateError } = await supabaseAdmin
    .from('payments')
    .update({ status: 'completed' })
    .eq('cashfree_order_id', cfOrderId)
    .eq('status', 'pending')
    .select();

  if (updateError) {
    console.error('[PaymentProcessor] Error updating payment status:', updateError);
    return { success: false, orderId: null };
  }

  // If no row was updated, it was already processed (or doesn't exist)
  if (!payments || payments.length === 0) {
    console.log(`[PaymentProcessor] Payment already processed or not found for ${cfOrderId}`);
    // Fetch the existing order_id
    const { data: existingPayment } = await supabaseAdmin
      .from('payments')
      .select('order_id')
      .eq('cashfree_order_id', cfOrderId)
      .single();
    return {
      success: true,
      orderId: (existingPayment as any)?.order_id || null,
    };
  }

  const payment = payments[0] as Record<string, any>;
  let orderId = payment.order_id;
  const restaurantId = payment.restaurant_id;

  // If order_id is null, we need to dynamically convert cart to order!
  if (!orderId && payment.metadata?.cart_id) {
    const cartId = payment.metadata.cart_id;
    console.log(`[PaymentProcessor] Order does not exist. Creating dynamically from cart: ${cartId}`);

    // Retrieve the cart session
    const { data: cartData, error: cartError } = await supabaseAdmin
      .from('cart_sessions')
      .select('*')
      .eq('id', cartId)
      .single();

    if (cartError || !cartData) {
      console.error(`[PaymentProcessor] Failed to retrieve cart session: ${cartId}`, cartError);
      // Revert status to pending to allow retry
      await supabaseAdmin
        .from('payments')
        .update({ status: 'pending' })
        .eq('cashfree_order_id', cfOrderId);
      return { success: false, orderId: null };
    }

    const cData = cartData as Record<string, any>;
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

    // Convert cart to order (saves to DB and sets cart status to 'converted')
    orderId = await convertCartToOrder(cartObj, 'delivery', undefined, undefined, 'online');
    if (!orderId) {
      console.error(`[PaymentProcessor] Failed to convert cart to order: ${cartId}`);
      // Revert status to pending to allow retry
      await supabaseAdmin
        .from('payments')
        .update({ status: 'pending' })
        .eq('cashfree_order_id', cfOrderId);
      return { success: false, orderId: null };
    }

    // Save the created orderId back to the payments record
    await supabaseAdmin
      .from('payments')
      .update({ order_id: orderId })
      .eq('cashfree_order_id', cfOrderId);

    // Update customer stats
    const { updateCustomerOrderStats } = await import('@/lib/services/customer-service').catch(() => ({
      updateCustomerOrderStats: async (cid: string, total: number) => {}
    }));
    await updateCustomerOrderStats(cData.customer_id, cartObj.total).catch((e: any) => console.error('[PaymentProcessor] Failed to update customer order stats:', e));

    console.log(`[PaymentProcessor] Created order ${orderId} successfully from cart!`);
  }

  if (orderId) {
    // Re-verify/update order details
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        payment_method: paymentMethod,
        payment_id: cfPaymentId || cfOrderId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // Send WhatsApp confirmation to customer
    try {
      const { data: order } = await supabaseAdmin
        .from('orders')
        .select('customer_id, total, order_number')
        .eq('id', orderId)
        .single();

      if (order) {
        const o = order as Record<string, any>;
        const { data: customer } = await supabaseAdmin
          .from('customers')
          .select('phone')
          .eq('id', o.customer_id)
          .single();

        const { data: restaurant } = await supabaseAdmin
          .from('restaurants')
          .select('id, name, whatsapp_phone_id, whatsapp_access_token')
          .eq('id', restaurantId)
          .single();

        if (customer && restaurant) {
          const c = customer as Record<string, any>;
          const r = restaurant as Record<string, any>;
          if (r.whatsapp_phone_id && r.whatsapp_access_token) {
            const totalRupees = ((o.total || 0) / 100).toFixed(0);

            // 1. Send the payment received confirmation
            await sendTextMessage({
              phoneNumberId: r.whatsapp_phone_id,
              accessToken: r.whatsapp_access_token,
              to: c.phone,
              text: `✅ *Payment Received!*\n\n💰 Amount: ₹${totalRupees}\n📋 Order: #${o.order_number || '—'}\n\nYour order is *confirmed* and being prepared! 🍳\n\nThank you for ordering from *${r.name}*! 🌿`,
            });

            // 2. Generate and send receipt (fire-and-forget/non-blocking)
            try {
              const { sendOrderReceipt } = await import('@/lib/ai/orchestrator');
              const restaurantObj = {
                id: r.id,
                name: r.name,
                whatsapp_phone_id: r.whatsapp_phone_id,
                whatsapp_token: r.whatsapp_access_token,
              } as any;
              sendOrderReceipt(restaurantObj, orderId, c.phone).catch((e: any) => console.error('[PaymentProcessor] Receipt send failed:', e));
            } catch (receiptErr) {
              console.error('[PaymentProcessor] Receipt send failed:', receiptErr);
            }
          }
        }
      }
    } catch (e) {
      console.error('[PaymentProcessor] Failed to send WhatsApp confirmation:', e);
    }

    // Notify the restaurant owner
    try {
      await notifyOwnerNewOrder(restaurantId, orderId);
      console.log(`[PaymentProcessor] Owner notified for order ${orderId}`);
    } catch (e) {
      console.error('[PaymentProcessor] Failed to notify owner:', e);
    }

    // Log activity
    try {
      await supabaseAdmin.from('activity_log').insert({
        restaurant_id: restaurantId,
        actor_type: 'system',
        action: 'payment.received',
        details: { order_id: orderId, amount: payment.amount, payment_method: paymentMethod, cf_payment_id: cfPaymentId || cfOrderId },
      });
    } catch (e) {
      console.error('[PaymentProcessor] Failed to log activity:', e);
    }
  }

  return { success: true, orderId };
}
