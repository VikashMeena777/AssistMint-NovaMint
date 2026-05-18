// ============================================
// Payment Return URL handler
// After Cashfree payment, user is redirected here.
// Verify payment status and show result page.
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const CASHFREE_API_URL = process.env.NEXT_PUBLIC_CASHFREE_ENV === 'production'
  ? 'https://api.cashfree.com/pg'
  : 'https://sandbox.cashfree.com/pg';

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get('order_id') || '';

  if (!orderId) {
    return renderPage('error', 'Missing order ID', '');
  }

  // Verify payment with Cashfree
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;

  let paymentStatus = 'unknown';
  let amountPaid = '';

  if (clientId && clientSecret) {
    try {
      // First try as a payment link
      const linkRes = await fetch(`${CASHFREE_API_URL}/links/${orderId}`, {
        headers: {
          'x-api-version': process.env.CASHFREE_API_VERSION || '2023-08-01',
          'x-client-id': clientId,
          'x-client-secret': clientSecret,
        },
      });

      if (linkRes.ok) {
        const linkData = await linkRes.json();
        paymentStatus = linkData.link_status === 'PAID' ? 'paid' : linkData.link_status?.toLowerCase() || 'pending';
        amountPaid = `₹${linkData.link_amount_paid || linkData.link_amount || ''}`;
      } else {
        // Try as an order
        const orderRes = await fetch(`${CASHFREE_API_URL}/orders/${orderId}`, {
          headers: {
            'x-api-version': process.env.CASHFREE_API_VERSION || '2023-08-01',
            'x-client-id': clientId,
            'x-client-secret': clientSecret,
          },
        });

        if (orderRes.ok) {
          const orderData = await orderRes.json();
          paymentStatus = orderData.order_status === 'PAID' ? 'paid' : orderData.order_status?.toLowerCase() || 'pending';
          amountPaid = `₹${orderData.order_amount || ''}`;
        }
      }
    } catch (e) {
      console.error('[PaymentReturn] Verification error:', e);
    }
  }

  // Update DB if paid
  if (paymentStatus === 'paid') {
    // Update payments table
    await supabaseAdmin
      .from('payments')
      .update({ status: 'completed' })
      .eq('cashfree_order_id', orderId);

    // Update order directly by payment_id (the cfOrderId stored on the order)
    await supabaseAdmin
      .from('orders')
      .update({
        status: 'confirmed',
        payment_status: 'paid',
        updated_at: new Date().toISOString(),
      })
      .eq('payment_id', orderId);

    // Send WhatsApp payment confirmation — MUST await before returning (Vercel kills background tasks)
    try {
      await sendPaymentConfirmationWhatsApp(orderId, amountPaid);
    } catch (err) {
      console.error('[PaymentReturn] WhatsApp confirmation error:', err);
    }

    return renderPage('success', amountPaid, orderId);
  } else if (paymentStatus === 'pending' || paymentStatus === 'active') {
    return renderPage('pending', amountPaid, orderId);
  } else {
    return renderPage('failed', amountPaid, orderId);
  }
}

// ─── Send WhatsApp Payment Confirmation ─────
async function sendPaymentConfirmationWhatsApp(cfOrderId: string, amount: string) {
  // Look up the order and its restaurant
  const { data: order } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_phone, restaurant_id, total')
    .eq('payment_id', cfOrderId)
    .single();

  if (!order) return;

  // Get restaurant WhatsApp credentials
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('name, whatsapp_phone_id, whatsapp_access_token')
    .eq('id', order.restaurant_id)
    .single();

  if (!restaurant?.whatsapp_phone_id || !restaurant?.whatsapp_access_token) return;

  const phone = order.customer_phone;
  if (!phone) return;

  const totalRupees = amount || `₹${((order.total || 0) / 100).toFixed(0)}`;
  const msg = `✅ *Payment Received!*\n\n💰 Amount: ${totalRupees}\n📋 Order: #${order.order_number || '—'}\n\nYour order is *confirmed* and being prepared! 🍳\n\nThank you for ordering from *${restaurant.name}*! 🌿`;

  try {
    const waRes = await fetch(`https://graph.facebook.com/v21.0/${restaurant.whatsapp_phone_id}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${restaurant.whatsapp_access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: msg },
      }),
    });
    const waBody = await waRes.json();
    if (!waRes.ok) {
      console.error('[PaymentReturn] WhatsApp API error:', waRes.status, JSON.stringify(waBody));
    } else {
      console.log('[PaymentReturn] WhatsApp confirmation sent successfully to', phone);
    }
  } catch (err) {
    console.error('[PaymentReturn] Failed to send WhatsApp confirmation:', err);
  }

  // Also save to conversations table for dashboard visibility
  await supabaseAdmin.from('conversations').insert({
    restaurant_id: order.restaurant_id,
    customer_phone: phone,
    role: 'assistant',
    content: msg,
    message_type: 'text',
    metadata: { type: 'payment_confirmation', payment_id: cfOrderId },
  });
}

function renderPage(status: 'success' | 'pending' | 'failed' | 'error', amount: string, orderId: string) {
  const config = {
    success: {
      emoji: '✅',
      title: 'Payment Successful!',
      message: `Your payment of ${amount} has been received. Your order is confirmed and being prepared.`,
      color: '#10b981',
      bgColor: '#ecfdf5',
    },
    pending: {
      emoji: '⏳',
      title: 'Payment Processing',
      message: 'Your payment is being processed. You will receive a WhatsApp confirmation once complete.',
      color: '#f59e0b',
      bgColor: '#fffbeb',
    },
    failed: {
      emoji: '❌',
      title: 'Payment Failed',
      message: 'Your payment could not be completed. Please try again or choose Cash on Delivery.',
      color: '#ef4444',
      bgColor: '#fef2f2',
    },
    error: {
      emoji: '⚠️',
      title: 'Something went wrong',
      message: amount || 'We could not verify your payment. Please contact support.',
      color: '#6b7280',
      bgColor: '#f9fafb',
    },
  };

  const c = config[status];

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${c.title} — AssistMint</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .card {
      background: white;
      border-radius: 24px;
      padding: 48px 36px;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    }
    .icon {
      font-size: 64px;
      margin-bottom: 20px;
    }
    .status-badge {
      display: inline-block;
      background: ${c.bgColor};
      color: ${c.color};
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 6px 16px;
      border-radius: 100px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 12px;
    }
    .message {
      font-size: 15px;
      color: #64748b;
      line-height: 1.6;
      margin-bottom: 28px;
    }
    .order-id {
      font-size: 13px;
      color: #94a3b8;
      margin-bottom: 28px;
      font-family: monospace;
    }
    .btn {
      display: inline-block;
      background: #25D366;
      color: white;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 14px;
      text-decoration: none;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .footer {
      margin-top: 24px;
      font-size: 12px;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${c.emoji}</div>
    <div class="status-badge">${status === 'success' ? 'Payment Complete' : status === 'pending' ? 'Processing' : 'Failed'}</div>
    <h1>${c.title}</h1>
    <p class="message">${c.message}</p>
    ${orderId ? `<p class="order-id">Order: ${orderId}</p>` : ''}
    <a href="https://api.whatsapp.com/" class="btn">↩ Back to WhatsApp</a>
    <p class="footer">Powered by AssistMint</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html' },
  });
}
