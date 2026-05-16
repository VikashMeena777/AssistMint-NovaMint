"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Users,
  ShoppingCart,
  CreditCard,
  Loader2,
  Activity,
  UtensilsCrossed,
} from "lucide-react";
import {
  getDashboardStats,
  getOrderTrend,
  getTopSellingItems,
  getRecentActivity,
} from "@/lib/actions/analytics-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [stats, setStats] = useState<AnyData>({});
  const [trend, setTrend] = useState<AnyData[]>([]);
  const [topItems, setTopItems] = useState<AnyData[]>([]);
  const [activity, setActivity] = useState<AnyData[]>([]);

  useEffect(() => {
    (async () => {
      const r = await getCurrentRestaurant();
      if (r?.id) setRestaurantId(r.id as string);
      else setLoading(false);
    })();
  }, []);

  const loadData = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [s, t, ti, a] = await Promise.all([
      getDashboardStats(restaurantId),
      getOrderTrend(restaurantId),
      getTopSellingItems(restaurantId, 5),
      getRecentActivity(restaurantId, 10),
    ]);
    setStats(s);
    setTrend(t);
    setTopItems(ti);
    setActivity(a.data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Find max revenue for the bar chart scaling
  const maxRevenue = Math.max(...trend.map((d) => d.revenue || 0), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Insights into orders, revenue, customers, and AI performance.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-1.5 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Last 7 days</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{stats.todayOrders || 0}</p>
          <p className="text-sm text-muted-foreground">Total Orders (Today)</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.weekOrders || 0} this week</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">₹{(stats.todayRevenue || 0).toLocaleString("en-IN")}</p>
          <p className="text-sm text-muted-foreground">Revenue (Today)</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.activeOrders || 0} active orders</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{stats.totalCustomers || 0}</p>
          <p className="text-sm text-muted-foreground">Customers</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.newCustomers || 0} new this week</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold">{stats.activeConversations || 0}</p>
          <p className="text-sm text-muted-foreground">AI Conversations</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.menuItems || 0} menu items live</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Trend (simple bar chart) */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Revenue Trend (7 Days)</h3>
          {trend.length > 0 && trend.some((d) => d.revenue > 0) ? (
            <div className="flex items-end gap-2 h-48">
              {trend.map((day, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    ₹{(day.revenue || 0).toLocaleString("en-IN")}
                  </span>
                  <div
                    className="w-full rounded-t-lg bg-primary/80 transition-all min-h-[4px]"
                    style={{
                      height: `${Math.max(((day.revenue || 0) / maxRevenue) * 150, 4)}px`,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {day.date}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl bg-muted/30 border border-dashed border-border">
              <div className="text-center">
                <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Chart data will appear once you have orders
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Top Menu Items */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h3 className="text-sm font-semibold mb-4">Top Menu Items</h3>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-muted/30 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{item.count} sold</p>
                    <p className="text-xs text-muted-foreground">
                      ₹{(item.revenue || 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl bg-muted/30 border border-dashed border-border">
              <div className="text-center">
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No data yet — start receiving orders
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
        <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
        {activity.length > 0 ? (
          <div className="space-y-2">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/20 transition-colors"
              >
                <Activity className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.action}</p>
                  <p className="text-xs text-muted-foreground">
                    {a.actor_type} ·{" "}
                    {new Date(a.created_at).toLocaleString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No activity logged yet. Actions will appear here as they happen.
          </p>
        )}
      </div>
    </div>
  );
}
