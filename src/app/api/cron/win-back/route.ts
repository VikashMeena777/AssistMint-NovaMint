// ============================================
// AssistMint — Win-Back Campaign Cron
// GET /api/cron/win-back
// Auto-message inactive customers with offers
// Runs daily — targets customers inactive 30+ days
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
    // Get all restaurants with WhatsApp configured
    const { data: restaurants } = await supabaseAdmin
      .from('restaurants')
      .select('id, name, whatsapp_token, whatsapp_phone_id, business_type')
      .not('whatsapp_token', 'is', null)
      .not('whatsapp_phone_id', 'is', null);

    if (!restaurants || restaurants.length === 0) {
      return NextResponse.json({ message: 'No restaurants configured', count: 0 });
    }

    let totalSent = 0;

    for (const restaurant of restaurants) {
      const rest = restaurant as Record<string, string>;

      // Find customers inactive for 30-90 days (not too old, still reachable)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

      const { data: inactiveCustomers } = await supabaseAdmin
        .from('customers')
        .select('id, phone, name, total_orders, last_order_at')
        .eq('restaurant_id', rest.id)
        .eq('is_blocked', false)
        .gte('total_orders', 1) // Must have ordered at least once
        .lte('last_order_at', thirtyDaysAgo)
        .gte('last_order_at', ninetyDaysAgo)
        .limit(50); // Cap per restaurant per run

      if (!inactiveCustomers || inactiveCustomers.length === 0) continue;

      // Check if we already sent a win-back to these customers this month
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const { data: recentBroadcasts } = await supabaseAdmin
        .from('broadcasts')
        .select('id')
        .eq('restaurant_id', rest.id)
        .eq('target_audience', 'inactive')
        .eq('status', 'sent')
        .gte('sent_at', thisMonth.toISOString())
        .limit(1);

      // Skip if already sent a win-back this month
      if (recentBroadcasts && recentBroadcasts.length > 0) continue;

      const bt = rest.business_type || 'food_beverage';
      const messages = getWinBackMessage(rest.name, bt);

      for (const customer of inactiveCustomers) {
        const cust = customer as Record<string, unknown>;
        const phone = (cust.phone as string)?.replace(/\D/g, '');
        if (!phone) continue;

        const name = (cust.name as string) || '';
        const personalMsg = name
          ? messages.body.replace('{name}', name)
          : messages.body.replace('Hey {name}! ', '');

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
                  body: { text: personalMsg },
                  action: {
                    buttons: messages.buttons.map((b) => ({
                      type: 'reply',
                      reply: { id: b.id, title: b.title.substring(0, 20) },
                    })),
                  },
                },
              }),
            }
          );
          totalSent++;
        } catch {
          // Non-critical
        }

        // Rate limit: 10 messages/second
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      // Log as a broadcast
      await supabaseAdmin.from('broadcasts').insert({
        restaurant_id: rest.id,
        title: `Win-Back Campaign (Auto)`,
        message: messages.body.replace('{name}', 'Customer'),
        target_audience: 'inactive',
        total_recipients: inactiveCustomers.length,
        sent_count: totalSent,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      message: `Win-back campaign sent to ${totalSent} inactive customers`,
      count: totalSent,
    });
  } catch (error) {
    console.error('[Win-Back Cron] Error:', error);
    return NextResponse.json({ message: 'Error processed' }, { status: 200 });
  }
}

// ─── Win-Back Messages per Business Type ────

function getWinBackMessage(
  businessName: string,
  businessType: string
): {
  body: string;
  buttons: Array<{ id: string; title: string }>;
} {
  const templates: Record<string, { body: string; buttons: Array<{ id: string; title: string }> }> = {
    food_beverage: {
      body: `Hey {name}! 👋\n\nWe miss you at *${businessName}*! 🍕\n\nIt's been a while since your last order. Come back and enjoy something delicious — we've added new items to the menu! 🎉\n\nSend *menu* to see what's new!`,
      buttons: [
        { id: 'btn_menu', title: '📋 View Menu' },
        { id: 'btn_reorder', title: '🔄 Reorder Last' },
        { id: 'btn_help', title: '💬 Talk to Us' },
      ],
    },
    salon_spa: {
      body: `Hey {name}! 👋\n\nWe miss you at *${businessName}*! 💇\n\nIt's time for your next pampering session! Book today and feel amazing. ✨\n\nSend *book* to schedule your appointment!`,
      buttons: [
        { id: 'btn_menu', title: '💇 Services' },
        { id: 'btn_book_appointment', title: '📅 Book Now' },
        { id: 'btn_help', title: '💬 Talk to Us' },
      ],
    },
    healthcare: {
      body: `Hey {name}! 👋\n\nThis is a gentle reminder from *${businessName}* 🏥\n\nRegular check-ups are important! It's been a while since your last visit. Would you like to book an appointment?\n\nSend *book* to schedule!`,
      buttons: [
        { id: 'btn_menu', title: '👨‍⚕️ Our Doctors' },
        { id: 'btn_book_appointment', title: '📅 Book Now' },
        { id: 'btn_help', title: '💬 Talk to Us' },
      ],
    },
    education: {
      body: `Hey {name}! 👋\n\n*${businessName}* has exciting new courses! 📚\n\nWe've updated our curriculum with fresh content. Come explore what's new and keep learning! 🎓\n\nSend *menu* to see courses!`,
      buttons: [
        { id: 'btn_menu', title: '📋 Courses' },
        { id: 'btn_book_appointment', title: '📅 Book Demo' },
        { id: 'btn_help', title: '❓ Ask Question' },
      ],
    },
    retail: {
      body: `Hey {name}! 👋\n\nWe miss you at *${businessName}*! 🛍️\n\nWe've got fresh arrivals and exciting new products. Come check them out! ✨\n\nSend *menu* to browse!`,
      buttons: [
        { id: 'btn_menu', title: '🛍️ Browse New' },
        { id: 'btn_reorder', title: '🔄 Reorder' },
        { id: 'btn_help', title: '💬 Talk to Us' },
      ],
    },
    services: {
      body: `Hey {name}! 👋\n\nNeed any help around the house? *${businessName}* is here for you! 🔧\n\nBook a service today and we'll take care of the rest.\n\nSend *book* to schedule!`,
      buttons: [
        { id: 'btn_menu', title: '🔧 Services' },
        { id: 'btn_book_appointment', title: '📅 Book Now' },
        { id: 'btn_help', title: '💬 Talk to Us' },
      ],
    },
  };

  return templates[businessType] || templates.food_beverage;
}
