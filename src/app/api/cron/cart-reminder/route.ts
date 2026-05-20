// Abandoned Cart Reminder Cron
// Sends WhatsApp nudge to customers who left items in cart
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    // Find carts with items, updated 15min-2hrs ago, no reminder sent
    const { data: carts } = await supabaseAdmin
      .from('cart_sessions')
      .select('id, customer_id, restaurant_id, items, metadata')
      .not('items', 'eq', '[]')
      .lt('updated_at', fifteenMinsAgo)
      .gt('updated_at', twoHoursAgo);

    if (!carts || carts.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sent = 0;

    for (const cart of carts) {
      const metadata = (cart.metadata as Record<string, unknown>) || {};
      if (metadata.reminder_sent) continue;

      // Check no recent order exists
      const { count } = await supabaseAdmin
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', cart.customer_id)
        .eq('restaurant_id', cart.restaurant_id)
        .neq('status', 'cancelled')
        .gte('created_at', twoHoursAgo);

      if ((count || 0) > 0) continue; // Already ordered

      // Get customer phone
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('phone')
        .eq('id', cart.customer_id)
        .single();

      if (!customer?.phone) continue;

      // Get restaurant
      const { data: rest } = await supabaseAdmin
        .from('restaurants')
        .select('name, whatsapp_phone_id, whatsapp_access_token')
        .eq('id', cart.restaurant_id)
        .single();

      if (!rest?.whatsapp_phone_id || !rest?.whatsapp_access_token) continue;

      // Send reminder
      try {
        await fetch(`https://graph.facebook.com/v21.0/${rest.whatsapp_phone_id}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${rest.whatsapp_access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: customer.phone,
            type: 'text',
            text: { body: `🛒 You left items in your cart at *${rest.name}*!\nReady to complete your order? Send *cart* to see your items.` },
          }),
        });

        // Mark as sent
        await supabaseAdmin
          .from('cart_sessions')
          .update({ metadata: { ...metadata, reminder_sent: true } })
          .eq('id', cart.id);

        sent++;
      } catch { /* silent */ }
    }

    return NextResponse.json({ sent });
  } catch (e) {
    console.error('[CartReminder] Error:', e);
    return NextResponse.json({ error: 'Failed', sent: 0 }, { status: 200 });
  }
}
