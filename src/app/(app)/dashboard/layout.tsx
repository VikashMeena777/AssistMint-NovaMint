"use client";

// ─── Dashboard shell — "Mint Rail" (Bahikhata) ─────────────────
// 64px icon rail (grouped) + 260px hover flyout with the P4 sliding
// pill + pinnable column at ≥1280px + ⌘K command palette (P14) +
// mobile bottom tab bar with a thumb-reachable "More" sheet.
// Every existing dashboard route keeps its URL — pure IA regrouping.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  CreditCard,
  GraduationCap,
  Heart,
  Home,
  LayoutGrid,
  LogOut,
  Megaphone,
  MessageCircle,
  MessageSquare,
  MoreHorizontal,
  PartyPopper,
  Pin,
  PinOff,
  Scissors,
  Search,
  Send,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Ticket,
  UserPlus,
  Users,
  UtensilsCrossed,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import PageTransition from "@/components/dashboard/page-transition";
import OrderRealtimeListener from "@/components/dashboard/order-realtime-listener";
import {
  CommandPalette,
  type CommandGroup,
  type CommandItem,
} from "@/components/dashboard/command-palette";
import { getBusinessTypeConfig, type BusinessType } from "@/lib/utils/business-types";
import { spring } from "@/components/motion/tokens";

// ─── Rail configuration ──────────────────────────────────────

interface RailItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface RailGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  items: RailItem[];
}

const it = (href: string, label: string, icon: LucideIcon): RailItem => ({
  href,
  label,
  icon,
});

/** Per-type icon for the Catalog rail group */
const CATALOG_ICONS: Record<BusinessType, LucideIcon> = {
  food_beverage: UtensilsCrossed,
  salon_spa: Scissors,
  healthcare: Stethoscope,
  education: GraduationCap,
  retail: ShoppingBag,
  services: Wrench,
};

/** Per-type primary catalog route (menu / services / courses / products) */
const CATALOG_ROUTES: Record<BusinessType, string> = {
  food_beverage: "/dashboard/menu",
  salon_spa: "/dashboard/services",
  healthcare: "/dashboard/services",
  education: "/dashboard/courses",
  retail: "/dashboard/products",
  services: "/dashboard/services",
};

/** Per-type "people" route (customers / clients / patients / students) */
const CUSTOMER_ROUTES: Record<BusinessType, string> = {
  food_beverage: "/dashboard/customers",
  salon_spa: "/dashboard/clients",
  healthcare: "/dashboard/patients",
  education: "/dashboard/students",
  retail: "/dashboard/customers",
  services: "/dashboard/customers",
};

/**
 * Map the existing per-business-type routes into the six Mint Rail
 * groups (+ Appointments where supported). Labels use the
 * business-type terms from getBusinessTypeConfig, exactly as before.
 */
