import type { ReactNode } from "react";

/**
 * Standard inner panel. `variant` picks the surface treatment:
 *  - "default": neutral dark panel
 *  - "gold": warm gold-tinted panel (for highlighted sections)
 *  - "inset": recessed near-black panel (for nested rows / fields)
 */
export function Card({
  children,
  className = "",
  variant = "default",
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "gold" | "inset";
}) {
  const surface =
    variant === "gold" ? "panel-gold" : variant === "inset" ? "panel-inset" : "panel";
  return (
    <div className={`${surface} rounded-xl p-5 ${className}`}>{children}</div>
  );
}

export function CardTitle({
  icon,
  children,
  className = "",
}: {
  icon?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`mb-4 flex items-center gap-2 text-base font-bold tracking-wide text-gold-bright ${className}`}
    >
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </h2>
  );
}
