"use client";

import { useRef, type ComponentType, type ReactNode, type Ref } from "react";

/**
 * IconDrawCard — a bento/feature card where hovering ANYWHERE on the card
 * draws the lucide-animated icon (not just hovering the icon itself).
 * Attaching the ref switches the icon to controlled mode; the parent's
 * mouse handlers drive start/stopAnimation.
 */
export type AnimatedIconHandle = {
  startAnimation: () => void;
  stopAnimation: () => void;
};

export type AnimatedIconComponent = ComponentType<{
  ref?: Ref<AnimatedIconHandle>;
  size?: number;
  className?: string;
}>;

export function IconDrawCard({
  icon: Icon,
  iconBoxClass,
  className,
  children,
}: {
  icon: AnimatedIconComponent;
  iconBoxClass: string;
  className?: string;
  children: ReactNode;
}) {
  const iconRef = useRef<AnimatedIconHandle>(null);

  return (
    <div
      className={className}
      onMouseEnter={() => iconRef.current?.startAnimation()}
      onMouseLeave={() => iconRef.current?.stopAnimation()}
    >
      <div className={`rounded-2xl w-fit p-3 mb-4 transition-transform duration-500 group-hover:scale-110 ${iconBoxClass}`}>
        <Icon ref={iconRef} />
      </div>
      {children}
    </div>
  );
}
