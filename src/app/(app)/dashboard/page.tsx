import {
  ShoppingCart,
  CreditCard,
  MessageSquare,
  Users,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import DashboardCharts from "@/components/dashboard/dashboard-charts";
import { DashboardStatsGrid, RecentOrdersList } from "@/components/dashboard/dashboard-motion";

export const metadata = {
  title: "Dashboard",
};

// Revalidate dashboard data every 30 seconds
export const revalidate = 30;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Display name fallback
  const displayName =
    (user?.user_metadata as Record<string, string>)?.full_name ||
    user?.email?.split("@")[0] ||
    "there";

  // Get the user's restaurant
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("*")
    .eq("owner_id", user?.id || "")
    .single();

  const restaurantId = (restaurant as Record<string, unknown>)?.id as string;

  // Fetch real stats (with fallbacks)
  let todayOrders = 0;
  let todayRevenue = 0;
  let activeChats = 0;
  let totalCustomers = 0;
  let hasMenu = false;
  let hasWhatsApp = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentOrders: any[] = [];
  let chartData: { date: string; sales: number; orders: number; chats: number }[] = [];

  if (restaurantId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Today's orders count
    const { count: orderCount } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .gte("created_at", today.toISOString());
    todayOrders = orderCount || 0;

    // Today's revenue
    const { data: deliveredOrders } = await supabase
      .from("orders")
      .select("total")
      .eq("restaurant_id", restaurantId)
      .eq("status", "delivered")
      .gte("created_at", today.toISOString());
    todayRevenue = (deliveredOrders || []).reduce(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sum: number, o: any) => sum + (o.total || 0),
      0
    );

    // Active conversations (last 24 hours)
    const yesterday = new Date(Date.now() - 86400000);
    const { count: chatCount } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId)
      .gte("updated_at", yesterday.toISOString());
    activeChats = chatCount || 0;

    // Total customers
    const { count: custCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);
    totalCustomers = custCount || 0;

    // Recent orders (top 5)
    const { data: orders } = await supabase
      .from("orders")
      .select("*, customers(saved_name, whatsapp_name, phone)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(5);
    recentOrders = orders || [];

    // Setup checks
    const { count: menuCount } = await supabase
      .from("menu_items")
      .select("*", { count: "exact", head: true })
      .eq("restaurant_id", restaurantId);
    hasMenu = (menuCount || 0) > 0;
    hasWhatsApp = !!(restaurant as Record<string, unknown>)?.whatsapp_phone_id;

    // Fetch last 7 days of orders & chats for dashboard charts
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const { data: last7DaysOrders } = await supabase
      .from("orders")
      .select("created_at, total, status")
      .eq("restaurant_id", restaurantId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    const { data: last7DaysChats } = await supabase
      .from("conversations")
      .select("updated_at")
      .eq("restaurant_id", restaurantId)
      .gte("updated_at", sevenDaysAgo.toISOString())
      .order("updated_at", { ascending: true });

    // Process last 7 days metrics
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
      
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      
      const dayOrders = (last7DaysOrders || []).filter(o => {
        const oDate = new Date(o.created_at);
        return oDate >= dayStart && oDate <= dayEnd;
      });

      const dayChats = (last7DaysChats || []).filter(c => {
        const cDate = new Date(c.updated_at);
        return cDate >= dayStart && cDate <= dayEnd;
      });

      const sales = dayOrders
        .filter(o => o.status === "delivered")
        .reduce((sum, o) => sum + (o.total || 0) / 100, 0);

      return {
        date: dateStr,
        sales,
        orders: dayOrders.length,
        chats: dayChats.length,
      };
    });
  } else {
    // Generate dummy dates so chart looks full/premium on empty state
    chartData = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        date: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }),
        sales: 0,
        orders: 0,
        chats: 0,
      };
    });
  }

  const setupSteps = [
    { label: "Create your account", done: true },
    { label: "Add restaurant details", done: !!restaurantId },
    { label: "Upload your menu", done: hasMenu },
    { label: "Connect WhatsApp Business", done: hasWhatsApp },
    { label: "Receive first order", done: todayOrders > 0 || recentOrders.length > 0 },
  ];
  const completedSteps = setupSteps.filter((s) => s.done).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Welcome back, {displayName} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what&apos;s happening at your restaurant today.
        </p>
      </div>

      {/* Stats Grid */}
      <DashboardStatsGrid
        todayOrders={todayOrders}
        todayRevenue={todayRevenue}
        activeChats={activeChats}
        totalCustomers={totalCustomers}
      />

      {/* Interactive Charts Dashboard Component */}
      <DashboardCharts data={chartData} />


      {/* Quick Actions + Setup Checklist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Add Menu Item", href: "/dashboard/menu", icon: "🍽️" },
              { label: "View Orders", href: "/dashboard/orders", icon: "📦" },
              { label: "Conversations", href: "/dashboard/conversations", icon: "💬" },
              { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="flex items-center gap-3 rounded-xl border border-border/30 bg-muted/25 p-3.5 hover:bg-muted/50 hover:border-border transition-colors group"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Setup Checklist */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Setup Checklist</h2>
          <div className="space-y-3">
            {setupSteps.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                )}
                <span
                  className={
                    item.done
                      ? "text-muted-foreground line-through"
                      : "font-medium"
                  }
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(completedSteps / setupSteps.length) * 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground font-mono">
            {completedSteps} of {setupSteps.length} steps complete
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-xs font-medium text-primary hover:underline"
          >
            View All
          </Link>
        </div>

        {recentOrders.length > 0 ? (
          <RecentOrdersList recentOrders={recentOrders} />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
              <ShoppingCart className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold">No orders yet</h3>
            <p className="mt-1 text-sm text-muted-foreground max-w-xs">
              Orders will appear here once your WhatsApp bot is live and
              customers start ordering.
            </p>
            <Link
              href="/dashboard/settings"
              className="mt-4 inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Complete Setup
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
