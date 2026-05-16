"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";
import { createClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600",
  pending: "bg-amber-500/10 text-amber-600",
  failed: "bg-red-500/10 text-red-600",
  refunded: "bg-blue-500/10 text-blue-600",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  pending: Clock,
  failed: XCircle,
  refunded: ArrowUpRight,
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    pending: 0,
    refunded: 0,
    netRevenue: 0,
  });

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
    const supabase = createClient();

    const { data } = await supabase
      .from("payments")
      .select("*, orders(order_number, status)")
      .eq("restaurant_id", restaurantId)
      .order("created_at", { ascending: false })
      .limit(100);

    const paymentList = (data || []) as AnyData[];
    setPayments(paymentList);

    // Calculate stats
    let totalRevenue = 0;
    let pending = 0;
    let refunded = 0;

    paymentList.forEach((p) => {
      const amount = (p.amount || 0) / 100;
      if (p.status === "completed") totalRevenue += amount;
      else if (p.status === "pending") pending += amount;
      else if (p.status === "refunded") refunded += amount;
    });

    setStats({
      totalRevenue,
      pending,
      refunded,
      netRevenue: totalRevenue - refunded,
    });

    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  const statCards = [
    { label: "Total Revenue", value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`, icon: ArrowDownLeft, color: "text-emerald-500" },
    { label: "Pending", value: `₹${stats.pending.toLocaleString("en-IN")}`, icon: Clock, color: "text-amber-500" },
    { label: "Refunded", value: `₹${stats.refunded.toLocaleString("en-IN")}`, icon: ArrowUpRight, color: "text-red-500" },
    { label: "Net Revenue", value: `₹${stats.netRevenue.toLocaleString("en-IN")}`, icon: CreditCard, color: "text-primary" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Track all Cashfree payments, refunds, and settlements.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
            <stat.icon className={`h-4 w-4 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <CreditCard className="h-9 w-9 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No payments yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Payments will appear here once customers complete orders via
              Cashfree UPI or payment links.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <span>Payment</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Date</span>
            </div>
            {payments.map((p) => {
              const StatusIcon = STATUS_ICONS[p.status] || Clock;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {p.cashfree_order_id || "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Order #{p.orders?.order_number || "—"}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    ₹{((p.amount || 0) / 100).toLocaleString("en-IN")}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_COLORS[p.status] || "bg-muted text-muted-foreground"}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {p.status}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {p.payment_link && (
                      <a
                        href={p.payment_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                      >
                        <ExternalLink className="h-2.5 w-2.5" />
                        Link
                      </a>
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
