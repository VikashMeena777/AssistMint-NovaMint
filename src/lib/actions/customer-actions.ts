// ============================================
// AssistMint — Customer Server Actions
// Customer management for dashboard
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

// ─── Get Customers ──────────────────────────

export async function getCustomers(
  restaurantId: string,
  filters?: {
    search?: string;
    tier?: string;
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from('customers')
    .select('*', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('total_orders', { ascending: false });

  if (filters?.search) {
    query = query.or(`name.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
  }
  if (filters?.tier && filters.tier !== 'all') {
    query = query.eq('loyalty_tier', filters.tier);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return { error: error.message, data: null, count: 0 };
  return { data, error: null, count: count || 0 };
}

// ─── Get Single Customer ────────────────────

export async function getCustomer(restaurantId: string, customerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Block/Unblock Customer ─────────────────

export async function toggleCustomerBlock(
  restaurantId: string,
  customerId: string,
  block: boolean
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const { error } = await supabase
    .from('customers')
    .update({ is_blocked: block })
    .eq('id', customerId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: block ? ACTIONS.CUSTOMER_BLOCKED : ACTIONS.CUSTOMER_UNBLOCKED,
    details: { customerId },
  });

  revalidatePath('/dashboard/customers');
  return { success: true };
}

// ─── Update Customer Tags ───────────────────

export async function updateCustomerTags(
  restaurantId: string,
  customerId: string,
  tags: string[]
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('customers')
    .update({ tags })
    .eq('id', customerId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/customers');
  return { success: true };
}

// ─── Update Customer Notes ──────────────────

export async function updateCustomerNotes(
  restaurantId: string,
  customerId: string,
  notes: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('customers')
    .update({ notes })
    .eq('id', customerId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard/customers');
  return { success: true };
}

// ─── Get Customer Stats ─────────────────────

export async function getCustomerStats(restaurantId: string) {
  const supabase = await createClient();

  const { count: total } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  const { count: active } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('total_orders', 1);

  const { count: blocked } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('is_blocked', true);

  // Tier distribution
  const tiers = ['bronze', 'silver', 'gold', 'platinum'] as const;
  const tierCounts: Record<string, number> = {};
  for (const tier of tiers) {
    const { count } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('loyalty_tier', tier);
    tierCounts[tier] = count || 0;
  }

  return {
    total: total || 0,
    active: active || 0,
    blocked: blocked || 0,
    tierCounts,
  };
}
