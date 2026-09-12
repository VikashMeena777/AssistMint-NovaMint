"use client";

import { useCallback } from "react";

/**
 * In-page hash navigation on NATIVE smooth scroll (html.scroll-smooth +
 * scroll-mt on sections). Cross-page hash links (e.g. /about → /#pricing)
 * do a normal navigation and let the browser land on the anchor.
 */
export function useHashNav() {
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
