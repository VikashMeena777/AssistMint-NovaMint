"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Menu as HamburgerIcon, X, ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import PageTransition from "@/components/dashboard/page-transition";
import OrderRealtimeListener from "@/components/dashboard/order-realtime-listener";
import { getBusinessTypeConfig, type BusinessType } from "@/lib/utils/business-types";
import { springSoft } from "@/components/motion/transitions";

// ─── Lucide-animated icons (draw on parent-row hover) ──────
import { HomeIcon } from "@/components/icons/home/home";
import { MenuIcon } from "@/components/icons/menu/menu";
import { TruckIcon } from "@/components/icons/truck/truck";
import { UsersIcon } from "@/components/icons/users/users";
import { UserPlusIcon } from "@/components/icons/user-plus/user-plus";
import { MessageCircleIcon } from "@/components/icons/message-circle/message-circle";
import { MessageSquareIcon } from "@/components/icons/message-square/message-square";
import { CreditCardIcon } from "@/components/icons/credit-card/credit-card";
import { TicketIcon } from "@/components/icons/ticket/ticket";
import { SendIcon } from "@/components/icons/send/send";
import { PartyPopperIcon } from "@/components/icons/party-popper/party-popper";
import { HeartIcon } from "@/components/icons/heart/heart";
import { ChartLineIcon } from "@/components/icons/chart-line/chart-line";
import { ClockIcon } from "@/components/icons/clock/clock";
import { SettingsIcon } from "@/components/icons/settings/settings";
import { LogoutIcon } from "@/components/icons/logout/logout";
import { LayoutGridIcon } from "@/components/icons/layout-grid/layout-grid";
import { GraduationCapIcon } from "@/components/icons/graduation-cap/graduation-cap";
import { StethoscopeIcon } from "@/components/icons/stethoscope/stethoscope";
import { SparklesIcon } from "@/components/icons/sparkles/sparkles";
import { CompassIcon } from "@/components/icons/compass/compass";
import { ZapIcon } from "@/components/icons/zap/zap";

// Every lucide-animated icon exposes this exact handle shape
type SidebarIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

type AnimatedSidebarIcon = React.ComponentType<{
  size?: number;
  className?: string;
  ref?: React.Ref<SidebarIconHandle>;
}>;

interface SidebarItem {
  href: string;
  label: string;
  icon: AnimatedSidebarIcon;
}

