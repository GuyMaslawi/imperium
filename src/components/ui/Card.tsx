import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-border-subtle bg-surface p-5 shadow-lg shadow-black/30 ${className}`}
    >
      {children}
    </div>
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
    <h2 className={`mb-4 flex items-center gap-2 text-lg font-bold text-gold ${className}`}>
      {icon && <span aria-hidden>{icon}</span>}
      {children}
    </h2>
  );
}
