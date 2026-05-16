"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Leaf, LayoutDashboard } from "lucide-react";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { createClient } from "@/lib/supabase/client";

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
}

// ─── Navbar — Full Width Sticky with Blur ───

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsLoggedIn(!!user);
    });
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Leaf className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">
              Assist<span className="text-primary">Mint</span>
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm gap-2"
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
                >
                  Get Started Free
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </nav>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border bg-background/95 backdrop-blur-xl md:hidden overflow-hidden"
          >
            <div className="px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <hr className="border-border my-3" />
              {isLoggedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="mt-2 flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground gap-2"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground rounded-lg transition-colors"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="mt-2 flex h-11 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

// ─── Footer ─────────────────────────────────

function Footer() {
  const columns = [
    {
      title: "Product",
      links: [
        { label: "Features", href: "#features" },
        { label: "Pricing", href: "#pricing" },
        { label: "How It Works", href: "#how-it-works" },
        { label: "FAQ", href: "#faq" },
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
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Leaf className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">
                Assist<span className="text-primary">Mint</span>
              </span>
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-xs">
              AI-powered WhatsApp ordering for restaurants. Automate everything
              from orders to payments.
            </p>
          </div>

          {/* Link Columns */}
          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-sm font-semibold mb-4">{col.title}</h4>
              <ul className="space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} AssistMint. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Made with 🌿 in India
          </p>
        </div>
      </div>
    </footer>
  );
}
