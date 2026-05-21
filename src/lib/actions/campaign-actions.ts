// ============================================
// AssistMint — Campaign Server Actions
// Bulk WhatsApp messaging + scheduling
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';
import { checkPlanLimit, checkCampaignContactsLimit } from '@/lib/utils/enforce-limits';

// ─── Get Campaigns ──────────────────────────

export async function getCampaigns(restaurantId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Create Campaign ────────────────────────

export async function createCampaign(
  restaurantId: string,
  campaign: {
    name: string;
    message_template: string;
    target_audience: 'all' | 'active' | 'inactive' | 'vip' | 'custom';
    target_filters?: Record<string, unknown>;
    scheduled_at?: string;
    coupon_code?: string;
  }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // ── Plan limit check ──
  const limitCheck = await checkPlanLimit(restaurantId, 'campaigns');
  if (!limitCheck.allowed) return { error: limitCheck.message };

  // Count target audience
  let countQuery = supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('is_blocked', false);

  switch (campaign.target_audience) {
    case 'active':
      countQuery = countQuery.gte('total_orders', 1);
      break;
    case 'inactive': {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      countQuery = countQuery.lt('last_order_at', thirtyDaysAgo.toISOString());
      break;
    }
    case 'vip':
      countQuery = countQuery.in('loyalty_tier', ['gold', 'platinum']);
      break;
  }

  const { count: targetCount } = await countQuery;

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      restaurant_id: restaurantId,
      name: campaign.name,
      message_template: campaign.message_template,
      target_audience: campaign.target_audience,
      target_filters: campaign.target_filters || {},
      target_count: targetCount || 0,
      sent_count: 0,
      delivered_count: 0,
      read_count: 0,
      status: campaign.scheduled_at ? 'scheduled' : 'draft',
      scheduled_at: campaign.scheduled_at || null,
      coupon_code: campaign.coupon_code || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: campaign.scheduled_at ? ACTIONS.CAMPAIGN_SCHEDULED : 'campaign.created',
    details: { campaignName: campaign.name, targetCount },
  });

  revalidatePath('/dashboard/campaigns');
  return { data };
}

// ─── Send Campaign ──────────────────────────

export async function sendCampaign(restaurantId: string, campaignId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  // Get campaign
  const { data: campaign } = await supabase
    .from('campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (!campaign) return { error: 'Campaign not found' };
  const c = campaign as Record<string, unknown>;

  if (c.status === 'sent') return { error: 'Campaign already sent' };

  // Get restaurant WhatsApp config
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('whatsapp_phone_id, whatsapp_access_token, name')
    .eq('id', restaurantId)
    .single();

  if (!restaurant) return { error: 'Restaurant not found' };
  const r = restaurant as Record<string, unknown>;

  if (!r.whatsapp_phone_id || !r.whatsapp_access_token) {
    return { error: 'WhatsApp not configured. Go to Settings → WhatsApp.' };
  }

  // Build target query
  let targetQuery = supabase
    .from('customers')
    .select('phone, name')
    .eq('restaurant_id', restaurantId)
    .eq('is_blocked', false);

  switch (c.target_audience) {
    case 'active':
      targetQuery = targetQuery.gte('total_orders', 1);
      break;
    case 'inactive': {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      targetQuery = targetQuery.lt('last_order_at', thirtyDaysAgo.toISOString());
      break;
    }
    case 'vip':
      targetQuery = targetQuery.in('loyalty_tier', ['gold', 'platinum']);
      break;
  }

  const { data: customers } = await targetQuery;
  if (!customers || customers.length === 0) {
    return { error: 'No customers match the target audience' };
  }

  // ── Campaign contacts limit check ──
  const contactsCheck = await checkCampaignContactsLimit(restaurantId, customers.length);
  if (!contactsCheck.allowed) return { error: contactsCheck.message };

  // Send messages (with 1 second delay between each for rate limiting)
  const { sendTextMessage } = await import('@/lib/whatsapp/client');
  let sentCount = 0;
  const template = c.message_template as string;

  for (const cust of customers) {
    const customer = cust as Record<string, unknown>;
    try {
      const personalizedMessage = template
        .replace('{{name}}', (customer.name as string) || 'there')
        .replace('{{restaurant}}', r.name as string);

      await sendTextMessage({
        phoneNumberId: r.whatsapp_phone_id as string,
        accessToken: r.whatsapp_access_token as string,
        to: customer.phone as string,
        text: personalizedMessage,
      });
      sentCount++;

      // Rate limit: 1 msg/second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`[Campaign] Failed to send to ${customer.phone}:`, error);
    }
  }

  // Update campaign stats
  await supabase
    .from('campaigns')
    .update({
      status: 'sent',
      sent_count: sentCount,
      sent_at: new Date().toISOString(),
    })
    .eq('id', campaignId);

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: ACTIONS.CAMPAIGN_SENT,
    details: { campaignId, sentCount, totalTargeted: customers.length },
  });

  revalidatePath('/dashboard/campaigns');
  return { success: true, sentCount };
}

// ─── Delete Campaign ────────────────────────

export async function deleteCampaign(restaurantId: string, campaignId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', campaignId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/campaigns');
  return { success: true };
}

// ─── Get Campaign Stats ─────────────────────

export async function getCampaignStats(restaurantId: string) {
  const supabase = await createClient();

  const { count: total } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  const { count: sent } = await supabase
    .from('campaigns')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'sent');

  const { data: sentCampaigns } = await supabase
    .from('campaigns')
    .select('sent_count, delivered_count, read_count')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'sent');

  const totals = (sentCampaigns || []).reduce(
    (acc, c) => {
      const camp = c as Record<string, unknown>;
      return {
        totalSent: acc.totalSent + ((camp.sent_count as number) || 0),
        totalDelivered: acc.totalDelivered + ((camp.delivered_count as number) || 0),
        totalRead: acc.totalRead + ((camp.read_count as number) || 0),
      };
    },
    { totalSent: 0, totalDelivered: 0, totalRead: 0 }
  );

  return {
    total: total || 0,
    sent: sent || 0,
    ...totals,
  };
}
