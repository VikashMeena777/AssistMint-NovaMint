"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  LayoutDashboard,
  UtensilsCrossed,
  ShoppingCart,
  Users,
  MessageSquare,
  BarChart3,
  Gift,
  Megaphone,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  Tag,
  Layers,
  ChevronDown,
} from "lucide-react";

const sidebarItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart },
  { href: "/dashboard/customers", label: "Customers", icon: Users },
  { href: "/dashboard/conversations", label: "Conversations", icon: MessageSquare },
  { href: "/dashboard/payments", label: "Payments", icon: CreditCard },
  { href: "/dashboard/coupons", label: "Coupons", icon: Tag },
  { href: "/dashboard/combos", label: "Combos", icon: Layers },
  { href: "/dashboard/campaigns", label: "Campaigns", icon: Megaphone },
  { href: "/dashboard/loyalty", label: "Loyalty", icon: Gift },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar transform transition-transform duration-200 lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
                A
                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-mint animate-pulse" />
              </div>
              <span className="text-base font-bold">
                Assist<span className="text-sidebar-primary">Mint</span>
              </span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {sidebarItems.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          {/* Bottom */}
          <div className="border-t border-sidebar-border p-3">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-background px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Restaurant Selector (placeholder) */}
          <button className="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm hover:bg-muted transition-colors">
            <div className="h-5 w-5 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">R</div>
            <span className="font-medium">My Restaurant</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

// ─── Sidebar Link ───────────────────────────

function SidebarLink({
  href,
  label,
  icon: Icon,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-sidebar-primary" : ""}`} />
      {label}
      {isActive && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
      )}
    </Link>
  );
}

// ─── Logout Button ──────────────────────────

function LogoutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </button>
  );
}