function getRailGroups(businessType: BusinessType): RailGroup[] {
  const config = getBusinessTypeConfig(businessType);
  const t = config.terms;
  const conversations = it("/dashboard/conversations", "Conversations", MessageCircle);
  const payments = it("/dashboard/payments", "Payments", CreditCard);
  const campaigns = it("/dashboard/campaigns", "Campaigns", Send);
  const analytics = it("/dashboard/analytics", "Analytics", BarChart3);

  switch (businessType) {
    case "salon_spa":
      return [
        {
          id: "inbox", label: "Inbox", icon: MessageSquare,
          items: [conversations, it("/dashboard/feedback", "Reviews", Heart)],
        },
        {
          id: "sell", label: "Sell", icon: ShoppingCart,
          items: [payments, it("/dashboard/coupons", "Coupons", Ticket)],
        },
        {
          id: "appointments", label: "Appointments", icon: CalendarDays,
          items: [it("/dashboard/appointments", t.bookings, CalendarDays)],
        },
        {
          id: "catalog", label: "Catalog", icon: CATALOG_ICONS.salon_spa,
          items: [
            it("/dashboard/services", t.catalog, Sparkles),
            it("/dashboard/packages", t.combo, LayoutGrid),
          ],
        },
        {
          id: "people", label: "People", icon: Users,
          items: [
            it("/dashboard/staff", t.staffTitle, UserPlus),
            it("/dashboard/clients", t.customers, Users),
          ],
        },
        {
          id: "grow", label: "Grow", icon: Megaphone,
          items: [campaigns, it("/dashboard/loyalty", "Loyalty", PartyPopper)],
        },
        { id: "insights", label: "Insights", icon: BarChart3, items: [analytics] },
      ];

    case "healthcare":
      return [
        {
          id: "inbox", label: "Inbox", icon: MessageSquare,
          items: [
            it("/dashboard/inquiries", "Inquiries", MessageSquare),
            conversations,
            it("/dashboard/feedback", "Reviews", Heart),
          ],
        },
        { id: "sell", label: "Sell", icon: ShoppingCart, items: [payments] },
        {
          id: "appointments", label: "Appointments", icon: CalendarDays,
          items: [it("/dashboard/appointments", t.bookings, CalendarDays)],
        },
        {
          id: "catalog", label: "Catalog", icon: CATALOG_ICONS.healthcare,
          items: [
            it("/dashboard/services", t.catalog, Sparkles),
            it("/dashboard/packages", t.combo, LayoutGrid),
          ],
        },
        {
          id: "people", label: "People", icon: Users,
          items: [
            it("/dashboard/staff", t.staffTitle, UserPlus),
            it("/dashboard/patients", t.customers, Users),
          ],
        },
        { id: "grow", label: "Grow", icon: Megaphone, items: [campaigns] },
        { id: "insights", label: "Insights", icon: BarChart3, items: [analytics] },
      ];

    case "education":
      return [
        {
          id: "inbox", label: "Inbox", icon: MessageSquare,
          items: [
            it("/dashboard/inquiries", "Inquiries", MessageSquare),
            conversations,
            it("/dashboard/feedback", "Reviews", Heart),
          ],
        },
        { id: "sell", label: "Sell", icon: ShoppingCart, items: [it("/dashboard/payments", "Fee Payments", CreditCard)] },
        {
          id: "appointments", label: "Appointments", icon: CalendarDays,
          items: [it("/dashboard/appointments", t.bookings, CalendarDays)],
        },
        {
          id: "catalog", label: "Catalog", icon: CATALOG_ICONS.education,
          items: [
            it("/dashboard/courses", t.catalog, GraduationCap),
            it("/dashboard/packages", t.combo, LayoutGrid),
          ],
        },
        {
          id: "people", label: "People", icon: Users,
          items: [
            it("/dashboard/staff", t.staffTitle, UserPlus),
            it("/dashboard/students", t.customers, Users),
          ],
        },
        { id: "grow", label: "Grow", icon: Megaphone, items: [it("/dashboard/campaigns", "Student Broadcasts", Send)] },
        { id: "insights", label: "Insights", icon: BarChart3, items: [analytics] },
      ];

    case "retail":
      return [
        {
          id: "inbox", label: "Inbox", icon: MessageSquare,
          items: [conversations, it("/dashboard/feedback", "Reviews", Heart)],
        },
        {
          id: "sell", label: "Sell", icon: ShoppingCart,
          items: [
            it("/dashboard/orders", t.bookings, ShoppingCart),
            payments,
            it("/dashboard/coupons", "Coupons", Ticket),
          ],
        },
        {
          id: "catalog", label: "Catalog", icon: CATALOG_ICONS.retail,
          items: [
            it("/dashboard/products", t.catalog, ShoppingBag),
            it("/dashboard/packages", t.combo, LayoutGrid),
          ],
        },
        {
          id: "people", label: "People", icon: Users,
          items: [it("/dashboard/customers", t.customers, Users)],
        },
        {
          id: "grow", label: "Grow", icon: Megaphone,
          items: [
            it("/dashboard/campaigns", "Promotions", Send),
            it("/dashboard/loyalty", "Loyalty Points", PartyPopper),
          ],
        },
        { id: "insights", label: "Insights", icon: BarChart3, items: [analytics] },
      ];

    case "services":
      return [
        {
          id: "inbox", label: "Inbox", icon: MessageSquare,
          items: [conversations, it("/dashboard/feedback", "Ratings & Reviews", Heart)],
        },
        { id: "sell", label: "Sell", icon: ShoppingCart, items: [payments] },
        {
          id: "appointments", label: "Appointments", icon: CalendarDays,
          items: [it("/dashboard/appointments", t.bookings, CalendarDays)],
        },
        {
          id: "catalog", label: "Catalog", icon: CATALOG_ICONS.services,
          items: [it("/dashboard/services", t.catalog, Sparkles)],
        },
        {
          id: "people", label: "People", icon: Users,
          items: [
            it("/dashboard/staff", t.staffTitle, UserPlus),
            it("/dashboard/customers", t.customers, Users),
          ],
        },
        { id: "grow", label: "Grow", icon: Megaphone, items: [campaigns] },
        { id: "insights", label: "Insights", icon: BarChart3, items: [analytics] },
      ];

    case "food_beverage":
    default:
      return [
        {
          id: "inbox", label: "Inbox", icon: MessageSquare,
          items: [conversations, it("/dashboard/feedback", "Feedback", Heart)],
        },
        {
          id: "sell", label: "Sell", icon: ShoppingCart,
          items: [
            it("/dashboard/orders", t.bookings, ShoppingCart),
            payments,
            it("/dashboard/coupons", "Coupons", Ticket),
          ],
        },
        {
          id: "catalog", label: "Catalog", icon: CATALOG_ICONS.food_beverage,
          items: [
            it("/dashboard/menu", t.catalog, UtensilsCrossed),
            it("/dashboard/combos", t.combo, LayoutGrid),
          ],
        },
        {
          id: "people", label: "People", icon: Users,
          items: [it("/dashboard/customers", t.customers, Users)],
        },
        {
          id: "grow", label: "Grow", icon: Megaphone,
          items: [campaigns, it("/dashboard/loyalty", "Loyalty", PartyPopper)],
        },
        { id: "insights", label: "Insights", icon: BarChart3, items: [analytics] },
      ];
  }
}