// Isolated sidebar items for each business type
const getSidebarItems = (businessType: BusinessType): SidebarItem[] => {
  const config = getBusinessTypeConfig(businessType);
  const terms = config.terms;

  switch (businessType) {
    case 'salon_spa':
      return [
        { href: "/dashboard", label: "Overview", icon: HomeIcon },
        { href: "/dashboard/services", label: terms.catalog, icon: SparklesIcon },
        { href: "/dashboard/appointments", label: terms.bookings, icon: ClockIcon },
        { href: "/dashboard/staff", label: terms.staffTitle, icon: UserPlusIcon },
        { href: "/dashboard/clients", label: terms.customers, icon: UsersIcon },
        { href: "/dashboard/packages", label: terms.combo, icon: LayoutGridIcon },
        { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircleIcon },
        { href: "/dashboard/payments", label: "Payments", icon: CreditCardIcon },
        { href: "/dashboard/coupons", label: "Coupons", icon: TicketIcon },
        { href: "/dashboard/campaigns", label: "Campaigns", icon: SendIcon },
        { href: "/dashboard/loyalty", label: "Loyalty", icon: PartyPopperIcon },
        { href: "/dashboard/feedback", label: "Reviews", icon: HeartIcon },
        { href: "/dashboard/analytics", label: "Analytics", icon: ChartLineIcon },
      ];

    case 'healthcare':
      return [
        { href: "/dashboard", label: "Overview", icon: HomeIcon },
        { href: "/dashboard/services", label: terms.catalog, icon: StethoscopeIcon },
        { href: "/dashboard/appointments", label: terms.bookings, icon: ClockIcon },
        { href: "/dashboard/staff", label: terms.staffTitle, icon: UserPlusIcon },
        { href: "/dashboard/inquiries", label: "Inquiries", icon: MessageSquareIcon },
        { href: "/dashboard/patients", label: terms.customers, icon: UsersIcon },
        { href: "/dashboard/packages", label: terms.combo, icon: LayoutGridIcon },
        { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircleIcon },
        { href: "/dashboard/payments", label: "Payments", icon: CreditCardIcon },
        { href: "/dashboard/campaigns", label: "Campaigns", icon: SendIcon },
        { href: "/dashboard/feedback", label: "Reviews", icon: HeartIcon },
        { href: "/dashboard/analytics", label: "Analytics", icon: ChartLineIcon },
      ];

    case 'education':
      return [
        { href: "/dashboard", label: "Overview", icon: HomeIcon },
        { href: "/dashboard/courses", label: terms.catalog, icon: GraduationCapIcon },
        { href: "/dashboard/appointments", label: terms.bookings, icon: ClockIcon },
        { href: "/dashboard/staff", label: terms.staffTitle, icon: UserPlusIcon },
        { href: "/dashboard/inquiries", label: "Inquiries", icon: MessageSquareIcon },
        { href: "/dashboard/students", label: terms.customers, icon: UsersIcon },
        { href: "/dashboard/packages", label: terms.combo, icon: LayoutGridIcon },
        { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircleIcon },
        { href: "/dashboard/payments", label: "Fee Payments", icon: CreditCardIcon },
        { href: "/dashboard/campaigns", label: "Student Broadcasts", icon: SendIcon },
        { href: "/dashboard/feedback", label: "Reviews", icon: HeartIcon },
        { href: "/dashboard/analytics", label: "Analytics", icon: ChartLineIcon },
      ];

    case 'retail':
      return [
        { href: "/dashboard", label: "Overview", icon: HomeIcon },
        { href: "/dashboard/products", label: terms.catalog, icon: CompassIcon },
        { href: "/dashboard/orders", label: terms.bookings, icon: TruckIcon },
        { href: "/dashboard/customers", label: terms.customers, icon: UsersIcon },
        { href: "/dashboard/packages", label: terms.combo, icon: LayoutGridIcon },
        { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircleIcon },
        { href: "/dashboard/payments", label: "Payments", icon: CreditCardIcon },
        { href: "/dashboard/coupons", label: "Coupons", icon: TicketIcon },
        { href: "/dashboard/campaigns", label: "Promotions", icon: SendIcon },
        { href: "/dashboard/loyalty", label: "Loyalty Points", icon: PartyPopperIcon },
        { href: "/dashboard/feedback", label: "Reviews", icon: HeartIcon },
        { href: "/dashboard/analytics", label: "Analytics", icon: ChartLineIcon },
      ];

    case 'services':
      return [
        { href: "/dashboard", label: "Overview", icon: HomeIcon },
        { href: "/dashboard/services", label: terms.catalog, icon: ZapIcon },
        { href: "/dashboard/appointments", label: terms.bookings, icon: ClockIcon },
        { href: "/dashboard/staff", label: terms.staffTitle, icon: UserPlusIcon },
        { href: "/dashboard/customers", label: terms.customers, icon: UsersIcon },
        { href: "/dashboard/packages", label: terms.combo, icon: LayoutGridIcon },
        { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircleIcon },
        { href: "/dashboard/payments", label: "Payments", icon: CreditCardIcon },
        { href: "/dashboard/campaigns", label: "Campaigns", icon: SendIcon },
        { href: "/dashboard/feedback", label: "Ratings & Reviews", icon: HeartIcon },
        { href: "/dashboard/analytics", label: "Analytics", icon: ChartLineIcon },
      ];

    case 'food_beverage':
    default:
      return [
        { href: "/dashboard", label: "Overview", icon: HomeIcon },
        { href: "/dashboard/menu", label: terms.catalog, icon: MenuIcon },
        { href: "/dashboard/orders", label: terms.bookings, icon: TruckIcon },
        { href: "/dashboard/customers", label: terms.customers, icon: UsersIcon },
        { href: "/dashboard/combos", label: terms.combo, icon: LayoutGridIcon },
        { href: "/dashboard/conversations", label: "Conversations", icon: MessageCircleIcon },
        { href: "/dashboard/payments", label: "Payments", icon: CreditCardIcon },
        { href: "/dashboard/coupons", label: "Coupons", icon: TicketIcon },
        { href: "/dashboard/campaigns", label: "Campaigns", icon: SendIcon },
        { href: "/dashboard/loyalty", label: "Loyalty", icon: PartyPopperIcon },
        { href: "/dashboard/feedback", label: "Feedback", icon: HeartIcon },
        { href: "/dashboard/analytics", label: "Analytics", icon: ChartLineIcon },
      ];
  }
};



