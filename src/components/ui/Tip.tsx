import type { ReactNode } from "react";

/**
 * A small styled tooltip that opens on hover/focus, matching the war-room
 * look (dark panel, gold border). Pure CSS — works in server components.
 * Wrap any icon/badge/label that isn't self-explanatory.
 */
export function Tip({
  tip,
  side = "top",
  className = "",
  children,
}: {
  /** Tooltip content — keep it to one or two short sentences. */
  tip: ReactNode;
  side?: "top" | "bottom";
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={`group/tip relative inline-flex ${className}`} tabIndex={-1}>
      {children}
      <span
        role="tooltip"
        dir="rtl"
        className={`pointer-events-none invisible absolute right-1/2 z-50 w-max max-w-[230px] translate-x-1/2 rounded-lg border border-gold/40 bg-[#100d08]/97 px-3 py-2 text-right text-[11px] font-normal leading-relaxed text-zinc-300 opacity-0 shadow-[0_8px_30px_rgba(0,0,0,0.8)] transition-opacity duration-150 group-hover/tip:visible group-hover/tip:opacity-100 group-focus-within/tip:visible group-focus-within/tip:opacity-100 ${
          side === "bottom" ? "top-full mt-1.5" : "bottom-full mb-1.5"
        }`}
      >
        {tip}
      </span>
    </span>
  );
}
