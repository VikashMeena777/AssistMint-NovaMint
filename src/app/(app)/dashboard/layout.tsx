"use client";

import { useState, useEffect } from "react";
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
import PageTransition from "@/components/dashboard/page-transition";

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
  const [restaurantName, setRestaurantName] = useState("My Restaurant");

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("restaurants")
        .select("name")
        .eq("owner_id", user.id)
        .single();
      if (data) setRestaurantName((data as Record<string, string>).name);
    })();
  }, []);

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
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border transform transition-all duration-300 lg:relative lg:translate-x-0 lg:my-4 lg:ml-4 lg:mr-0 lg:h-[calc(100vh-2rem)] lg:rounded-2xl lg:border lg:border-sidebar-border/40 lg:shadow-xl lg:shadow-black/5 lg:bg-sidebar/60 lg:backdrop-blur-xl ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-between border-b border-sidebar-border/40 px-5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
                A
                <div className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-mint animate-pulse" />
              </div>
              <span className="text-base font-bold tracking-tight">
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
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-thin">
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
          <div className="border-t border-sidebar-border/40 p-4">
            <LogoutButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border/20 bg-background/50 backdrop-blur-md px-4 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Restaurant Selector → links to Settings */}
          <Link
            href="/dashboard/settings"
            className="hidden sm:flex items-center gap-2.5 rounded-xl border border-border/30 bg-muted/20 px-3.5 py-1.5 text-xs font-semibold hover:bg-muted/40 hover:border-border/60 transition-all active:scale-[0.98]"
          >
            <div className="h-5 w-5 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
              {restaurantName.charAt(0).toUpperCase()}
            </div>
            <span className="font-semibold max-w-[150px] truncate">{restaurantName}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Link>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <PageTransition>{children}</PageTransition>
        </main>
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
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/15 shadow-sm shadow-primary/5"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:translate-x-0.5"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground/60"}`} />
      <span className="truncate">{label}</span>
      {isActive && (
        <div className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
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
