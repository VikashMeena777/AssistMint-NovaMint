"use client";

/**
 * TextRoll — the classic premium text hover: the label slides up and an
 * identical copy slides in from below. Wrap the parent in `group`.
 */
export function TextRoll({ text, className }: { text: string; className?: string }) {
  return (
    <span className={`relative inline-block overflow-hidden ${className ?? ""}`}>
      <span className="block transition-transform duration-300 ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:-translate-y-[110%]">
        {text}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 block translate-y-[110%] transition-transform duration-300 ease-[cubic-bezier(0.21,0.47,0.32,0.98)] group-hover:translate-y-0"
      >
        {text}
      </span>
    </span>
  );
}
