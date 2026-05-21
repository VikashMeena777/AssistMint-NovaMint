"use client";

import { useEffect, useState } from "react";
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
import { TrendingUp, MessageSquare, ShoppingBag } from "lucide-react";

interface ChartData {
  date: string;
  sales: number;
  orders: number;
  chats: number;
}

interface DashboardChartsProps {
  data: ChartData[];
}

export default function DashboardCharts({ data }: DashboardChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-80 w-full rounded-2xl border border-border/50 bg-card/50 animate-pulse flex items-center justify-center text-muted-foreground text-xs">
          Loading charts...
        </div>
        <div className="h-80 w-full rounded-2xl border border-border/50 bg-card/50 animate-pulse flex items-center justify-center text-muted-foreground text-xs">
          Loading charts...
        </div>
      </div>
    );
  }

  // Format tooltip currency values
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Sales Trend Chart */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Sales Trend (7 Days)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily revenue from delivered orders
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
            Revenue
          </span>
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
                formatter={(value: any) => [formatCurrency(Number(value || 0)), "Sales"]}
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
      <div className="glass rounded-2xl p-6 relative overflow-hidden transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-500" />
              Chats vs. Orders
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Daily conversations mapped to orders placed
            </p>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            Conversion
          </span>
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
