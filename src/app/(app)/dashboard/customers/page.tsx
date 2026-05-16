"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Users,
  Phone,
  ShoppingBag,
  Shield,
  ShieldOff,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { getCustomers, toggleCustomerBlock } from "@/lib/actions/customer-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [customers, setCustomers] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [count, setCount] = useState(0);

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
    const result = await getCustomers(restaurantId, {
      search: search || undefined,
      limit: 50,
    });
    setCustomers(result.data || []);
    setCount(result.count || 0);
    setLoading(false);
  }, [restaurantId, search]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  const handleBlock = async (customerId: string, block: boolean) => {
    if (!restaurantId) return;
    const result = await toggleCustomerBlock(restaurantId, customerId, block);
    if (result.error) toast.error(result.error);
    else {
      toast.success(block ? "Customer blocked" : "Customer unblocked");
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          {count} total customers · Manage your WhatsApp customer base.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="flex h-10 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
        />
      </div>

      <div className="rounded-2xl border border-border/50 bg-card">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : customers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Users className="h-9 w-9 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No customers yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Customer profiles are created automatically when they message your WhatsApp bot.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {customers.map((c) => (
              <div
                key={c.id}
                className={`flex items-center justify-between p-4 hover:bg-muted/20 transition-colors ${c.is_blocked ? "opacity-50" : ""}`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                    {(c.saved_name || c.whatsapp_name || "?")[0].toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{c.saved_name || c.whatsapp_name || "Unknown"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {c.phone || "—"}
                      {c.loyalty_tier && (
                        <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">
                          {c.loyalty_tier}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold flex items-center gap-1">
                      <ShoppingBag className="h-3.5 w-3.5 text-muted-foreground" />
                      {c.total_orders || 0} orders
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{((c.total_spent || 0) / 100).toLocaleString("en-IN")} spent
                    </p>
                  </div>
                  <button
                    onClick={() => handleBlock(c.id, !c.is_blocked)}
                    className={`p-2 rounded-lg transition-colors ${c.is_blocked ? "hover:bg-emerald-50 text-emerald-600" : "hover:bg-red-50 text-red-500"}`}
                    title={c.is_blocked ? "Unblock" : "Block"}
                  >
                    {c.is_blocked ? <ShieldOff className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
