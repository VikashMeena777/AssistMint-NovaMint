// ============================================
// AssistMint — Order Server Actions
// Order management for dashboard
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logActivity, ACTIONS } from '@/lib/utils/activity-logger';

// ─── Get Orders ─────────────────────────────

export async function getOrders(
  restaurantId: string,
  filters?: {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }
) {
  const supabase = await createClient();
  let query = supabase
    .from('orders')
    .select('*, customers(name, phone)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status);
  }
  if (filters?.search) {
    query = query.ilike('order_number', `%${filters.search}%`);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return { error: error.message, data: null, count: 0 };
  return { data, error: null, count: count || 0 };
}

// ─── Get Single Order ───────────────────────

export async function getOrder(restaurantId: string, orderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('orders')
    .select('*, customers(name, phone, email)')
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId)
    .single();

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Update Order Status ────────────────────

export async function updateOrderStatus(
  restaurantId: string,
  orderId: string,
  status: 'confirmed' | 'preparing' | 'ready' | 'out_for_delivery' | 'delivered' | 'cancelled'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };

  const updates: Record<string, unknown> = { status };

  // Set timestamps based on status
  switch (status) {
    case 'confirmed':
      updates.confirmed_at = new Date().toISOString();
      break;
    case 'preparing':
      updates.preparing_at = new Date().toISOString();
      break;
    case 'ready':
      updates.ready_at = new Date().toISOString();
      break;
    case 'delivered':
      updates.delivered_at = new Date().toISOString();
      break;
    case 'cancelled':
      updates.cancelled_at = new Date().toISOString();
      break;
  }

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)
    .eq('restaurant_id', restaurantId);

  if (error) return { error: error.message };

  // Map status to action
  const actionMap: Record<string, string> = {
    confirmed: ACTIONS.ORDER_CONFIRMED,
    preparing: ACTIONS.ORDER_PREPARING,
    ready: ACTIONS.ORDER_READY,
    delivered: ACTIONS.ORDER_DELIVERED,
    cancelled: ACTIONS.ORDER_CANCELLED,
  };

  logActivity({
    restaurantId,
    actorType: 'owner',
    actorId: user.id,
    action: actionMap[status] || status,
    details: { orderId, newStatus: status },
  });

  revalidatePath('/dashboard/orders');
  return { success: true };
}

// ─── Get Order Stats ────────────────────────

export async function getOrderStats(restaurantId: string) {
  const supabase = await createClient();

  // Get counts by status
  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'] as const;
  const counts: Record<string, number> = {};

  for (const status of statuses) {
    const { count } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('status', status);
    counts[status] = count || 0;
  }

  // Today's revenue
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', today.toISOString());

  const todayRevenue = (todayOrders || []).reduce(
    (sum, o) => sum + ((o as Record<string, unknown>).total as number || 0),
    0
  );

  return { counts, todayRevenue, totalActive: counts.pending + counts.confirmed + counts.preparing + counts.ready };
}
