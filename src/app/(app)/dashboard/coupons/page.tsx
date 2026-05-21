"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Tag,
  Plus,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Copy,
  Percent,
  IndianRupee,
  Truck,
  Calendar,
  Sparkles,
  RefreshCw,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCoupons,
  createCoupon,
  deleteCoupon,
  toggleCouponActive,
} from "@/lib/actions/coupon-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

const DISCOUNT_TYPES = [
  { value: "percentage", label: "Percentage", icon: Percent, suffix: "%" },
  { value: "flat", label: "Flat Amount", icon: IndianRupee, suffix: "₹" },
] as const;

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "flat",
    discount_value: "",
    min_order_amount: "",
    max_discount: "",
    max_uses: "",
    valid_until: "",
    description: "",
    first_order_only: false,
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
    const result = await getCoupons(restaurantId);
    setCoupons(result.data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  const handleCreate = async () => {
    if (!restaurantId) return;
    if (!form.code.trim()) {
      toast.error("Enter a coupon code.");
      return;
    }
    if (!form.discount_value || parseFloat(form.discount_value) <= 0) {
      toast.error("Enter a valid discount value.");
      return;
    }
    if (form.discount_type === "percentage" && parseFloat(form.discount_value) > 100) {
      toast.error("Percentage cannot exceed 100%.");
      return;
    }

    setSaving(true);
    const result = await createCoupon(restaurantId, {
      code: form.code,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) * 100 : undefined,
      max_discount: form.max_discount ? parseFloat(form.max_discount) * 100 : undefined,
      max_uses: form.max_uses ? parseInt(form.max_uses) : undefined,
      valid_until: form.valid_until || undefined,
      description: form.description || undefined,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Coupon ${form.code.toUpperCase()} created!`);
      setForm({
        code: "",
        discount_type: "percentage",
        discount_value: "",
        min_order_amount: "",
        max_discount: "",
        max_uses: "",
        valid_until: "",
        description: "",
        first_order_only: false,
      });
      setShowCreate(false);
      loadData();
    }
  };

  const handleDelete = async (couponId: string, code: string) => {
    if (!restaurantId) return;
    if (!confirm(`Delete coupon "${code}"? This cannot be undone.`)) return;
    const result = await deleteCoupon(restaurantId, couponId);
    if (result.error) toast.error(result.error as string);
    else {
      toast.success(`Coupon ${code} deleted`);
      loadData();
    }
  };

  const handleToggle = async (couponId: string, currentActive: boolean) => {
    if (!restaurantId) return;
    const result = await toggleCouponActive(restaurantId, couponId, !currentActive);
    if (result.error) toast.error(result.error as string);
    else {
      toast.success(currentActive ? "Coupon deactivated" : "Coupon activated");
      loadData();
    }
  };

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    toast.success(`Copied "${code}" to clipboard`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Stats
  const activeCoupons = coupons.filter((c) => c.is_active).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.used_count || 0), 0);
  const expiredCoupons = coupons.filter(
    (c) => c.valid_until && new Date(c.valid_until) < new Date()
  ).length;

  const statCards = [
    { label: "Active", value: activeCoupons, color: "text-emerald-500" },
    { label: "Total Used", value: totalRedemptions, color: "text-primary" },
    { label: "Expired", value: expiredCoupons, color: "text-amber-500" },
    { label: "Total", value: coupons.length, color: "text-foreground" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Coupons</h1>
          <p className="text-sm text-muted-foreground">
            Create discount codes, flat offers, and promotional deals.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Create Coupon
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Create New Coupon</h3>
            <button onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Code */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))
                  }
                  placeholder="e.g., SAVE20"
                  maxLength={15}
                  className="flex h-10 flex-1 rounded-xl border border-input bg-card px-4 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, code: generateCode() }))}
                  className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/5 px-3 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors"
                  title="Generate random code"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto
                </button>
              </div>
            </div>

            {/* Discount Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Discount Type
              </label>
              <div className="flex gap-2">
                {DISCOUNT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() =>
                      setForm((p) => ({ ...p, discount_type: type.value }))
                    }
                    className={`flex-1 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border text-sm font-medium transition-all ${
                      form.discount_type === type.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card hover:bg-muted"
                    }`}
                  >
                    <type.icon className="h-3.5 w-3.5" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount Value */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Discount Value
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, discount_value: e.target.value }))
                  }
                  placeholder={form.discount_type === "percentage" ? "e.g., 20" : "e.g., 50"}
                  min="0"
                  max={form.discount_type === "percentage" ? "100" : undefined}
                  className="flex h-10 w-full rounded-xl border border-input bg-card pl-4 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                  {form.discount_type === "percentage" ? "%" : "₹"}
                </span>
              </div>
            </div>

            {/* Min Order */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Min Order Amount (₹)
              </label>
              <input
                type="number"
                value={form.min_order_amount}
                onChange={(e) =>
                  setForm((p) => ({ ...p, min_order_amount: e.target.value }))
                }
                placeholder="Optional"
                min="0"
                className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Max Discount (only for percentage) */}
            {form.discount_type === "percentage" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Max Discount Cap (₹)
                </label>
                <input
                  type="number"
                  value={form.max_discount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, max_discount: e.target.value }))
                  }
                  placeholder="Optional"
                  min="0"
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {/* Max Uses */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Max Total Uses
              </label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) =>
                  setForm((p) => ({ ...p, max_uses: e.target.value }))
                }
                placeholder="Unlimited"
                min="1"
                className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Expiry */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Expires On
              </label>
              <input
                type="date"
                value={form.valid_until}
                onChange={(e) =>
                  setForm((p) => ({ ...p, valid_until: e.target.value }))
                }
                min={new Date().toISOString().split("T")[0]}
                className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Description (optional)
              </label>
              <input
                type="text"
                value={form.description}
                onChange={(e) =>
                  setForm((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="e.g., Diwali special offer — 20% off on all orders"
                className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Preview + Submit */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pt-2">
            {form.code && form.discount_value && (
              <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-3">
                <Tag className="h-4 w-4 text-primary" />
                <span className="text-sm">
                  <span className="font-bold font-mono text-primary">{form.code.toUpperCase()}</span>
                  {" — "}
                  {form.discount_type === "percentage"
                    ? `${form.discount_value}% off`
                    : `₹${form.discount_value} off`}
                  {form.min_order_amount && ` on orders above ₹${form.min_order_amount}`}
                  {form.max_discount && ` (max ₹${form.max_discount})`}
                </span>
              </div>
            )}
            <button
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Create Coupon
            </button>
          </div>
        </div>
      )}

      {/* Coupons List */}
      <div className="w-full">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : coupons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4 rounded-2xl border border-border/50 bg-card">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
              <Tag className="h-9 w-9 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">No coupons yet</h3>
            <p className="mt-2 text-sm text-muted-foreground max-w-md">
              Create discount coupons to attract customers. Supports percentage
              off, flat discounts, and more.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
            >
              <Plus className="h-4 w-4" />
              Create Your First Coupon
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((coupon) => {
              const isExpired =
                coupon.valid_until && new Date(coupon.valid_until) < new Date();
              const isMaxedOut =
                coupon.max_uses && coupon.used_count >= coupon.max_uses;
              const statusColor = !coupon.is_active
                ? "border-border/40 opacity-60"
                : isExpired || isMaxedOut
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-emerald-500/30 bg-emerald-500/5";

              return (
                <div
                  key={coupon.id}
                  className={`rounded-2xl border p-5 space-y-4 transition-all ${statusColor}`}
                >
                  {/* Code + Copy */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleCopy(coupon.code, coupon.id)}
                      className="group flex items-center gap-2"
                    >
                      <span className="text-lg font-bold font-mono text-foreground tracking-wider">
                        {coupon.code}
                      </span>
                      {copiedId === coupon.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </button>
                    <div className="flex items-center gap-1">
                      {isExpired && (
                        <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 uppercase">
                          Expired
                        </span>
                      )}
                      {isMaxedOut && !isExpired && (
                        <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-600 uppercase">
                          Maxed
                        </span>
                      )}
                      {coupon.is_active && !isExpired && !isMaxedOut && (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600 uppercase">
                          Active
                        </span>
                      )}
                      {!coupon.is_active && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground uppercase">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Discount Value */}
                  <div className="flex items-baseline gap-1">
                    {coupon.discount_type === "percentage" ? (
                      <>
                        <span className="text-3xl font-bold text-primary">
                          {coupon.discount_value}
                        </span>
                        <span className="text-lg font-semibold text-primary">
                          % OFF
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg font-semibold text-primary">₹</span>
                        <span className="text-3xl font-bold text-primary">
                          {coupon.discount_value}
                        </span>
                        <span className="text-lg font-semibold text-primary">
                          OFF
                        </span>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  {coupon.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {coupon.description}
                    </p>
                  )}

                  {/* Details */}
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    {coupon.min_order_amount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="h-3 w-3" />
                        Min order: ₹{(coupon.min_order_amount / 100).toFixed(0)}
                      </div>
                    )}
                    {coupon.max_discount && (
                      <div className="flex items-center gap-1.5">
                        <IndianRupee className="h-3 w-3" />
                        Max discount: ₹{(coupon.max_discount / 100).toFixed(0)}
                      </div>
                    )}
                    {coupon.max_uses && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="h-3 w-3" />
                        Used: {coupon.used_count || 0} / {coupon.max_uses}
                      </div>
                    )}
                    {coupon.valid_until && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3" />
                        {isExpired ? "Expired" : "Expires"}:{" "}
                        {new Date(coupon.valid_until).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <button
                      onClick={() => handleToggle(coupon.id, coupon.is_active)}
                      className={`inline-flex h-9 px-3 items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-all ${
                        coupon.is_active
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {coupon.is_active ? (
                        <>
                          <ToggleRight className="h-4 w-4" /> Active
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-4 w-4" /> Inactive
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id, coupon.code)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all"
                      title="Delete coupon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
