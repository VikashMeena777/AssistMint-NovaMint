"use client";

import { CreditCard, Search, Download, ArrowDownLeft, ArrowUpRight } from "lucide-react";

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground">
            Track all Cashfree payments, refunds, and settlements.
          </p>
        </div>
        <button className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted transition-colors">
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Revenue", value: "₹0", icon: ArrowDownLeft, color: "text-success" },
          { label: "Pending", value: "₹0", icon: CreditCard, color: "text-warning" },
          { label: "Refunded", value: "₹0", icon: ArrowUpRight, color: "text-destructive" },
          { label: "Net Revenue", value: "₹0", icon: CreditCard, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-card p-4">
            <stat.icon className={`h-4 w-4 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border/50 bg-card">
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
      </div>
    </div>
  );
}
