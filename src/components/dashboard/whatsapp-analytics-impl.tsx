"use client";

// The recharts implementation for the WhatsApp analytics section —
// loaded lazily via next/dynamic from whatsapp-analytics.tsx so the
// heavy chart library never blocks the analytics page's first paint.

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  Legend,
  CartesianGrid,
} from "recharts";
import { MessageSquare, IndianRupee } from "lucide-react";

export interface WaChartPoint {
  date: string;
  sent: number;
  delivered: number;
  read: number;
}

export interface WaCostPoint {
  date: string;
  cost: number;
}

interface WhatsAppChartsImplProps {
  messaging: WaChartPoint[];
  costByDay: WaCostPoint[];
}

const formatRupees = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export default function WhatsAppChartsImpl({ messaging, costByDay }: WhatsAppChartsImplProps) {
  const messagingData = messaging.map((m) => ({ ...m, label: shortDate(m.date) }));
  const costData = costByDay.map((c) => ({ ...c, label: shortDate(c.date) }));
  const hasCost = costData.some((c) => c.cost > 0);

  const tooltipStyle = {
    backgroundColor: "var(--card)",
    borderColor: "var(--border)",
    borderRadius: "12px",
    fontSize: "12px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Sent vs delivered */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
              <MessageSquare className="h-4 w-4 text-primary" />
              Sent vs. Delivered
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              WhatsApp messages out vs. confirmed on-device (30 days)
            </p>
          </div>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
            Delivery
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={messagingData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                dx={-10}
              />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ fontWeight: "bold", color: "var(--foreground)" }} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", color: "var(--muted-foreground)" }}
              />
              <Bar dataKey="sent" name="Sent" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={14} />
              <Bar dataKey="delivered" name="Delivered" fill="var(--chart-3)" radius={[4, 4, 0, 0]} barSize={14} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost */}
      {hasCost ? (
        <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
                <IndianRupee className="h-4 w-4 text-seal" />
                WhatsApp spend
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Daily Meta charges for delivered template messages (30 days)
              </p>
            </div>
            <span className="rounded-full border border-seal/30 bg-accent px-2 py-0.5 text-[11px] font-medium text-seal-foreground">
              Cost
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={costData} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="waCostGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--seal)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--seal)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                <XAxis
                  dataKey="label"
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                />
                <YAxis
                  stroke="var(--muted-foreground)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `₹${val}`}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ fontWeight: "bold", color: "var(--foreground)" }}
                  formatter={(value) => [formatRupees(Number(value || 0)), "Spend"]}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  name="Spend"
                  stroke="var(--seal)"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#waCostGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 p-6 text-center">
          <IndianRupee className="h-8 w-8 text-muted-foreground" strokeWidth={1.75} />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
            No WhatsApp charges in this period. Note: from 1 Oct 2026 Meta also charges per service (AI reply) message —
            hides cost for accounts on a shared credit line.
          </p>
        </div>
      )}
    </div>
  );
}
