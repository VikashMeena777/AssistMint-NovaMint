"use client";

import { motion, Variants } from "framer-motion";
import {
  ShoppingCart,
  CreditCard,
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
} from "lucide-react";

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
      <motion.div variants={statsItemVariants} className="glass-interactive rounded-2xl p-5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-2xl font-bold font-mono">{todayOrders}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Today&apos;s Orders</p>
      </motion.div>

      <motion.div variants={statsItemVariants} className="glass-interactive rounded-2xl p-5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
            <CreditCard className="h-5 w-5 text-emerald-500" />
          </div>
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-2xl font-bold font-mono">₹{(todayRevenue / 100).toLocaleString("en-IN")}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Revenue</p>
      </motion.div>

      <motion.div variants={statsItemVariants} className="glass-interactive rounded-2xl p-5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <MessageSquare className="h-5 w-5 text-blue-500" />
          </div>
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-2xl font-bold font-mono">{activeChats}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Active Chats</p>
      </motion.div>

      <motion.div variants={statsItemVariants} className="glass-interactive rounded-2xl p-5 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Users className="h-5 w-5 text-amber-500" />
          </div>
          <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <p className="mt-3 text-2xl font-bold font-mono">{totalCustomers}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">Customers</p>
      </motion.div>
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
          className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingCart className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                <span className="font-mono">#{order.order_number}</span> ·{" "}
                {order.customers?.saved_name || order.customers?.whatsapp_name || "Customer"}
              </p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                <Clock className="h-3 w-3" />
                {new Date(order.created_at).toLocaleString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold font-mono">
              ₹{(order.total || 0).toLocaleString("en-IN")}
            </p>
            <span
              className={`inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                order.status === "delivered"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : order.status === "cancelled"
                  ? "bg-red-500/10 text-red-600"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {order.status}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
