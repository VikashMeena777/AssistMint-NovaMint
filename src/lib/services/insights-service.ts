// ============================================
// AssistMint — AI Insights Service
// Smart business analytics & recommendations
// ============================================

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

// ─── Types ──────────────────────────────────

export interface Insight {
  id: string;
  icon: string;
  title: string;
  value: string;
  description: string;
  type: 'positive' | 'neutral' | 'warning';
}

// ─── Generate Insights ──────────────────────

export async function generateInsights(restaurantId: string): Promise<Insight[]> {
  const insights: Insight[] = [];
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();

  // 1. Total orders this month
  const { count: monthlyOrders } = await supabaseAdmin
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('created_at', thirtyDaysAgo);

  insights.push({
    id: 'monthly_orders',
    icon: '📦',
    title: 'Orders This Month',
    value: String(monthlyOrders || 0),
    description: `${monthlyOrders || 0} orders in the last 30 days`,
    type: (monthlyOrders || 0) > 10 ? 'positive' : 'neutral',
  });

  // 2. Revenue this month
  const { data: revenueData } = await supabaseAdmin
    .from('orders')
    .select('total')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', thirtyDaysAgo);

  const totalRevenue = (revenueData || []).reduce((sum, o) => {
    return sum + ((o as Record<string, number>).total || 0);
  }, 0);

  insights.push({
    id: 'monthly_revenue',
    icon: '💰',
    title: 'Revenue (30 days)',
    value: `₹${(totalRevenue / 100).toLocaleString('en-IN')}`,
    description: `From ${revenueData?.length || 0} delivered orders`,
    type: totalRevenue > 0 ? 'positive' : 'neutral',
  });

  // 3. Busiest day of the week
  const { data: weekOrders } = await supabaseAdmin
    .from('orders')
    .select('created_at')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', sixtyDaysAgo);

  if (weekOrders && weekOrders.length > 0) {
    const dayCount: Record<string, number> = {};
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    for (const order of weekOrders) {
      const day = dayNames[new Date((order as Record<string, string>).created_at).getDay()];
      dayCount[day] = (dayCount[day] || 0) + 1;
    }
    const busiestDay = Object.entries(dayCount).sort(([, a], [, b]) => b - a)[0];
    if (busiestDay) {
      insights.push({
        id: 'busiest_day',
        icon: '📅',
        title: 'Busiest Day',
        value: busiestDay[0],
        description: `${busiestDay[1]} orders on ${busiestDay[0]}s`,
        type: 'positive',
      });
    }
  }

  // 4. Top selling item
  const { data: orderItems } = await supabaseAdmin
    .from('order_items')
    .select('name, quantity')
    .in(
      'order_id',
      (await supabaseAdmin
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', thirtyDaysAgo)
      ).data?.map((o) => (o as Record<string, string>).id) || []
    );

  if (orderItems && orderItems.length > 0) {
    const itemCount: Record<string, number> = {};
    for (const item of orderItems) {
      const i = item as Record<string, unknown>;
      const name = i.name as string;
      itemCount[name] = (itemCount[name] || 0) + (i.quantity as number || 1);
    }
    const topItem = Object.entries(itemCount).sort(([, a], [, b]) => b - a)[0];
    if (topItem) {
      insights.push({
        id: 'top_item',
        icon: '🏆',
        title: 'Top Selling Item',
        value: topItem[0],
        description: `${topItem[1]} units sold this month`,
        type: 'positive',
      });
    }
  }

  // 5. New customers this week
  const { count: newCustomers } = await supabaseAdmin
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('created_at', sevenDaysAgo);

  insights.push({
    id: 'new_customers',
    icon: '👥',
    title: 'New Customers (7 days)',
    value: String(newCustomers || 0),
    description: `${newCustomers || 0} new customers joined this week`,
    type: (newCustomers || 0) > 0 ? 'positive' : 'neutral',
  });

  // 6. Average order value
  if (revenueData && revenueData.length > 0) {
    const avgOrder = totalRevenue / revenueData.length;
    insights.push({
      id: 'avg_order',
      icon: '📊',
      title: 'Avg Order Value',
      value: `₹${(avgOrder / 100).toFixed(0)}`,
      description: `Average across ${revenueData.length} orders`,
      type: avgOrder > 20000 ? 'positive' : 'neutral', // > ₹200
    });
  }

  // 7. Inactive customers warning
  const { count: inactiveCount } = await supabaseAdmin
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('total_orders', 1)
    .lte('last_order_at', thirtyDaysAgo);

  if ((inactiveCount || 0) > 0) {
    insights.push({
      id: 'inactive_customers',
      icon: '⚠️',
      title: 'Inactive Customers',
      value: String(inactiveCount),
      description: `${inactiveCount} customers haven't ordered in 30+ days. Send a win-back campaign!`,
      type: 'warning',
    });
  }

  // 8. Average rating
  const { data: ratedOrders } = await supabaseAdmin
    .from('orders')
    .select('rating')
    .eq('restaurant_id', restaurantId)
    .not('rating', 'is', null)
    .gte('created_at', sixtyDaysAgo);

  if (ratedOrders && ratedOrders.length > 0) {
    const avgRating = ratedOrders.reduce((sum, o) => sum + ((o as Record<string, number>).rating || 0), 0) / ratedOrders.length;
    insights.push({
      id: 'avg_rating',
      icon: '⭐',
      title: 'Average Rating',
      value: `${avgRating.toFixed(1)} / 5`,
      description: `Based on ${ratedOrders.length} customer ratings`,
      type: avgRating >= 4 ? 'positive' : avgRating >= 3 ? 'neutral' : 'warning',
    });
  }

  return insights;
}
