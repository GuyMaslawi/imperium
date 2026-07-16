import type { ReactNode } from "react";

/** A single decorative gold corner bracket (top-left orientation). */
function Corner({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={`pointer-events-none absolute z-10 h-9 w-9 text-gold-bright ${className}`}
      fill="none"
      aria-hidden
    >
      {/* outer angle */}
      <path d="M2 22 V2 H22" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      {/* inner accent */}
      <path d="M9 30 V9 H30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      {/* corner jewel */}
      <circle cx="5.5" cy="5.5" r="2.6" fill="currentColor" />
    </svg>
  );
}

/**
 * The central content shell of every game screen: a dark gold-bordered panel
 * with four decorative corner brackets, matching the reference frame.
 */
export function OrnateFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`ornate-shell rounded-lg ${className}`}>
      <Corner className="left-1.5 top-1.5" />
      <Corner className="right-1.5 top-1.5 rotate-90" />
      <Corner className="bottom-1.5 right-1.5 rotate-180" />
      <Corner className="bottom-1.5 left-1.5 -rotate-90" />
      {children}
    </div>
  );
}
