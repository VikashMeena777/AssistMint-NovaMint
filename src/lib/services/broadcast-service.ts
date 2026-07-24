// ============================================
// AssistMint — Broadcast Messaging Service
// Send promotional messages to customer segments
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

export interface Broadcast {
  id: string;
  restaurant_id: string;
  title: string;
  message: string;
  image_url: string | null;
  target_audience: 'all' | 'active' | 'inactive' | 'vip';
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  scheduled_at: string | null;
  sent_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Create Broadcast ───────────────────────

export async function createBroadcast(data: {
  restaurant_id: string;
  title: string;
  message: string;
  image_url?: string;
  target_audience?: Broadcast['target_audience'];
  created_by?: string;
}): Promise<{ broadcast: Broadcast | null; error: string | null }> {
  const { data: result, error } = await supabaseAdmin
    .from('broadcasts')
    .insert({
      restaurant_id: data.restaurant_id,
      title: data.title,
      message: data.message,
      image_url: data.image_url || null,
      target_audience: data.target_audience || 'all',
      created_by: data.created_by || null,
    })
    .select()
    .single();

  if (error) return { broadcast: null, error: error.message };
  return { broadcast: result as unknown as Broadcast, error: null };
}

// ─── Get Broadcasts ─────────────────────────

export async function getBroadcasts(restaurantId: string): Promise<Broadcast[]> {
  const { data } = await supabaseAdmin
    .from('broadcasts')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(50);

  return (data || []) as unknown as Broadcast[];
}

// ─── Get Target Customers ───────────────────

export async function getTargetCustomers(
  restaurantId: string,
  audience: Broadcast['target_audience']
): Promise<Array<{ id: string; phone: string; name: string | null }>> {
  let query = supabaseAdmin
    .from('customers')
    .select('id, phone, name')
    .eq('restaurant_id', restaurantId)
    .eq('is_blocked', false);

  if (audience === 'active') {
    // Ordered in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    query = query.gte('last_order_at', thirtyDaysAgo.toISOString());
  } else if (audience === 'inactive') {
    // No order in last 60 days
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    query = query.or(`last_order_at.is.null,last_order_at.lt.${sixtyDaysAgo.toISOString()}`);
  } else if (audience === 'vip') {
    // 5+ orders
    query = query.gte('total_orders', 5);
  }

  const { data } = await query.limit(1000);
  return (data || []) as unknown as Array<{ id: string; phone: string; name: string | null }>;
}

// ─── Send Broadcast ─────────────────────────

export async function sendBroadcast(
  broadcastId: string,
  restaurantId: string
): Promise<{ sent: number; failed: number; error: string | null }> {
  // Get broadcast details
  const { data: broadcast } = await supabaseAdmin
    .from('broadcasts')
    .select('*')
    .eq('id', broadcastId)
    .single();

  if (!broadcast) return { sent: 0, failed: 0, error: 'Broadcast not found' };
  const bc = broadcast as unknown as Broadcast;

  // Get restaurant WhatsApp credentials
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('whatsapp_token, whatsapp_phone_id')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return { sent: 0, failed: 0, error: 'Restaurant not found' };
  const rest = restaurant as Record<string, string>;
  if (!rest.whatsapp_token || !rest.whatsapp_phone_id) {
    return { sent: 0, failed: 0, error: 'WhatsApp not configured' };
  }

  // Mark as sending
  await supabaseAdmin
    .from('broadcasts')
    .update({ status: 'sending' })
    .eq('id', broadcastId);

  // Get target customers
  const customers = await getTargetCustomers(restaurantId, bc.target_audience);

  await supabaseAdmin
    .from('broadcasts')
    .update({ total_recipients: customers.length })
    .eq('id', broadcastId);

  let sentCount = 0;
  let failedCount = 0;

  // Send messages (rate limited: 1 per 100ms)
  for (const customer of customers) {
    try {
      const phone = customer.phone.replace(/\D/g, '');
      if (!phone) { failedCount++; continue; }

      const body: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: bc.message },
      };

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${rest.whatsapp_phone_id}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${rest.whatsapp_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (response.ok) {
        sentCount++;
      } else {
        failedCount++;
      }

      // Rate limit: 10 messages/second
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch {
      failedCount++;
    }
  }

  // Update broadcast status
  await supabaseAdmin
    .from('broadcasts')
    .update({
      status: 'sent',
      sent_count: sentCount,
      failed_count: failedCount,
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', broadcastId);

  return { sent: sentCount, failed: failedCount, error: null };
}
