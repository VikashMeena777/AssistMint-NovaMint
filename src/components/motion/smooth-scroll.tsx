"use client";

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ReactLenis, type LenisRef } from "lenis/react";
import "lenis/dist/lenis.css";

gsap.registerPlugin(ScrollTrigger);

/**
 * Premium inertia scrolling for MARKETING pages only (the dashboard keeps
 * native scroll — data-dense UIs want snappy, not smooth).
 *
 * Official Lenis×GSAP wiring: exactly one rAF loop (GSAP's ticker drives
 * Lenis), and ScrollTrigger updates on every Lenis scroll tick. Touch
 * stays native; prefers-reduced-motion disables smoothing automatically.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    lenisRef.current?.lenis?.on("scroll", ScrollTrigger.update);

    const update = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(update);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(update);
      lenisRef.current?.lenis?.destroy();
    };
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, lerp: 0.1, anchors: { offset: -72 } }}
    >
      {children}
    </ReactLenis>
  );
}
