"use client";

// The recharts implementation — loaded lazily via next/dynamic from
// dashboard-charts.tsx so the heavy chart library never blocks the
// dashboard's first paint.

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
import { TrendingUp, ShoppingBag } from "lucide-react";

interface ChartData {
  date: string;
  sales: number;
  orders: number;
  chats: number;
}

interface ChartsImplProps {
  data: ChartData[];
}

// Format tooltip currency values
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);

export default function ChartsImpl({ data }: ChartsImplProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Sales Trend Chart */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
              <TrendingUp className="h-4 w-4 text-primary" />
              Sales Trend (7 Days)
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Daily revenue from delivered orders
            </p>
          </div>
          <StatusBadge label="Revenue" />
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="date"
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
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value) => [formatCurrency(Number(value || 0)), "Sales"]}
                labelStyle={{ fontWeight: "bold", color: "var(--foreground)" }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="var(--primary)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conversion Chart: Chats vs Orders */}
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-foreground">
              <ShoppingBag className="h-4 w-4 text-success" />
              Chats vs. Orders
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Daily conversations mapped to orders placed
            </p>
          </div>
          <StatusBadge label="Conversion" tone="success" />
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
              <XAxis
                dataKey="date"
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
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: "12px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                }}
                labelStyle={{ fontWeight: "bold", color: "var(--foreground)" }}
              />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", color: "var(--muted-foreground)" }}
              />
              <Bar dataKey="chats" name="Conversations" fill="var(--chart-2)" radius={[4, 4, 0, 0]} barSize={16} />
              <Bar dataKey="orders" name="Orders Placed" fill="var(--primary)" radius={[4, 4, 0, 0]} barSize={16} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ label, tone = "primary" }: { label: string; tone?: "primary" | "success" }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
        tone === "success"
          ? "border-success/25 bg-success/10 text-success"
          : "border-primary/25 bg-primary/10 text-primary"
      }`}
    >
      {label}
    </span>
  );
}
