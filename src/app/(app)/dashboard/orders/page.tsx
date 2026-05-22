"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  ShoppingCart,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  Truck,
  Package,
  Loader2,
  RefreshCw,
  Download,
  Filter,
  CalendarDays,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { getOrders, updateOrderStatus, getOrderStats, exportOrdersCsv } from "@/lib/actions/order-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

const ORDER_TABS = [
  { id: "all", label: "All Orders", icon: ShoppingCart },
  { id: "pending", label: "Pending", icon: Clock },
  { id: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { id: "preparing", label: "Preparing", icon: ChefHat },
  { id: "ready", label: "Ready", icon: Package },
  { id: "delivered", label: "Delivered", icon: Truck },
  { id: "cancelled", label: "Cancelled", icon: XCircle },
] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600",
  confirmed: "bg-blue-500/10 text-blue-600",
  preparing: "bg-purple-500/10 text-purple-600",
  ready: "bg-emerald-500/10 text-emerald-600",
  out_for_delivery: "bg-cyan-500/10 text-cyan-600",
  delivered: "bg-emerald-600/10 text-emerald-700",
  cancelled: "bg-red-500/10 text-red-600",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderData = Record<string, any>;

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [updatingOrder, setUpdatingOrder] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    (async () => {
      const r = await getCurrentRestaurant();
      if (r?.id) setRestaurantId(r.id as string);
      else setLoading(false);
    })();
  }, []);

  const loadOrders = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    const [orderResult, statsResult] = await Promise.all([
      getOrders(restaurantId, {
        status: activeTab !== "all" ? activeTab : undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        paymentStatus: paymentFilter !== "all" ? paymentFilter : undefined,
        limit: 50,
      }),
      getOrderStats(restaurantId),
    ]);
    setOrders(orderResult.data || []);
    setTotalCount(orderResult.count || 0);
    setStats(statsResult.counts || {});
    setLoading(false);
  }, [restaurantId, activeTab, search, dateFrom, dateTo, paymentFilter]);

  useEffect(() => {
    if (restaurantId) loadOrders();
    const interval = setInterval(() => {
      if (restaurantId) loadOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, [restaurantId, loadOrders]);

  const handleStatusUpdate = async (
    orderId: string,
    status: "confirmed" | "preparing" | "ready" | "out_for_delivery" | "delivered" | "cancelled"
  ) => {
    if (!restaurantId) return;
    setUpdatingOrder(orderId);
    const result = await updateOrderStatus(restaurantId, orderId, status);
    setUpdatingOrder(null);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Order updated to "${status}"`);
      loadOrders();
    }
  };

  const handleExportCsv = async () => {
    if (!restaurantId) return;
    setExporting(true);
    try {
      const result = await exportOrdersCsv(restaurantId, {
        status: activeTab !== "all" ? activeTab : undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        paymentStatus: paymentFilter !== "all" ? paymentFilter : undefined,
      });

      if (result.error || !result.csv) {
        toast.error(result.error || "Export failed");
        return;
      }

      // Download CSV
      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `orders_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Orders exported successfully!");
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setPaymentFilter("all");
    setSearch("");
  };

  const hasActiveFilters = dateFrom || dateTo || paymentFilter !== "all";

  const getNextStatus = (
    current: string
  ): "confirmed" | "preparing" | "ready" | "delivered" | null => {
    const flow: Record<string, "confirmed" | "preparing" | "ready" | "delivered"> = {
      pending: "confirmed",
      confirmed: "preparing",
      preparing: "ready",
      ready: "delivered",
    };
    return flow[current] || null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage all customer orders in real-time.
            {totalCount > 0 && (
              <span className="ml-1 font-mono text-foreground">{totalCount} total</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? "border-primary/50 bg-primary/5 text-primary"
                : "border-border/50 bg-card hover:bg-muted/50"
            }`}
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {hasActiveFilters && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                !
              </span>
            )}
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting || orders.length === 0}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card px-3 text-sm font-medium hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Export CSV
          </button>
          <button
            onClick={loadOrders}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border/50 bg-card px-3 text-sm font-medium hover:bg-muted/50 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="glass rounded-2xl border border-border/50 p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              Advanced Filters
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Date From */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                From Date
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {/* Date To */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                To Date
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            {/* Payment Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Payment Status</label>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="all">All Payments</option>
                <option value="paid">💳 Paid</option>
                <option value="cod_pending">💵 COD Pending</option>
                <option value="pending">⏳ Unpaid</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Order Status Tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border/50 bg-muted/30 p-1">
        {ORDER_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
            {stats[tab.id] ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                {stats[tab.id]}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order # or phone number..."
          className="flex h-10 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
        />
      </div>

      {/* Orders List */}
      <div className="rounded-2xl border border-border/50 bg-card">
        {loading ? (
          <div className="divide-y divide-border/50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 w-40 rounded-lg bg-muted animate-pulse" />
                    <div className="h-3 w-28 rounded-lg bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-16 rounded-lg bg-muted animate-pulse" />
                  <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <ShoppingCart className="h-9 w-9 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No orders found</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              {hasActiveFilters
                ? "No orders match your filters. Try adjusting the date range or clearing filters."
                : activeTab !== "all"
                ? `No ${activeTab} orders right now.`
                : "Orders will appear here once your WhatsApp bot starts receiving them."}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {orders.map((order) => {
              const next = getNextStatus(order.status);
              return (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-muted/20 transition-colors gap-3"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        #{order.order_number} · {order.customers?.saved_name || order.customers?.whatsapp_name || "Customer"}
                      </p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 flex-wrap">
                        <Clock className="h-3 w-3" />
                        {new Date(order.created_at).toLocaleString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "numeric",
                          month: "short",
                        })}
                        {order.customers?.phone && (
                          <span className="ml-1 font-mono text-[10px]">
                            · {order.customers.phone}
                          </span>
                        )}
                        {order.delivery_type && (
                          <span className="ml-1">
                            · {order.delivery_type === "dine_in" ? "Dine-in" : "Delivery"}
                          </span>
                        )}
                        {order.rating > 0 && (
                          <span className="ml-1 text-amber-500">
                            · {"⭐".repeat(Math.min(order.rating, 5))}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap pl-14 sm:pl-0">
                    <p className="text-sm font-semibold">
                      ₹{((order.total || 0) / 100).toLocaleString("en-IN")}
                    </p>
                    {order.payment_status && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          order.payment_status === "paid"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : order.payment_status === "cod_pending"
                            ? "bg-orange-500/10 text-orange-600"
                            : "bg-yellow-500/10 text-yellow-600"
                        }`}
                      >
                        {order.payment_status === "paid" ? "💳 Paid" : order.payment_status === "cod_pending" ? "💵 COD" : "⏳ Unpaid"}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_COLORS[order.status] || "bg-muted text-muted-foreground"}`}
                    >
                      {order.status?.replace("_", " ")}
                    </span>
                    {next && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, next)}
                        disabled={updatingOrder === order.id}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        {updatingOrder === order.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : null}
                        Mark {next}
                      </button>
                    )}
                    {order.status !== "cancelled" && order.status !== "delivered" && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, "cancelled")}
                        disabled={updatingOrder === order.id}
                        className="inline-flex h-8 items-center rounded-lg border border-red-200 px-2.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <XCircle className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