// ─── Mobile bottom tab configuration ─────────────────────────

interface MobileTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const APPOINTMENT_TAB_LABELS: Record<BusinessType, string> = {
  food_beverage: "Orders",
  salon_spa: "Appointments",
  healthcare: "Appointments",
  education: "Classes",
  retail: "Orders",
  services: "Bookings",
};

function getMobileTabs(businessType: BusinessType): MobileTab[] {
  const config = getBusinessTypeConfig(businessType);
  const flow: MobileTab = config.supportsAppointments
    ? { href: "/dashboard/appointments", label: APPOINTMENT_TAB_LABELS[businessType], icon: CalendarDays }
    : { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart };

  return [
    { href: "/dashboard/conversations", label: "Inbox", icon: MessageSquare },
    flow,
    { href: CATALOG_ROUTES[businessType], label: config.sidebar.menu, icon: CATALOG_ICONS[businessType] },
    { href: CUSTOMER_ROUTES[businessType], label: config.sidebar.customers, icon: Users },
  ];
}

// ─── Layout ──────────────────────────────────────────────────

const PIN_STORAGE_KEY = "am_rail_pinned";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const [restaurantName, setRestaurantName] = useState("My Business");
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [businessType, setBusinessType] = useState<BusinessType>("food_beverage");

  // Rail state
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [isXl, setIsXl] = useState(false);

  // Mobile + palette state
  const [moreOpen, setMoreOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ── Data: business name + type (unchanged behavior) ──
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  // ── Pinned rail group: localStorage persistence ──
  const pinnedHydrated = useRef(false);
  useEffect(() => {
    // async boundary — no synchronous setState in effect
    const t = setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(PIN_STORAGE_KEY);
        if (stored) setPinnedId(stored);
      } catch {
        // storage unavailable (private mode) — pinning just won't persist
      }
      pinnedHydrated.current = true;
    }, 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!pinnedHydrated.current) return;
    try {
      if (pinnedId) window.localStorage.setItem(PIN_STORAGE_KEY, pinnedId);
      else window.localStorage.removeItem(PIN_STORAGE_KEY);
    } catch {
      // storage unavailable — ignore
    }
  }, [pinnedId]);

  // ── ≥1280px detection (pinning is an xl-only affordance) ──
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsXl(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ── ⌘K / Ctrl+K toggles the command palette ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // ── Flyout: close on Esc / outside click ──
  useEffect(() => {
    if (!openGroupId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenGroupId(null);
    };
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-rail-surface]")) return;
      setOpenGroupId(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [openGroupId]);

  // ── "More" sheet: close on Esc ──
  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // ── Close transient surfaces on navigation ──
  useEffect(() => {
    // async boundary — no synchronous setState in effect
    const t = setTimeout(() => setOpenGroupId(null), 0);
    return () => clearTimeout(t);
  }, [pathname]);

  // ── Derived rail state ──
  const groups = useMemo(() => getRailGroups(businessType), [businessType]);
  const config = useMemo(() => getBusinessTypeConfig(businessType), [businessType]);
  const tabs = useMemo(() => getMobileTabs(businessType), [businessType]);

  const pinnedGroup = pinnedId ? groups.find((g) => g.id === pinnedId) ?? null : null;
  const pinnedActive = isXl && pinnedGroup !== null;
  const openGroup = openGroupId ? groups.find((g) => g.id === openGroupId) ?? null : null;
  // The pinned group renders as a static column — no flyout duplicate for it
  const showFlyout = openGroup !== null && !(pinnedActive && pinnedGroup?.id === openGroup.id);

  const businessLabel = config.label;

  const isItemActive = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const isGroupActive = (group: RailGroup) =>
    group.items.some((item) => isItemActive(item.href));

  const moreTabActive =
    moreOpen ||
    (!tabs.some((tab) => isItemActive(tab.href)) && pathname !== "/dashboard");

  // ── ⌘K palette contents ──
  const commandGroups = useMemo<CommandGroup[]>(() => {
    const navigateItems: CommandItem[] = [
      { id: "nav-overview", label: "Overview", hint: "Home", href: "/dashboard", icon: Home },
      ...groups.flatMap((g) =>
        g.items.map((item) => ({
          id: `nav-${item.href}`,
          label: item.label,
          hint: g.label,
          href: item.href,
          icon: item.icon,
        }))
      ),
      { id: "nav-settings", label: "Settings", hint: "Account", href: "/dashboard/settings", icon: Settings },
    ];
    const actionItems: CommandItem[] = [
      { id: "act-broadcast", label: "New broadcast", hint: "Action", href: "/dashboard/campaigns", icon: Megaphone },
      { id: "act-catalog-add", label: config.terms.catalogAdd, hint: "Action", href: CATALOG_ROUTES[businessType], icon: CATALOG_ICONS[businessType] },
      { id: "act-settings", label: "Settings", hint: "Action", href: "/dashboard/settings", icon: Settings },
    ];
    return [
      { id: "navigate", label: "Navigate", items: navigateItems },
      { id: "actions", label: "Actions", items: actionItems },
    ];
  }, [groups, config, businessType]);

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-screen overflow-hidden bg-background">
        {/* Real-time order notification listener */}
        {restaurantId && <OrderRealtimeListener restaurantId={restaurantId} />}

        {/* ── Icon rail (≥lg) ── */}
        <aside
          data-rail-surface
          aria-label="Dashboard navigation rail"
          className="hidden w-16 shrink-0 flex-col items-center border-r bg-sidebar px-2 py-3 lg:flex"
        >
          <Link
            href="/"
            aria-label="AssistMint home"
            onMouseEnter={() => setOpenGroupId(null)}
            className="relative mb-2 size-10 shrink-0 overflow-hidden rounded-xl border"
          >
            <Image src="/logo.jpg" alt="AssistMint" fill sizes="40px" className="object-cover" />
          </Link>
          <div className="mb-2 h-px w-8 bg-border" />

          {/* Overview */}
          <RailLinkButton
            href="/dashboard"
            label="Overview"
            icon={Home}
            active={pathname === "/dashboard"}
            onHover={() => setOpenGroupId(null)}
          />

          <div className="mt-1 flex flex-col items-center gap-1">
            {groups.map((group) => (
              <RailGroupButton
                key={group.id}
                group={group}
                isOpen={openGroupId === group.id}
                isActive={isGroupActive(group)}
                onOpen={(id) => setOpenGroupId(id)}
                onToggle={(id) =>
                  setOpenGroupId((current) => (current === id ? null : id))
                }
              />
            ))}
          </div>

          <div className="flex-1" />

          <RailLinkButton
            href="/dashboard/settings"
            label="Settings"
            icon={Settings}
            active={isItemActive("/dashboard/settings")}
            onHover={() => setOpenGroupId(null)}
          />
          <SignOutButton />
        </aside>

        {/* ── Pinned column (≥xl) — the flyout made static ── */}
        {pinnedGroup && (
          <div
            data-rail-surface
            className="hidden w-[260px] shrink-0 flex-col border-r bg-sidebar xl:flex"
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {pinnedGroup.label}
              </span>
              <button
                type="button"
                onClick={() => setPinnedId(null)}
                aria-label={`Unpin ${pinnedGroup.label} panel`}
                title="Unpin panel"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              >
                <PinOff className="size-3.5" />
              </button>
            </div>
            <nav aria-label={pinnedGroup.label} className="flex-1 space-y-0.5 overflow-y-auto p-2">
              {pinnedGroup.items.map((item) => (
                <RailListLink
                  key={item.href}
                  href={item.href}
                  label={item.label}
                  icon={item.icon}
                  active={isItemActive(item.href)}
                  pillId="rail-pill-pinned"
                />
              ))}
            </nav>
          </div>
        )}

        {/* ── Content column ── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Topbar */}
          <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4 lg:px-6">
            {/* Mobile logo → Overview */}
            <Link
              href="/dashboard"
              aria-label="Overview"
              className="relative size-8 shrink-0 overflow-hidden rounded-lg border lg:hidden"
            >
              <Image src="/logo.jpg" alt="AssistMint" fill sizes="32px" className="object-cover" />
            </Link>

            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="font-heading truncate text-base font-semibold tracking-tight">
                {restaurantName}
              </h1>
              <span
                title={businessLabel}
                className="hidden max-w-[170px] shrink-0 truncate rounded-full border bg-secondary/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:inline-flex"
              >
                {businessLabel}
              </span>
            </div>

            <div className="flex-1" />

            {/* Search — opens the ⌘K palette */}
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open command menu"
              className="flex h-9 shrink-0 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Search className="size-4 shrink-0" />
              <span className="hidden md:inline">Search</span>
              <kbd className="hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium md:inline">
                ⌘K
              </kbd>
            </button>

            {/* Restaurant chip → Settings (existing link) */}
            <Link
              href="/dashboard/settings"
              className="hidden h-9 shrink-0 items-center gap-2 rounded-lg border bg-card px-2.5 text-xs font-semibold transition-transform duration-150 ease-out hover:-translate-y-0.5 active:scale-[0.98] active:translate-y-0 sm:flex"
            >
              <span className="grid size-5 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">
                {restaurantName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[150px] truncate">{restaurantName}</span>
              <ChevronDown className="size-3 text-muted-foreground" />
            </Link>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto px-4 pb-[calc(5.5rem_+_env(safe-area-inset-bottom))] pt-4 lg:px-6 lg:pb-6 lg:pt-6">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>

        {/* ── Flyout panel (≥lg) ── */}
        <AnimatePresence>
          {showFlyout && openGroup && (
            <motion.div
              key={openGroup.id}
              data-rail-surface
              role="dialog"
              aria-label={`${openGroup.label} menu`}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12, transition: { duration: 0.12 } }}
              transition={spring.settle}
              onMouseLeave={() => setOpenGroupId(null)}
              className={`absolute top-[4.5rem] z-50 max-h-[calc(100vh-6rem)] w-[260px] overflow-y-auto rounded-xl border bg-card p-2 shadow-lg ${
                pinnedActive ? "left-[332px]" : "left-[72px]"
              }`}
            >
              <div className="flex items-center justify-between px-2 pb-1 pt-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {openGroup.label}
                </span>
                {isXl && (
                  <button
                    type="button"
                    onClick={() => {
                      setPinnedId(openGroup.id);
                      setOpenGroupId(null);
                    }}
                    aria-label={`Pin ${openGroup.label} panel open`}
                    title="Pin panel open"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Pin className="size-3.5" />
                  </button>
                )}
              </div>
              <div className="space-y-0.5">
                {openGroup.items.map((item) => (
                  <RailListLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isItemActive(item.href)}
                    pillId="rail-pill"
                    onClick={() => setOpenGroupId(null)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Mobile bottom tab bar (<lg) ── */}
        <nav
          aria-label="Primary"
          className="fixed inset-x-0 bottom-0 z-40 border-t bg-card lg:hidden"
        >
          <div className="grid h-16 grid-cols-5 pb-[env(safe-area-inset-bottom)]">
            {tabs.map((tab) => {
              const active = isItemActive(tab.href);
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center justify-center gap-1 ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
                  <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-label="More pages"
              aria-expanded={moreOpen}
              className={`flex flex-col items-center justify-center gap-1 ${
                moreTabActive ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <MoreHorizontal className="size-5" strokeWidth={moreTabActive ? 2.25 : 2} />
              <span className={`text-[10px] leading-none ${moreTabActive ? "font-semibold" : "font-medium"}`}>
                More
              </span>
            </button>
          </div>
        </nav>

        {/* ── "More" bottom sheet (<lg) — all routes, thumb-reachable ── */}
        <AnimatePresence>
          {moreOpen && (
            <motion.div
              key="more-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/40 lg:hidden"
            />
          )}
          {moreOpen && (
            <motion.div
              key="more-sheet"
              role="dialog"
              aria-modal="true"
              aria-label="All pages"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%", transition: { duration: 0.18 } }}
              transition={spring.settle}
              className="fixed inset-x-0 bottom-0 z-50 flex max-h-[78vh] flex-col rounded-t-2xl border-t bg-card lg:hidden"
            >
                <div className="flex items-center justify-between px-5 pb-2 pt-4">
                  <span className="font-heading text-base font-semibold tracking-tight">
                    {restaurantName}
                  </span>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    aria-label="Close menu"
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-5" />
                  </button>
                </div>
                <div className="overflow-y-auto px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                  <div className="space-y-0.5">
                    <RailListLink
                      href="/dashboard"
                      label="Overview"
                      icon={Home}
                      active={pathname === "/dashboard"}
                      pillId="rail-pill-more"
                      onClick={() => setMoreOpen(false)}
                    />
                  </div>
                  {groups.map((group) => (
                    <div key={group.id} className="mt-3">
                      <p className="px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item) => (
                          <RailListLink
                            key={item.href}
                            href={item.href}
                            label={item.label}
                            icon={item.icon}
                            active={isItemActive(item.href)}
                            pillId="rail-pill-more"
                            onClick={() => setMoreOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="mt-4 space-y-0.5 border-t pt-3">
                    <RailListLink
                      href="/dashboard/settings"
                      label="Settings"
                      icon={Settings}
                      active={isItemActive("/dashboard/settings")}
                      pillId="rail-pill-more"
                      onClick={() => setMoreOpen(false)}
                    />
                    <SheetSignOutButton onDone={() => setMoreOpen(false)} />
                  </div>
                </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── ⌘K command palette ── */}
        <CommandPalette
          open={paletteOpen}
          onClose={() => setPaletteOpen(false)}
          groups={commandGroups}
        />
      </div>
    </MotionConfig>
  );
}

// ─── Rail: link button (Overview / Settings) ─────────────────

function RailLinkButton({
  href,
  label,
  icon: Icon,
  active,
  onHover,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onHover?: () => void;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      onMouseEnter={onHover}
      className={`relative grid size-11 place-items-center rounded-xl transition-colors ${
        active
          ? "text-primary"
          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
      }`}
    >
      <motion.span
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={spring.snappy}
        className="absolute inset-0 grid place-items-center"
      >
        <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
      </motion.span>
      {active && (
        <span className="absolute right-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
    </Link>
  );
}

// ─── Rail: group button (opens the flyout) ───────────────────

function RailGroupButton({
  group,
  isOpen,
  isActive,
  onOpen,
  onToggle,
}: {
  group: RailGroup;
  isOpen: boolean;
  isActive: boolean;
  onOpen: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const Icon = group.icon;
  return (
    <motion.button
      type="button"
      aria-label={group.label}
      aria-expanded={isOpen}
      onClick={() => onToggle(group.id)}
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse") onOpen(group.id);
      }}
      className={`relative grid size-11 place-items-center rounded-xl transition-colors ${
        isActive
          ? "text-primary"
          : isOpen
            ? "bg-sidebar-accent text-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
      }`}
    >
      <motion.span
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={spring.snappy}
        className="absolute inset-0 grid place-items-center"
      >
        <Icon className="size-5" strokeWidth={isActive || isOpen ? 2.25 : 2} />
      </motion.span>
      {isActive && (
        <span className="absolute right-2 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary" />
      )}
    </motion.button>
  );
}

// ─── Shared list row (flyout / pinned column / More sheet) ──
// The active row carries the P4 sliding pill (per-surface layoutId).

function RailListLink({
  href,
  label,
  icon: Icon,
  active,
  pillId,
  onClick,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  pillId: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
        active ? "font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {active && (
        <motion.span
          layoutId={pillId}
          transition={spring.snappy}
          className="absolute inset-0 rounded-lg bg-foreground/[0.07]"
        />
      )}
      <Icon className="relative size-4 shrink-0" />
      <span className="relative truncate">{label}</span>
    </Link>
  );
}

// ─── Sign out (rail) ─────────────────────────────────────────

function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      aria-label="Sign out"
      title="Sign out"
      className="relative mt-1 grid size-11 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <motion.span
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        transition={spring.snappy}
        className="absolute inset-0 grid place-items-center"
      >
        <LogOut className="size-5" />
      </motion.span>
    </button>
  );
}

// ─── Sign out (More sheet row) ───────────────────────────────

function SheetSignOutButton({ onDone }: { onDone: () => void }) {
  const router = useRouter();

  const handleSignOut = async () => {
    onDone();
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <LogOut className="size-4 shrink-0" />
      <span className="truncate">Sign Out</span>
    </button>
  );
}
