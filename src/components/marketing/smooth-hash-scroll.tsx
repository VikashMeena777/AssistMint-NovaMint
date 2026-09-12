"use client";

import { useEffect } from "react";

/**
 * Smooth-lands initial hash navigations (e.g. arriving from /about → /#pricing)
 * after hydration. Without it the browser still jumps to the anchor — this
 * just makes the arrival match the site's scroll feel.
 */
export function SmoothHashScroll() {
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.substring(1);
    const element = document.getElementById(id);
    if (!element) return;
    const timer = setTimeout(() => {
      element.scrollIntoView({ behavior: "smooth" });
    }, 150);
    return () => clearTimeout(timer);
  }, []);
  return null;
}
