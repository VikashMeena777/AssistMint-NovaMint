"use client";

import { Megaphone, Plus } from "lucide-react";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            Send targeted WhatsApp promotions to your customer segments.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-amber-500/10 px-3 py-1 text-[11px] font-bold uppercase text-amber-600">Coming Soon</span>
          <button disabled className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary/50 px-5 text-sm font-semibold text-primary-foreground cursor-not-allowed">
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Sent", value: "0" },
          { label: "Delivered", value: "0%" },
          { label: "Read Rate", value: "0%" },
          { label: "Replies", value: "0" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card">
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 mb-6">
            <Megaphone className="h-9 w-9 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">No campaigns yet</h3>
          <p className="mt-2 text-sm text-muted-foreground max-w-md">
            Create targeted WhatsApp campaigns to promote new menu items,
            send offers, and re-engage inactive customers.
          </p>
        </div>
      </div>
    </div>
  );
}
