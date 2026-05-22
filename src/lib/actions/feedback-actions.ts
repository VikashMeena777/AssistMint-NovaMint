// ============================================
// AssistMint — Feedback Server Actions
// Customer feedback & rating analytics
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';

// ─── Feedback Stats (rating distribution + averages) ─────

export async function getFeedbackStats(restaurantId: string) {
  const supabase = await createClient();

  // Get all rated orders
  const { data: ratedOrders } = await supabase
    .from('orders')
    .select('rating, feedback, created_at')
    .eq('restaurant_id', restaurantId)
    .gt('rating', 0)
    .order('created_at', { ascending: false });

  const all = ratedOrders || [];

  // Rating distribution (1-5)
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let totalRating = 0;

  for (const o of all) {
    const r = (o as Record<string, number>).rating;
    if (r >= 1 && r <= 5) {
      distribution[r] = (distribution[r] || 0) + 1;
      totalRating += r;
    }
  }

  const totalRatings = all.length;
  const avgRating = totalRatings > 0 ? +(totalRating / totalRatings).toFixed(1) : 0;

  // Positive (4-5 stars) vs negative (1-2 stars) percentage
  const positive = (distribution[4] || 0) + (distribution[5] || 0);
  const negative = (distribution[1] || 0) + (distribution[2] || 0);
  const positivePercent = totalRatings > 0 ? Math.round((positive / totalRatings) * 100) : 0;
  const negativePercent = totalRatings > 0 ? Math.round((negative / totalRatings) * 100) : 0;

  // Total orders (to calculate response rate)
  const { count: totalDelivered } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered');

  const responseRate = (totalDelivered || 0) > 0
    ? Math.round((totalRatings / (totalDelivered || 1)) * 100)
    : 0;

  return {
    avgRating,
    totalRatings,
    distribution,
    positivePercent,
    negativePercent,
    responseRate,
    totalDelivered: totalDelivered || 0,
  };
}

// ─── Recent Feedback (paginated, with customer info) ────

export async function getRecentFeedback(
  restaurantId: string,
  filters?: {
    ratingFilter?: number; // 0 = all, 1-5 = specific
    limit?: number;
    offset?: number;
  }
) {
  const supabase = await createClient();

  let query = supabase
    .from('orders')
    .select('id, order_number, rating, feedback, created_at, total, items, customers(saved_name, whatsapp_name, phone)', { count: 'exact' })
    .eq('restaurant_id', restaurantId)
    .gt('rating', 0)
    .order('created_at', { ascending: false });

  if (filters?.ratingFilter && filters.ratingFilter > 0) {
    query = query.eq('rating', filters.ratingFilter);
  }

  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return { error: error.message, data: null, count: 0 };
  return { data, error: null, count: count || 0 };
}
