"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Crown,
  Plus,
  Loader2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  X,
  Gift,
  Star,
  TrendingUp,
  Users,
  Coins,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  Truck,
  Percent,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";
import { getLoyaltyStats, getLoyaltyTransactions } from "@/lib/actions/loyalty-actions";
import { getRewards, createReward, deleteReward, toggleRewardActive } from "@/lib/actions/reward-actions";
import { getMenuItems } from "@/lib/actions/menu-actions";
import { getCurrentRestaurant } from "@/lib/actions/restaurant-actions";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyData = Record<string, any>;

const TIER_CONFIG = {
  bronze: { label: "Bronze", color: "text-amber-700", bg: "bg-amber-500/10", border: "border-amber-500/30", emoji: "🥉", threshold: 0 },
  silver: { label: "Silver", color: "text-slate-500", bg: "bg-slate-400/10", border: "border-slate-400/30", emoji: "🥈", threshold: 500 },
  gold: { label: "Gold", color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", emoji: "🥇", threshold: 2000 },
  platinum: { label: "Platinum", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30", emoji: "💎", threshold: 5000 },
} as const;

const REWARD_TYPES = [
  { value: "free_item", label: "Free Item", icon: UtensilsCrossed },
  { value: "discount", label: "Discount (₹)", icon: Percent },
  { value: "free_delivery", label: "Free Delivery", icon: Truck },
] as const;

export default function LoyaltyPage() {
  const [stats, setStats] = useState<AnyData>({});
  const [rewards, setRewards] = useState<AnyData[]>([]);
  const [transactions, setTransactions] = useState<AnyData[]>([]);
  const [menuItems, setMenuItems] = useState<AnyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: "",
    description: "",
    points_required: "",
    reward_type: "free_item" as "free_item" | "discount" | "free_delivery",
    reward_value: "",
    reward_item_id: "",
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
    const [statsRes, rewardsRes, txRes, menuRes] = await Promise.all([
      getLoyaltyStats(restaurantId),
      getRewards(restaurantId),
      getLoyaltyTransactions(restaurantId, { limit: 15 }),
      getMenuItems(restaurantId),
    ]);
    setStats(statsRes);
    setRewards(rewardsRes.data || []);
    setTransactions(txRes.data || []);
    setMenuItems(menuRes.data || []);
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => {
    if (restaurantId) loadData();
  }, [restaurantId, loadData]);

  const handleCreate = async () => {
    if (!restaurantId) return;
    if (!form.name.trim()) { toast.error("Enter reward name."); return; }
    if (!form.points_required || parseInt(form.points_required) <= 0) { toast.error("Enter valid points."); return; }
    if (form.reward_type === "discount" && (!form.reward_value || parseFloat(form.reward_value) <= 0)) {
      toast.error("Enter discount value."); return;
    }

    setSaving(true);
    const result = await createReward(restaurantId, {
      name: form.name,
      description: form.description || undefined,
      points_required: parseInt(form.points_required),
      reward_type: form.reward_type,
      reward_value: form.reward_value ? parseFloat(form.reward_value) : undefined,
      reward_item_id: form.reward_item_id || undefined,
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Reward "${form.name}" created!`);
      setForm({ name: "", description: "", points_required: "", reward_type: "free_item", reward_value: "", reward_item_id: "" });
      setShowCreate(false);
      loadData();
    }
  };

  const handleDelete = async (rewardId: string, name: string) => {
    if (!restaurantId) return;
    if (!confirm(`Delete reward "${name}"?`)) return;
    const result = await deleteReward(restaurantId, rewardId);
    if (result.error) toast.error(result.error as string);
    else { toast.success("Reward deleted"); loadData(); }
  };

  const handleToggle = async (rewardId: string, currentActive: boolean) => {
    if (!restaurantId) return;
    const result = await toggleRewardActive(restaurantId, rewardId, !currentActive);
    if (result.error) toast.error(result.error as string);
    else { toast.success(currentActive ? "Reward deactivated" : "Reward activated"); loadData(); }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg bg-muted animate-pulse" />
            <div className="h-4 w-72 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
              <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
              <div className="h-6 w-12 rounded-lg bg-muted animate-pulse" />
              <div className="h-3 w-20 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
              <div className="h-4 w-4 rounded bg-muted animate-pulse" />
              <div className="h-6 w-16 rounded-lg bg-muted animate-pulse" />
              <div className="h-3 w-24 rounded-lg bg-muted animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const tiers = stats.tiers || { bronze: 0, silver: 0, gold: 0, platinum: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loyalty & Rewards</h1>
          <p className="text-sm text-muted-foreground">
            Manage loyalty tiers, rewards catalog, and track point transactions.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Reward
          </button>
        </div>
      </div>

      {/* Tier Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(Object.keys(TIER_CONFIG) as Array<keyof typeof TIER_CONFIG>).map((tier) => {
          const cfg = TIER_CONFIG[tier];
          const count = tiers[tier] || 0;
          return (
            <div
              key={tier}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-1`}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl">{cfg.emoji}</span>
                <span className={`text-2xl font-bold ${cfg.color}`}>{count}</span>
              </div>
              <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
              <p className="text-[10px] text-muted-foreground">
                {cfg.threshold === 0 ? "Starting tier" : `${cfg.threshold.toLocaleString()}+ points`}
              </p>
            </div>
          );
        })}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-2"><Coins className="h-4 w-4 text-primary" /></div>
          <p className="text-2xl font-bold text-foreground">{(stats.totalEarned || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Points Issued</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-2"><Gift className="h-4 w-4 text-emerald-500" /></div>
          <p className="text-2xl font-bold text-emerald-500">{(stats.totalRedeemed || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Points Redeemed</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="h-4 w-4 text-blue-500" /></div>
          <p className="text-2xl font-bold text-blue-500">{(stats.totalPoints || 0).toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Points in Circulation</p>
        </div>
        <div className="rounded-xl border border-border/50 bg-card p-4">
          <div className="flex items-center gap-2 mb-2"><Users className="h-4 w-4 text-amber-500" /></div>
          <p className="text-2xl font-bold text-amber-500">{stats.activeMembers || 0}</p>
          <p className="text-xs text-muted-foreground">Active Members</p>
        </div>
      </div>

      {/* Create Reward Form */}
      {showCreate && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Add Reward</h3>
            <button onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reward Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Free Gulab Jamun"
                className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Points Required</label>
              <input
                type="number"
                value={form.points_required}
                onChange={(e) => setForm((p) => ({ ...p, points_required: e.target.value }))}
                placeholder="e.g., 500"
                min="1"
                className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Reward Type</label>
              <div className="flex gap-2">
                {REWARD_TYPES.map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, reward_type: type.value }))}
                    className={`flex-1 inline-flex h-10 items-center justify-center gap-1 rounded-xl border text-xs font-medium transition-all ${
                      form.reward_type === type.value
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

            {form.reward_type === "discount" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Discount Value (₹)</label>
                <input
                  type="number"
                  value={form.reward_value}
                  onChange={(e) => setForm((p) => ({ ...p, reward_value: e.target.value }))}
                  placeholder="e.g., 100"
                  min="1"
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            )}

            {form.reward_type === "free_item" && menuItems.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Linked Menu Item</label>
                <select
                  value={form.reward_item_id}
                  onChange={(e) => setForm((p) => ({ ...p, reward_item_id: e.target.value }))}
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="">Select item (optional)</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — ₹{(item.price / 100).toFixed(0)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description (optional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="e.g., Redeem for a free dessert of your choice"
                className="flex h-10 w-full rounded-xl border border-input bg-card px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Reward
            </button>
          </div>
        </div>
      )}

      {/* Rewards Catalog */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" />
          Rewards Catalog
        </h2>
        {rewards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center rounded-2xl border border-border/50 bg-card">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
              <Gift className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-sm font-semibold">No rewards yet</h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              Create rewards that customers can redeem with their loyalty points.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90 transition-all"
            >
              <Plus className="h-3.5 w-3.5" />
              Add First Reward
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rewards.map((reward) => {
              const typeConfig = REWARD_TYPES.find((t) => t.value === reward.reward_type);
              const TypeIcon = typeConfig?.icon || Gift;

              return (
                <div
                  key={reward.id}
                  className={`rounded-2xl border bg-card p-5 space-y-3 transition-all ${
                    reward.is_active ? "border-border/50" : "border-border/30 opacity-60"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                        <TypeIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">{reward.name}</h3>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {reward.reward_type.replace("_", " ")}
                          {reward.reward_value && ` — ₹${reward.reward_value}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 rounded-lg bg-amber-500/10 px-2.5 py-1 border border-amber-500/20">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-bold text-amber-600">{reward.points_required}</span>
                    </div>
                  </div>

                  {reward.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{reward.description}</p>
                  )}

                  {reward.menu_items?.name && (
                    <p className="text-xs text-primary/80">
                      🍽️ {reward.menu_items.name}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                    <button
                      onClick={() => handleToggle(reward.id, reward.is_active)}
                      className={`inline-flex h-8 px-3 items-center gap-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        reward.is_active
                          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {reward.is_active ? (
                        <><ToggleRight className="h-3.5 w-3.5" /> Active</>
                      ) : (
                        <><ToggleLeft className="h-3.5 w-3.5" /> Inactive</>
                      )}
                    </button>
                    <button
                      onClick={() => handleDelete(reward.id, reward.name)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Crown className="h-5 w-5 text-primary" />
          Recent Transactions
        </h2>
        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-border/50 bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No loyalty transactions yet. Points are automatically awarded when customers place orders.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Type</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Points</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-medium">
                        {tx.customers?.whatsapp_name || "Unknown"}
                      </td>
                      <td className="px-4 py-3">
                        {tx.type === "earn" ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                            <ArrowUpRight className="h-3 w-3" /> Earned
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-semibold">
                            <ArrowDownLeft className="h-3 w-3" /> Redeemed
                          </span>
                        )}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold font-mono ${
                        tx.type === "earn" ? "text-emerald-600" : "text-amber-600"
                      }`}>
                        {tx.type === "earn" ? "+" : ""}{tx.points}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                        {tx.description || "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {new Date(tx.created_at).toLocaleDateString("en-IN", {
                          day: "numeric", month: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
