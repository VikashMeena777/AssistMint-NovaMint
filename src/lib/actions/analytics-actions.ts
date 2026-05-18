// ============================================
// AssistMint — Analytics Server Actions
// Dashboard KPIs + chart data
// ============================================

'use server';

import { createClient } from '@/lib/supabase/server';

// ─── Dashboard Overview Stats ───────────────

export async function getDashboardStats(restaurantId: string) {
  const supabase = await createClient();

  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date(now);
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // Total orders today
  const { count: todayOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('created_at', today.toISOString());

  // Total orders this week
  const { count: weekOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('created_at', weekAgo.toISOString());

  // Active orders (not delivered/cancelled)
  const { count: activeOrders } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending', 'confirmed', 'preparing', 'ready']);

  // Today's revenue
  const { data: todayRevenueData } = await supabase
    .from('orders')
    .select('total')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', today.toISOString());

  const todayRevenue = (todayRevenueData || []).reduce(
    (sum, o) => sum + ((o as Record<string, unknown>).total as number || 0),
    0
  );

  // Total customers
  const { count: totalCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId);

  // New customers this week
  const { count: newCustomers } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('created_at', weekAgo.toISOString());

  // Active conversations (last 24 hrs)
  const dayAgo = new Date(now);
  dayAgo.setDate(dayAgo.getDate() - 1);
  const { count: activeConversations } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .gte('last_message_at', dayAgo.toISOString());

  // Menu items count
  const { count: menuItems } = await supabase
    .from('menu_items')
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
    .eq('is_available', true);

  return {
    todayOrders: todayOrders || 0,
    weekOrders: weekOrders || 0,
    activeOrders: activeOrders || 0,
    todayRevenue,
    totalCustomers: totalCustomers || 0,
    newCustomers: newCustomers || 0,
    activeConversations: activeConversations || 0,
    menuItems: menuItems || 0,
  };
}

// ─── Order Trend (last 7 days) ──────────────

export async function getOrderTrend(restaurantId: string) {
  const supabase = await createClient();
  const days: { date: string; orders: number; revenue: number }[] = [];

  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date();
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const { data, count } = await supabase
      .from('orders')
      .select('total', { count: 'exact' })
      .eq('restaurant_id', restaurantId)
      .gte('created_at', dayStart.toISOString())
      .lt('created_at', dayEnd.toISOString());

    const revenue = (data || []).reduce(
      (sum, o) => sum + ((o as Record<string, unknown>).total as number || 0),
      0
    );

    days.push({
      date: dayStart.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
      orders: count || 0,
      revenue,
    });
  }

  return days;
}

// ─── Top Selling Items ──────────────────────

export async function getTopSellingItems(restaurantId: string, limit: number = 5) {
  const supabase = await createClient();

  // Get delivered orders from the last 30 days
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const { data: orders } = await supabase
    .from('orders')
    .select('items')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', monthAgo.toISOString());

  // Aggregate item quantities
  const itemMap = new Map<string, { name: string; count: number; revenue: number }>();

  for (const order of orders || []) {
    const items = (order as Record<string, unknown>).items as Array<Record<string, unknown>> || [];
    for (const item of items) {
      const name = item.item_name as string;
      const qty = (item.quantity as number) || 1;
      const price = (item.unit_price as number) || 0;

      const existing = itemMap.get(name) || { name, count: 0, revenue: 0 };
      existing.count += qty;
      existing.revenue += price * qty;
      itemMap.set(name, existing);
    }
  }

  return Array.from(itemMap.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

// ─── Recent Activity Feed ───────────────────

export async function getRecentActivity(restaurantId: string, limit: number = 20) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

// ─── Peak Hours Analysis ────────────────────

export async function getPeakHours(restaurantId: string) {
  const supabase = await createClient();

  // Get orders from last 30 days
  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  const { data: orders } = await supabase
    .from('orders')
    .select('created_at')
    .eq('restaurant_id', restaurantId)
    .gte('created_at', monthAgo.toISOString());

  // Count orders per hour
  const hourCounts = new Array(24).fill(0);
  for (const order of orders || []) {
    const hour = new Date((order as Record<string, string>).created_at).getHours();
    hourCounts[hour]++;
  }

  // Return as array of { hour: "9 AM", count: 12 }
  return hourCounts.map((count, hour) => ({
    hour: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
    count,
    hourNum: hour,
  }));
}

// ─── Average Order Value & Repeat Rate ──────

export async function getOrderInsights(restaurantId: string) {
  const supabase = await createClient();

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);

  // All delivered orders (last 30 days)
  const { data: orders } = await supabase
    .from('orders')
    .select('total, customer_id, rating')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'delivered')
    .gte('created_at', monthAgo.toISOString());

  const orderList = orders || [];

  // Average order value
  const totalRevenue = orderList.reduce(
    (sum, o) => sum + ((o as Record<string, number>).total || 0),
    0
  );
  const avgOrderValue = orderList.length > 0 ? Math.round(totalRevenue / orderList.length) : 0;

  // Repeat customer rate
  const customerOrders = new Map<string, number>();
  for (const order of orderList) {
    const custId = (order as Record<string, string>).customer_id;
    if (custId) {
      customerOrders.set(custId, (customerOrders.get(custId) || 0) + 1);
    }
  }
  const totalCustomers = customerOrders.size;
  const repeatCustomers = Array.from(customerOrders.values()).filter(c => c > 1).length;
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

  // Average rating
  const ratedOrders = orderList.filter(o => (o as Record<string, number>).rating > 0);
  const avgRating = ratedOrders.length > 0
    ? (ratedOrders.reduce((sum, o) => sum + ((o as Record<string, number>).rating || 0), 0) / ratedOrders.length).toFixed(1)
    : 'N/A';

  return {
    avgOrderValue, // in paise
    repeatRate,    // percentage
    avgRating,
    totalDelivered: orderList.length,
    repeatCustomers,
    totalCustomers,
  };
}