export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [restaurantName, setRestaurantName] = useState("My Business");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>('food_beverage');
  // Icon handles keyed by nav href — each row registers its handle on mount,
  // the row's hover handlers drive the draw animation through this map.
  const iconRefs = useRef(
    new Map<string, React.RefObject<SidebarIconHandle | null>>()
  );

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, business_type")
        .eq("owner_id", user.id)
        .single();
      if (data) {
        const d = data as Record<string, string>;
        setRestaurantName(d.name);
        setRestaurantId(d.id);
        if (d.business_type) setBusinessType(d.business_type as BusinessType);
      }
    })();
  }, []);

  const businessLabel = getBusinessTypeConfig(businessType).label;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Real-time order notification listener */}
      {restaurantId && <OrderRealtimeListener restaurantId={restaurantId} />}
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
          {/* Brand header — logo + wordmark + business-type chip */}
          <div className="flex h-16 items-center justify-between gap-2 border-b border-sidebar-border/40 px-5">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="relative flex h-8 w-8 overflow-hidden rounded-lg border border-sidebar-border/60 transition-transform duration-300 group-hover:scale-105">
                <Image
                  src="/logo.jpg"
                  alt="AssistMint Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <span className="text-base font-bold tracking-tight">
                Assist<span className="text-sidebar-primary">Mint</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              <span
                title={businessLabel}
                className="hidden sm:inline-flex max-w-[120px] truncate rounded-full border border-sidebar-border/60 bg-sidebar-accent/30 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/70"
              >
                {businessLabel}
              </span>
              <button
                onClick={() => setSidebarOpen(false)}
                aria-label="Close menu"
                className="lg:hidden text-sidebar-foreground/60 hover:text-sidebar-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1.5 scrollbar-thin">
            {getSidebarItems(businessType).map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                iconRefs={iconRefs}
                onClick={() => setSidebarOpen(false)}
              />
            ))}
          </nav>

          {/* Bottom — Settings + Sign Out (pinned) */}
          <div className="border-t border-sidebar-border/40 p-4 space-y-1.5">
            <SidebarLink
              href="/dashboard/settings"
              label="Settings"
              icon={SettingsIcon}
              iconRefs={iconRefs}
              onClick={() => setSidebarOpen(false)}
            />
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
            aria-label="Open menu"
            className="lg:hidden text-muted-foreground hover:text-foreground"
          >
            <HamburgerIcon className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          {/* Restaurant Selector → links to Settings */}
          <Link
            href="/dashboard/settings"
            className="glass glass-interactive hidden sm:flex items-center gap-2.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold active:scale-[0.98] active:translate-y-0"
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
  iconRefs,
  onClick,
}: {
  href: string;
  label: string;
  icon: AnimatedSidebarIcon;
  iconRefs: React.RefObject<Map<string, React.RefObject<SidebarIconHandle | null>>>;
  onClick?: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
  const iconRef = useRef<SidebarIconHandle>(null);

  // Register this row's icon handle in the shared map (keyed by href)
  useEffect(() => {
    const map = iconRefs.current;
    map.set(href, iconRef);
    return () => {
      if (map.get(href) === iconRef) map.delete(href);
    };
  }, [href, iconRefs, iconRef]);

  return (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={() => iconRefs.current.get(href)?.current?.startAnimation()}
      onMouseLeave={() => iconRefs.current.get(href)?.current?.stopAnimation()}
      className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
        isActive
          ? "bg-primary/10 text-primary border border-primary/15 shadow-sm shadow-primary/5"
          : "border border-transparent text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground hover:translate-x-1"
      }`}
    >
      {isActive && (
        <motion.span
          layoutId="sidebar-active-rail"
          transition={springSoft}
          className="absolute -left-3 inset-y-1.5 w-[3px] rounded-full bg-primary"
        />
      )}
      <Icon
        ref={iconRef}
        size={16}
        className={`shrink-0 ${isActive ? "text-primary" : "text-sidebar-foreground/60"}`}
      />
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
  const iconRef = useRef<SidebarIconHandle>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive hover:translate-x-1 transition-all duration-200"
    >
      <LogoutIcon ref={iconRef} size={16} className="shrink-0" />
      Sign Out
    </button>
  );
}
