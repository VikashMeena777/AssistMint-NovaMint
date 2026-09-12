"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useState, useEffect } from "react";
import { motion, AnimatePresence, MotionConfig } from "motion/react";
import { Menu, X, LayoutDashboard, Search } from "lucide-react";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { CommandPalette } from "@/components/marketing/command-palette";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

/**
 * In-page hash navigation on NATIVE smooth scroll (html.scroll-smooth +
 * scroll-mt on sections). Cross-page hash links (e.g. /about → /#pricing)
 * do a normal navigation and let the browser land on the anchor.
 */
function useHashNav() {
  return useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!href.startsWith("/#") && !href.startsWith("#")) return;
    if (window.location.pathname !== "/") return; // normal navigation
    e.preventDefault();
    const targetId = href.replace("/#", "").replace("#", "");
    const element = document.getElementById(targetId);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth" });
    window.history.pushState(null, "", href);
  }, []);
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-screen flex-col bg-background text-foreground">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <CookieConsent />
      </div>
    </MotionConfig>
  );
}

// ─── Navbar — ivory, hairline border after 20px scroll, ⌘K palette ───

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const handleNavClick = useHashNav();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });

    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ⌘K / Ctrl+K toggles the command palette from anywhere on the page.
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

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-colors duration-200 ${
          scrolled
            ? "border-b border-border bg-background/90 backdrop-blur"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav className="flex h-16 items-center justify-between">
            {/* Logo + Fraunces wordmark */}
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo.jpg"
                alt="AssistMint Logo"
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-cover"
                priority
              />
              <span className="font-heading text-lg font-semibold tracking-tight text-foreground">
                Assist<span className="text-primary">Mint</span>
              </span>
            </Link>

            {/* Desktop links — quiet text, 2px cobalt underline draws on hover */}
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link.href)}
                  className="group relative px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                  <span
                    aria-hidden
                    className="absolute inset-x-3 bottom-1 h-[2px] origin-left scale-x-0 bg-primary transition-transform duration-150 ease-out group-hover:scale-x-100 motion-reduce:transition-none motion-reduce:transform-none"
                  />
                </a>
              ))}
            </div>

            {/* Desktop right cluster — ⌘K, auth, CTA */}
            <div className="hidden items-center gap-2.5 md:flex">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command menu (Ctrl K)"
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search className="size-3.5" />
                <span className="hidden lg:inline">Search</span>
                <kbd className="hidden rounded border border-border bg-secondary px-1.5 font-mono text-[10px] lg:inline">
                  ⌘K
                </kbd>
              </button>

              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="stamp inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-transform duration-150 ease-out hover:-translate-y-px active:translate-y-0"
                  >
                    Start free trial
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: search + toggle */}
            <div className="flex items-center gap-1 md:hidden">
              <button
                type="button"
                onClick={() => setPaletteOpen(true)}
                aria-label="Open command menu"
                className="p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Search className="h-5 w-5" />
              </button>
              <button
                className="-mr-2 p-2 text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
                aria-expanded={mobileOpen}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile menu — opacity/transform only */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8, transition: { duration: 0.12 } }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="border-b border-border bg-background/95 backdrop-blur md:hidden"
            >
              <div className="space-y-1 px-4 py-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => {
                      setMobileOpen(false);
                      handleNavClick(e, link.href);
                    }}
                    className="block rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {link.label}
                  </a>
                ))}
                <hr className="my-3 border-border" />
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 flex h-11 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setMobileOpen(false)}
                      className="block rounded-lg px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="mt-2 flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                    >
                      Start free trial
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}

// ─── Footer — minimal ledger footer ───

function Footer() {
  const handleNavClick = useHashNav();

  const columns = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "/#features" },
        { label: "Live demo", href: "/#demo" },
        { label: "Pricing", href: "/#pricing" },
        { label: "FAQ", href: "/#faq" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "Contact", href: "/contact" },
        { label: "Blog", href: "/blog" },
        { label: "Careers", href: "/careers" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Terms of Service", href: "/terms" },
        { label: "Cookie Policy", href: "/cookies" },
        { label: "Refund Policy", href: "/refund" },
      ],
    },
  ];

  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand block */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Image
                src="/logo.jpg"
                alt="AssistMint Logo"
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-cover"
              />
              <span className="font-heading text-lg font-semibold tracking-tight">
                Assist<span className="text-primary">Mint</span>
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              The AI front desk for your business on WhatsApp — orders, bookings
              and payments, answered in seconds. Zero commission.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
                {col.title}
              </h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      onClick={(e) => handleNavClick(e, link.href)}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AssistMint. All rights reserved.
          </p>
          <p className="text-xs font-medium text-muted-foreground">
            Built in India 🇮🇳
          </p>
        </div>
      </div>
    </footer>
  );
}
