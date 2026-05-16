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

export const metadata = {
  title: "Dashboard",
};

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
      .select("*, customers(name, phone)")
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border/50 bg-card p-5 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-2xl font-bold">{todayOrders}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Today&apos;s Orders</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
              <CreditCard className="h-5 w-5 text-emerald-600" />
            </div>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-2xl font-bold">₹{todayRevenue.toLocaleString("en-IN")}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Revenue</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-2xl font-bold">{activeChats}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Active Chats</p>
        </div>
        <div className="rounded-2xl border border-border/50 bg-card p-5 hover:border-border transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
              <Users className="h-5 w-5 text-amber-600" />
            </div>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <p className="mt-3 text-2xl font-bold">{totalCustomers}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">Customers</p>
        </div>
      </div>

      {/* Quick Actions + Setup Checklist */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
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
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-muted/30 p-3.5 hover:bg-muted/60 hover:border-border transition-colors group"
              >
                <span className="text-xl">{action.icon}</span>
                <span className="text-sm font-medium">{action.label}</span>
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Setup Checklist */}
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Setup Checklist</h2>
          <div className="space-y-3">
            {setupSteps.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
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
          <p className="mt-2 text-xs text-muted-foreground">
            {completedSteps} of {setupSteps.length} steps complete
          </p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl border border-border/50 bg-card p-6">
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
          <div className="divide-y divide-border/50">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {recentOrders.map((order: any) => (
              <div
                key={order.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <ShoppingCart className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      #{order.order_number} ·{" "}
                      {order.customers?.name || "Customer"}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">
                    ₹{(order.total || 0).toLocaleString("en-IN")}
                  </p>
                  <span
                    className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      order.status === "delivered"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : order.status === "cancelled"
                        ? "bg-red-500/10 text-red-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
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
