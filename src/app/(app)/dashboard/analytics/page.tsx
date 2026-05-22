"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Calendar,
  TrendingUp,
  Users,
  ShoppingCart,
  CreditCard,
  Activity,
  UtensilsCrossed,
  Clock,
  Star,
  Repeat2,
  IndianRupee,
} from "lucide-react";
import { motion, Variants, AnimatePresence } from "framer-motion";
import {
  getDashboardStats,
  getOrderTrend,
  getTopSellingItems,
  getRecentActivity,
  getPeakHours,
  getOrderInsights,
  getRevenueByPaymentMethod,
} from "@/lib/actions/analytics-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
  },
};

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-xl bg-muted/60" />
          <div className="h-4 w-72 animate-pulse rounded-lg bg-muted/40" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-xl bg-muted/40 border border-border/20" />
      </div>

      {/* Row 1 Stats Skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-border/40 space-y-3">
            <div className="h-5 w-5 animate-pulse rounded-lg bg-primary/20" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-4 w-32 animate-pulse rounded-md bg-muted/40" />
            <div className="h-3.5 w-24 animate-pulse rounded-md bg-muted/30" />
          </div>
        ))}
      </div>

      {/* Row 2 Stats Skeleton */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass rounded-2xl p-5 border border-border/40 space-y-3">
            <div className="h-5 w-5 animate-pulse rounded-lg bg-muted/50" />
            <div className="h-8 w-16 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-4 w-28 animate-pulse rounded-md bg-muted/45" />
            <div className="h-3.5 w-20 animate-pulse rounded-md bg-muted/30" />
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6 border border-border/40 space-y-4">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-muted/60" />
          <div className="h-48 animate-pulse rounded-xl bg-muted/20 border border-dashed border-border/30" />
        </div>
        <div className="glass rounded-2xl p-6 border border-border/40 space-y-4">
          <div className="h-5 w-32 animate-pulse rounded-lg bg-muted/60" />
          <div className="space-y-3">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="h-14 animate-pulse rounded-xl bg-muted/25" />
            ))}
          </div>
        </div>
      </div>

      {/* Peak Hours Skeleton */}
      <div className="glass rounded-2xl p-6 border border-border/40 space-y-4">
        <div className="h-5 w-48 animate-pulse rounded-lg bg-muted/60" />
        <div className="h-40 animate-pulse rounded-xl bg-muted/20 border border-dashed border-border/30" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [stats, setStats] = useState<AnyData>({});
  const [trend, setTrend] = useState<AnyData[]>([]);
  const [topItems, setTopItems] = useState<AnyData[]>([]);
  const [activity, setActivity] = useState<AnyData[]>([]);
  const [peakHours, setPeakHours] = useState<AnyData[]>([]);
  const [insights, setInsights] = useState<AnyData>({});
  const [paymentBreakdown, setPaymentBreakdown] = useState<AnyData>({});

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
    const [s, t, ti, a, ph, ins, pb] = await Promise.all([
      getDashboardStats(restaurantId),
      getOrderTrend(restaurantId),
      getTopSellingItems(restaurantId, 5),
      getRecentActivity(restaurantId, 10),
      getPeakHours(restaurantId),
      getOrderInsights(restaurantId),
      getRevenueByPaymentMethod(restaurantId),
    ]);
    setStats(s);
    setTrend(t);
    setTopItems(ti);
    setActivity(a.data || []);
    setPeakHours(ph);
    setInsights(ins);
    setPaymentBreakdown(pb);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);



  // Find max revenue for the bar chart scaling
  const maxRevenue = Math.max(...trend.map((d) => d.revenue || 0), 1);

  // Peak hours: filter to business hours (8 AM - 11 PM)
  const businessHours = peakHours.filter(
    (h) => h.hourNum >= 8 && h.hourNum <= 23
  );
  const maxPeakCount = Math.max(...businessHours.map((h) => h.count || 0), 1);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          <AnalyticsSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            Insights into orders, revenue, customers, and AI performance.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/40 glass px-3 py-1.5 text-sm">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>Last 7 days</span>
        </div>
      </motion.div>

      {/* KPIs Row 1 */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="glass glass-interactive rounded-2xl p-5 border border-border/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">{stats.todayOrders || 0}</p>
          <p className="text-sm text-muted-foreground">Total Orders (Today)</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{stats.weekOrders || 0}</span> this week
          </p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 border border-border/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <CreditCard className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">₹{((stats.todayRevenue || 0) / 100).toLocaleString("en-IN")}</p>
          <p className="text-sm text-muted-foreground">Revenue (Today)</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{stats.activeOrders || 0}</span> active orders
          </p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 border border-border/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">{stats.totalCustomers || 0}</p>
          <p className="text-sm text-muted-foreground">Customers</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{stats.newCustomers || 0}</span> new this week
          </p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 border border-border/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">{stats.activeConversations || 0}</p>
          <p className="text-sm text-muted-foreground">AI Conversations</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{stats.menuItems || 0}</span> menu items live
          </p>
        </div>
      </motion.div>

      {/* KPIs Row 2 — Insights */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        <div className="glass glass-interactive rounded-2xl p-5 border border-border/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <IndianRupee className="h-5 w-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">
            ₹{((insights.avgOrderValue || 0) / 100).toFixed(0)}
          </p>
          <p className="text-sm text-muted-foreground">Avg Order Value</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{insights.totalDelivered || 0}</span> delivered (30d)
          </p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 border border-border/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <Repeat2 className="h-5 w-5 text-blue-500" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">{insights.repeatRate || 0}%</p>
          <p className="text-sm text-muted-foreground">Repeat Rate</p>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-mono">{insights.repeatCustomers || 0}</span> of <span className="font-mono">{insights.totalCustomers || 0}</span> customers
          </p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 border border-border/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">{insights.avgRating || 'N/A'}</p>
          <p className="text-sm text-muted-foreground">Avg Rating</p>
          <p className="text-xs text-muted-foreground mt-1">From customer feedback</p>
        </div>
        <div className="glass glass-interactive rounded-2xl p-5 border border-border/40 transition-all duration-300">
          <div className="flex items-center justify-between mb-3">
            <Clock className="h-5 w-5 text-violet-500" />
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight">
            {businessHours.length > 0
              ? businessHours.reduce((best, h) => (h.count > best.count ? h : best), businessHours[0]).hour
              : 'N/A'}
          </p>
          <p className="text-sm text-muted-foreground">Peak Hour</p>
          <p className="text-xs text-muted-foreground mt-1">Most orders placed</p>
        </div>
      </motion.div>

      {/* Charts Row 1 */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        {/* Revenue Trend (simple bar chart) */}
        <div className="glass rounded-2xl p-6 border border-border/40">
          <h3 className="text-sm font-semibold mb-4">Revenue Trend (7 Days)</h3>
          {trend.length > 0 && trend.some((d) => d.revenue > 0) ? (
            <div className="flex items-end gap-2 h-48">
              {trend.map((day, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1">
                  <span className="text-[10px] text-muted-foreground font-mono font-medium">
                    ₹{((day.revenue || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
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
            <div className="flex h-48 items-center justify-center rounded-xl bg-muted/10 border border-dashed border-border/30">
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
        <div className="glass rounded-2xl p-6 border border-border/40">
          <h3 className="text-sm font-semibold mb-4">Top Menu Items</h3>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-muted/20 border border-border/10 p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary font-mono">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold font-mono">{item.count} sold</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      ₹{((item.revenue || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl bg-muted/10 border border-dashed border-border/30">
              <div className="text-center">
                <UtensilsCrossed className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No data yet — start receiving orders
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Peak Hours Chart */}
      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl p-6 border border-border/40"
      >
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-violet-500" />
          <h3 className="text-sm font-semibold">Peak Ordering Hours (Last 30 Days)</h3>
        </div>
        {businessHours.some((h) => h.count > 0) ? (() => {
          const chartW = 800;
          const chartH = 160;
          const padL = 35;
          const padR = 10;
          const padT = 15;
          const padB = 30;
          const plotW = chartW - padL - padR;
          const plotH = chartH - padT - padB;
          const n = businessHours.length;

          const points = businessHours.map((h, i) => ({
            x: padL + (i / (n - 1)) * plotW,
            y: padT + plotH - (h.count / maxPeakCount) * plotH,
            count: h.count,
            hour: h.hour,
          }));

          const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          const areaD = `${lineD} L${points[n - 1].x},${padT + plotH} L${points[0].x},${padT + plotH} Z`;

          // Grid lines
          const gridLines = [0, 0.25, 0.5, 0.75, 1];

          return (
            <div className="w-full overflow-x-auto">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full h-auto min-h-[180px]" preserveAspectRatio="xMidYMid meet">
                <defs>
                  <linearGradient id="peakAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Grid lines */}
                {gridLines.map((pct, i) => {
                  const y = padT + plotH - pct * plotH;
                  return (
                    <g key={i}>
                      <line x1={padL} y1={y} x2={chartW - padR} y2={y} stroke="hsl(var(--border))" strokeWidth="0.5" strokeDasharray={pct > 0 ? "4,4" : "0"} />
                      <text x={padL - 5} y={y + 3} textAnchor="end" fontSize="8" fill="hsl(var(--muted-foreground))" fontFamily="monospace">
                        {Math.round(maxPeakCount * pct)}
                      </text>
                    </g>
                  );
                })}

                {/* Area fill */}
                <path d={areaD} fill="url(#peakAreaGrad)" />

                {/* Line */}
                <path d={lineD} fill="none" stroke="hsl(var(--primary))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

                {/* Dots + hour labels */}
                {points.map((p, i) => (
                  <g key={i}>
                    {p.count > 0 && (
                      <>
                        <circle cx={p.x} cy={p.y} r="4" fill="hsl(var(--primary))" stroke="hsl(var(--background))" strokeWidth="2" />
                        <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="7.5" fill="hsl(var(--muted-foreground))" fontFamily="monospace" fontWeight="600">
                          {p.count}
                        </text>
                      </>
                    )}
                    {/* Show every other label to avoid overlap */}
                    {i % 2 === 0 && (
                      <text x={p.x} y={chartH - 5} textAnchor="middle" fontSize="7.5" fill="hsl(var(--muted-foreground))">
                        {p.hour}
                      </text>
                    )}
                  </g>
                ))}
              </svg>
            </div>
          );
        })() : (
          <div className="flex h-40 items-center justify-center rounded-xl bg-muted/10 border border-dashed border-border/30">
            <div className="text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Peak hours will show after you receive orders
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Payment Method Breakdown + Order Summary */}
      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div className="glass rounded-2xl p-6 border border-border/40">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Revenue by Payment Method (30 Days)</h3>
          </div>
          {(paymentBreakdown.totalOrders || 0) > 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium">💵 Cash on Delivery</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold">₹{((paymentBreakdown.cod?.revenue || 0) / 100).toLocaleString('en-IN')}</span>
                    <span className="text-xs text-muted-foreground ml-2">({paymentBreakdown.codPercentage}%)</span>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${paymentBreakdown.codPercentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{paymentBreakdown.cod?.count || 0}</span> orders
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">💳 Online Payment</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-sm font-bold">₹{((paymentBreakdown.online?.revenue || 0) / 100).toLocaleString('en-IN')}</span>
                    <span className="text-xs text-muted-foreground ml-2">({paymentBreakdown.onlinePercentage}%)</span>
                  </div>
                </div>
                <div className="h-2.5 w-full rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${paymentBreakdown.onlinePercentage || 0}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{paymentBreakdown.online?.count || 0}</span> orders
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-border/30 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Revenue</span>
                <span className="text-sm font-bold font-mono">₹{((paymentBreakdown.totalRevenue || 0) / 100).toLocaleString('en-IN')}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-xl bg-muted/10 border border-dashed border-border/30">
              <div className="text-center">
                <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Payment data will show after delivered orders
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-6 border border-border/40">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Order Summary (30 Days)</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-muted/20 border border-border/10 p-4 text-center">
              <p className="text-2xl font-bold text-primary font-mono">{insights.totalDelivered || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Delivered</p>
            </div>
            <div className="rounded-xl bg-muted/20 border border-border/10 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-500 font-mono">₹{((insights.avgOrderValue || 0) / 100).toFixed(0)}</p>
              <p className="text-xs text-muted-foreground mt-1">Avg Order</p>
            </div>
            <div className="rounded-xl bg-muted/20 border border-border/10 p-4 text-center">
              <p className="text-2xl font-bold text-blue-500 font-mono">{insights.repeatRate || 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Repeat Rate</p>
            </div>
            <div className="rounded-xl bg-muted/20 border border-border/10 p-4 text-center">
              <p className="text-2xl font-bold text-amber-500 font-mono">{insights.avgRating || 'N/A'}</p>
              <p className="text-xs text-muted-foreground mt-1">Avg Rating</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Activity Feed */}
      <motion.div
        variants={itemVariants}
        className="glass rounded-2xl p-6 border border-border/40"
      >
        <h3 className="text-sm font-semibold mb-4">Recent Activity</h3>
        {activity.length > 0 ? (
          <div className="space-y-2">
            {activity.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/10 transition-colors"
              >
                <Activity className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{a.action}</p>
                  <p className="text-xs text-muted-foreground font-mono">
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
          <p className="text-sm text-muted-foreground py-8 text-center font-mono">
            No activity logged yet. Actions will appear here as they happen.
          </p>
        )}
      </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

