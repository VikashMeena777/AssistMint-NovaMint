"use client";

import { motion, Variants } from "framer-motion";
import {
  ShoppingCart,
  CreditCard,
  MessageSquare,
  Users,
} from "lucide-react";
import { StatusPill, orderStatusTone } from "@/components/dashboard/status-pill";

const statsContainerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const statsItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

interface StatCardProps {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClassName: string;
  /** The active/primary stat carries a 3px cobalt left accent */
  accent?: boolean;
}

function StatCard({ label, value, icon: Icon, iconClassName, accent = false }: StatCardProps) {
  return (
    <motion.div
      variants={statsItemVariants}
      className={`relative rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-[box-shadow,transform] duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
        accent ? "border-l-[3px] border-l-primary" : ""
      }`}
    >
      {/* Hairline top rule with a small mono label */}
      <div className="flex items-center justify-between border-t border-border pt-2">
        <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
          <Icon className={`h-4 w-4 ${iconClassName}`} />
        </div>
      </div>
      <p className="mt-3 font-mono text-2xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </motion.div>
  );
}

interface DashboardStatsGridProps {
  todayOrders: number;
  todayRevenue: number;
  activeChats: number;
  totalCustomers: number;
}

export function DashboardStatsGrid({
  todayOrders,
  todayRevenue,
  activeChats,
  totalCustomers,
}: DashboardStatsGridProps) {
  return (
    <motion.div
      variants={statsContainerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StatCard
        label="Orders Today"
        value={todayOrders.toLocaleString("en-IN")}
        icon={ShoppingCart}
        iconClassName="text-primary"
        accent
      />
      <StatCard
        label="Revenue Today"
        value={`₹${(todayRevenue / 100).toLocaleString("en-IN")}`}
        icon={CreditCard}
        iconClassName="text-success"
      />
      <StatCard
        label="Active Chats"
        value={activeChats.toLocaleString("en-IN")}
        icon={MessageSquare}
        iconClassName="text-primary"
      />
      <StatCard
        label="Customers"
        value={totalCustomers.toLocaleString("en-IN")}
        icon={Users}
        iconClassName="text-primary"
      />
    </motion.div>
  );
}

interface RecentOrdersListProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentOrders: any[];
}

export function RecentOrdersList({ recentOrders }: RecentOrdersListProps) {
  return (
    <motion.div
      variants={statsContainerVariants}
      initial="hidden"
      animate="show"
      className="divide-y divide-border/50"
    >
      {recentOrders.map((order) => (
        <motion.div
          key={order.id}
          variants={statsItemVariants}
          className="flex items-center justify-between rounded-lg py-3 first:pt-0 last:pb-0 hover:bg-secondary/60"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                <span className="font-mono tabular-nums">#{order.order_number}</span> ·{" "}
                {order.customers?.saved_name || order.customers?.whatsapp_name || "Customer"}
              </p>
              <p className="flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
                {new Date(order.created_at).toLocaleString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-right">
            <p className="font-mono text-sm font-semibold tabular-nums">
              ₹{((order.total || 0) / 100).toLocaleString("en-IN")}
            </p>
            <StatusPill tone={orderStatusTone(order.status)}>
              {order.status}
            </StatusPill>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
