// ============================================
// AssistMint — Auto Review Collection Cron
// POST /api/cron/review-request
// After order delivered → ask for rating → Google Reviews
// ============================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendReplyButtons } from '@/lib/whatsapp/client';
import { spendCredits, addCredits } from '@/lib/services/credit-service';
import { MESSAGE_COSTS_PAISE } from '@/lib/utils/credit-packs';

export const maxDuration = 45;
export const dynamic = 'force-dynamic';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  // Verify CRON_SECRET — fail closed when unset
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Find orders delivered 1-2 hours ago that haven't been asked for review.
    // review_requested_at dedupes across runs (previously every run re-sent
    // for the whole hour window); delivered_at (not updated_at) avoids
    // re-opening the window when the row is touched for other reasons.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();

    const { data: orders } = await supabaseAdmin
      .from('orders')
      .select('id, customer_id, restaurant_id, total, rating')
      .eq('status', 'delivered')
      .is('rating', null)
      .is('review_requested_at', null)
      .gte('delivered_at', twoHoursAgo)
      .lte('delivered_at', oneHourAgo)
      .limit(50);

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: 'No orders to review', count: 0 });
    }

    let sent = 0;

    for (const order of orders) {
      const o = order as Record<string, unknown>;
      const orderId = o.id as string;

      const markRequested = () =>
        supabaseAdmin
          .from('orders')
          .update({ review_requested_at: new Date().toISOString() })
          .eq('id', orderId)
          .then(() => {});

      // Get customer phone (live columns: saved_name / whatsapp_name — no `name`)
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('phone')
        .eq('id', o.customer_id)
        .single();

      if (!customer) { await markRequested(); continue; }
      const cust = customer as Record<string, string>;

      // Get restaurant WhatsApp credentials + google_review_url (live column: whatsapp_access_token)
      const { data: restaurant } = await supabaseAdmin
        .from('restaurants')
        .select('name, whatsapp_access_token, whatsapp_phone_id, google_review_url')
        .eq('id', o.restaurant_id)
        .single();

      if (!restaurant) { await markRequested(); continue; }
      const rest = restaurant as Record<string, string>;
      if (!rest.whatsapp_access_token || !rest.whatsapp_phone_id || !cust.phone) {
        await markRequested();
        continue;
      }

      const bodyText = `⭐ *How was your experience?*\n\nWe'd love to hear your feedback on your recent order from *${rest.name}*!\n\nPlease rate us:`;

      const buttons = [
        { id: `rate_5_${orderId}`, title: '⭐⭐⭐⭐⭐ Great!' },
        { id: `rate_3_${orderId}`, title: '⭐⭐⭐ Okay' },
        { id: `rate_1_${orderId}`, title: '⭐ Poor' },
      ];

      // Business-initiated send: 1 credit per message. Skip this customer
      // when the restaurant's wallet can't cover it — other orders in this
      // run may belong to restaurants that still have credits.
      const spend = await spendCredits(o.restaurant_id as string, MESSAGE_COSTS_PAISE.utility, 'business_message', orderId);
      if (!spend.ok) {
        if (spend.insufficient) {
          console.log(`[Review Request Cron] Skipping order ${orderId}: insufficient credits (balance: ${spend.balance})`);
        } else {
          console.error(`[Review Request Cron] Credit spend failed for order ${orderId}`);
        }
        await markRequested();
        continue;
      }

      try {
        await sendReplyButtons({
          phoneNumberId: rest.whatsapp_phone_id,
          accessToken: rest.whatsapp_access_token,
          to: cust.phone,
          bodyText,
          buttons,
        });
        sent++;
      } catch (err) {
        console.error('[Review Request Cron] Send failed for order', orderId, err instanceof Error ? err.message : err);
        // The message never went out — give the credit back
        await addCredits(o.restaurant_id as string, MESSAGE_COSTS_PAISE.utility, 'refund', orderId);
      }

      // Mark requested regardless of send success — a hard-failed send
      // (bad token/blocked number) should not retry forever
      await markRequested();

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
