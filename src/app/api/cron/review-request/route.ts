// ============================================
// AssistMint — Auto Review Collection Cron
// POST /api/cron/review-request
// After order delivered → ask for rating → Google Reviews
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 45;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  // Verify CRON_SECRET
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find orders delivered 1-2 hours ago that haven't been asked for review
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, restaurant_id, total, rating')
      .eq('status', 'delivered')
      .is('rating', null)
      .gte('updated_at', twoHoursAgo)
      .lte('updated_at', oneHourAgo)
      .limit(50);

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: 'No orders to review', count: 0 });
    }

    let sent = 0;

    for (const order of orders) {
      const o = order as Record<string, unknown>;

      // Get customer phone
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('phone, name')
        .eq('id', o.customer_id)
        .single();

      if (!customer) continue;
      const cust = customer as Record<string, string>;

      // Get restaurant WhatsApp credentials + google_review_url
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('name, whatsapp_token, whatsapp_phone_id, google_review_url')
        .eq('id', o.restaurant_id)
        .single();

      if (!restaurant) continue;
      const rest = restaurant as Record<string, string>;
      if (!rest.whatsapp_token || !rest.whatsapp_phone_id) continue;

      // Send rating request with buttons
      const phone = cust.phone?.replace(/\D/g, '');
      if (!phone) continue;

      const orderId = o.id as string;
      const bodyText = `⭐ *How was your experience?*\n\nWe'd love to hear your feedback on your recent order from *${rest.name}*!\n\nPlease rate us:`;

      const buttons = [
        { id: `rate_5_${orderId}`, title: '⭐⭐⭐⭐⭐ Great!' },
        { id: `rate_3_${orderId}`, title: '⭐⭐⭐ Okay' },
        { id: `rate_1_${orderId}`, title: '⭐ Poor' },
      ];

      try {
        await fetch(
          `https://graph.facebook.com/v21.0/${rest.whatsapp_phone_id}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${rest.whatsapp_token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: phone,
              type: 'interactive',
              interactive: {
                type: 'button',
                body: { text: bodyText },
                action: {
                  buttons: buttons.map((b) => ({
                    type: 'reply',
                    reply: { id: b.id, title: b.title.substring(0, 20) },
                  })),
                },
              },
            }),
          }
        );
        sent++;
      } catch {
        // Non-critical
      }

      // Rate limit
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    return NextResponse.json({
      message: `Sent ${sent} review requests`,
      count: sent,
    });
  } catch (error) {
    console.error('[Review Request Cron] Error:', error);
    return NextResponse.json({ message: 'Error processed' }, { status: 200 });
  }
}
