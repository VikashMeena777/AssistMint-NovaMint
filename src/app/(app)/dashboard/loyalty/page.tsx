"use client";

import { Gift, Plus, Trophy, Star } from "lucide-react";

export default function LoyaltyPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Loyalty & Rewards</h1>
          <p className="text-sm text-muted-foreground">
            Automated points, tiers, and rewards to keep customers coming back.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase text-amber-600">Coming Soon</span>
          <button disabled className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary/50 px-5 text-sm font-semibold text-primary-foreground cursor-not-allowed">
            <Plus className="h-4 w-4" />
            Add Reward
          </button>
        </div>
      </div>

      {/* Tier Overview */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { tier: "Bronze", range: "0-499 pts", icon: "🥉", count: 0 },
          { tier: "Silver", range: "500-999 pts", icon: "🥈", count: 0 },
          { tier: "Gold", range: "1000-2499 pts", icon: "🥇", count: 0 },
          { tier: "Platinum", range: "2500+ pts", icon: "💎", count: 0 },
        ].map((t) => (
          <div key={t.tier} className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{t.icon}</span>
              <span className="text-sm font-semibold">{t.tier}</span>
            </div>
            <p className="text-2xl font-bold">{t.count}</p>
            <p className="text-xs text-muted-foreground">{t.range}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Gift className="h-9 w-9 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Set up your loyalty program</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Create rewards that customers can redeem with their loyalty points.
            Points are earned automatically with every order.
          </p>
        </div>
      </div>
    </div>
  );
}
