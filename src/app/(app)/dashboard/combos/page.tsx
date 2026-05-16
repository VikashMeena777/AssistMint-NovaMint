"use client";

import { Layers, Plus } from "lucide-react";

export default function CombosPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Combo Deals</h1>
          <p className="text-sm text-muted-foreground">
            Bundle menu items into meal deals with special pricing.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase text-amber-600">Coming Soon</span>
          <button disabled className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary/50 px-5 text-sm font-semibold text-primary-foreground cursor-not-allowed">
            <Plus className="h-4 w-4" />
            Create Combo
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/50 bg-card">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Layers className="h-9 w-9 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No combo deals yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Increase average order value by creating meal combos. Bundle popular
            items together at a discounted price.
          </p>
          <button className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 hover:opacity-90 transition-all">
            <Plus className="h-4 w-4" />
            Create First Combo
          </button>
        </div>
      </div>
    </div>
  );
}
