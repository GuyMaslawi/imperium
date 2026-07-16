import type { ReactNode } from "react";

/**
 * Centered gold section title with an uppercase English subtitle and flanking
 * decorative rules — the header treatment used at the top of every screen
 * (e.g. "⚔ גיבור ⚔ / WAR HERO").
 */
export function SectionHeading({
  title,
  subtitle,
  ornament,
  className = "",
}: {
  title: ReactNode;
  subtitle?: string;
  /** Emoji/icon shown on both sides of the title. */
  ornament?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="flex w-full max-w-xl items-center gap-4">
        <span className="rule-gold flex-1" />
        <div className="section-heading shrink-0">
          <h1 className="st-title">
            {ornament && <span aria-hidden className="text-gold-dim">{ornament}</span>}
            {title}
            {ornament && <span aria-hidden className="text-gold-dim">{ornament}</span>}
          </h1>
          {subtitle && <p className="st-sub">{subtitle}</p>}
        </div>
        <span className="rule-gold flex-1" />
      </div>
    </div>
  );
}
