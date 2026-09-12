"use client";

import { useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(SplitText, useGSAP);

/**
 * Masked line-reveal headline — the signature premium-landing moment.
 * Lines slide up from behind an overflow-clip mask (v3.13 SplitText),
 * re-split automatically on resize/font-load, and respect
 * prefers-reduced-motion (opacity-only fade instead).
 *
 * SplitText must target the HEADING itself, not the wrapper — targeting
 * the wrapper flattens the heading's text into sibling divs (verified
 * the hard way: the h1 lost its last word).
 */
export function SplitHeadline({
  text,
  className,
  as: Tag = "h2",
}: {
  text: string;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const target = container.current?.firstElementChild;
      if (!target) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        SplitText.create(target as HTMLElement, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, {
              yPercent: 110,
              duration: 0.9,
              ease: "power4.out",
              stagger: 0.12,
            });
          },
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        SplitText.create(target as HTMLElement, {
          type: "lines",
          autoSplit: true,
          onSplit(self) {
            return gsap.from(self.lines, { autoAlpha: 0, duration: 0.3 });
          },
        });
      });
    },
    { scope: container }
  );

  return (
    <div ref={container}>
      <Tag className={className}>{text}</Tag>
    </div>
  );
}
