"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Menu, X, LayoutDashboard, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useHashNav } from "@/components/marketing/use-hash-nav";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

// The ⌘K palette is an on-demand surface — its chunk loads after first
// interaction (or once the browser is idle), never on the critical path.
const CommandPalette = dynamic(
  () => import("@/components/marketing/command-palette").then((m) => m.CommandPalette),
  { ssr: false, loading: () => null }
);

/** Defers a boolean flip to browser idle (with a timeout net). */
function useIdleReady(): [boolean, () => void] {
  const [ready, setReady] = useState(false);
  const kick = useCallback(() => setReady(true), []);

  useEffect(() => {
    if (ready) return;
    const win = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (typeof win.requestIdleCallback === "function") {
      const id = win.requestIdleCallback(() => setReady(true), { timeout: 3000 });
      return () => win.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 1500);
    return () => clearTimeout(t);
  }, [ready]);

  return [ready, kick];
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [landingSection, setLandingSection] = useState<string | null>(null);
  const [paletteReady, kickPalette] = useIdleReady();
  const handleNavClick = useHashNav();
  // Anchors only exist on the landing page — anywhere else nothing is active.
  const activeSection = pathname === "/" ? landingSection : null;

  // Auth CTA swap: signed-out is the DEFAULT render (no flicker, no wait).
  // getSession() reads local storage only — anonymous visitors fire zero
  // network requests; a server re-validation runs just for real sessions.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) return;
      setIsLoggedIn(true);
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!cancelled) setIsLoggedIn(!!user);
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ⌘K / Ctrl+K toggles the command palette from anywhere on the page.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        kickPalette();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [kickPalette]);

  // Active anchor link: one IntersectionObserver over the landing sections —
  // no scroll listeners, no hijack. The drawn underline persists (scaleX 1)
  // on whichever section owns the middle of the viewport.
  useEffect(() => {
    if (pathname !== "/") return;
    const sections = navLinks
      .map((l) => document.getElementById(l.href.split("#")[1]))
      .filter((el): el is HTMLElement => !!el);
    if (sections.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setLandingSection(visible.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] }
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [pathname]);

  const openPalette = () => {
    kickPalette();
    setPaletteOpen(true);
  };

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

            {/* Desktop links — quiet text, 2px cobalt underline draws on hover
                and STAYS drawn on the section currently in view */}
            <div className="hidden items-center gap-1 md:flex">
              {navLinks.map((link) => {
                const active = activeSection === link.href.split("#")[1];
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={(e) => handleNavClick(e, link.href)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "group relative px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {link.label}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-3 bottom-1 h-[2px] origin-left bg-primary transition-transform duration-150 ease-out motion-reduce:transition-none motion-reduce:transform-none",
                        active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      )}
                    />
                  </a>
                );
              })}
            </div>

            {/* Desktop right cluster — ⌘K, auth, CTA */}
            <div className="hidden items-center gap-2.5 md:flex">
              <button
                type="button"
                onClick={openPalette}
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

            {/* Mobile: menu toggle only — the ⌘K palette is keyboard-driven,
                so its trigger stays on desktop (hidden md:flex above). */}
            <div className="flex items-center gap-1 md:hidden">
              <button
                className="-mr-2 p-3 text-muted-foreground transition-colors hover:text-foreground"
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

      {(paletteOpen || paletteReady) && (
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      )}
    </>
  );
}
