// ============================================
// AssistMint — Broadcast Messaging Service
// Send promotional messages to customer segments
// ============================================

import { createClient } from '@supabase/supabase-js';
import { sendTextMessage, sendImageMessage } from '@/lib/whatsapp/client';

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
  // Live customers columns are saved_name / whatsapp_name (no `name` column)
  let query = supabaseAdmin
    .from('customers')
    .select('id, phone, saved_name, whatsapp_name')
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
  return ((data || []) as Array<Record<string, string | null>>).map((c) => ({
    id: c.id || '',
    phone: c.phone || '',
    name: c.saved_name || c.whatsapp_name || null,
  }));
}

// ─── Send Broadcast ─────────────────────────

export async function sendBroadcast(
  broadcastId: string,
  restaurantId: string
): Promise<{ sent: number; failed: number; error: string | null }> {
  // Scope the fetch by restaurant_id — prevents cross-tenant broadcast leaks
  const { data: broadcast } = await supabaseAdmin
    .from('broadcasts')
    .select('*')
    .eq('id', broadcastId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!broadcast) return { sent: 0, failed: 0, error: 'Broadcast not found' };
  const bc = broadcast as unknown as Broadcast;

  // Status guard: only draft/failed broadcasts can be (re)sent
  if (bc.status === 'sending' || bc.status === 'sent') {
    return { sent: 0, failed: 0, error: `Broadcast is already ${bc.status}` };
  }

  // Get restaurant WhatsApp credentials (live column: whatsapp_access_token)
  const { data: restaurant } = await supabaseAdmin
    .from('restaurants')
    .select('whatsapp_access_token, whatsapp_phone_id')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return { sent: 0, failed: 0, error: 'Restaurant not found' };
  const rest = restaurant as Record<string, string>;
  if (!rest.whatsapp_access_token || !rest.whatsapp_phone_id) {
    return { sent: 0, failed: 0, error: 'WhatsApp not configured' };
  }

  // Atomically claim the broadcast: draft/failed → sending (prevents double-send races)
  const { data: claimed } = await supabaseAdmin
    .from('broadcasts')
    .update({ status: 'sending', updated_at: new Date().toISOString() })
    .eq('id', broadcastId)
    .in('status', ['draft', 'failed'])
    .select('id');
  if (!claimed || claimed.length === 0) {
    return { sent: 0, failed: 0, error: 'Broadcast is already being sent' };
  }

  // Get target customers
  const customers = await getTargetCustomers(restaurantId, bc.target_audience);

  await supabaseAdmin
    .from('broadcasts')
    .update({ total_recipients: customers.length })
    .eq('id', broadcastId);

  let sentCount = 0;
  let failedCount = 0;

  // Send via the shared WhatsApp client (number sanitization, retries, v25.0)
  for (const customer of customers) {
    try {
      if (bc.image_url) {
        await sendImageMessage({
          phoneNumberId: rest.whatsapp_phone_id,
          accessToken: rest.whatsapp_access_token,
          to: customer.phone,
          imageUrl: bc.image_url,
          caption: bc.message,
        });
      } else {
        await sendTextMessage({
          phoneNumberId: rest.whatsapp_phone_id,
          accessToken: rest.whatsapp_access_token,
          to: customer.phone,
          text: bc.message,
        });
      }
      sentCount++;
    } catch (err) {
      console.error(`[Broadcast] Failed to send to ${customer.phone}:`, err instanceof Error ? err.message : err);
      failedCount++;
    }
    // Rate limit: ~10 messages/second
    await new Promise((resolve) => setTimeout(resolve, 100));
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
