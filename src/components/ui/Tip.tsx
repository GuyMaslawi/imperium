"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

/** Space between the trigger and the tooltip. */
const GAP = 8;
/** Minimum breathing room kept between the tooltip and the viewport edges. */
const EDGE = 8;

/** The war-room tooltip shell — dark panel, gold hairline, heavy drop shadow. */
const SURFACE =
  "rounded-lg border border-gold/40 bg-[#100d08]/97 text-right shadow-[0_8px_30px_rgba(0,0,0,0.8)]";
const DEFAULT_BODY =
  "w-max px-3 py-2 text-[11px] font-normal leading-relaxed text-zinc-300";

export interface TipOptions {
  /** Preferred side; flips automatically when there is no room. */
  side?: "top" | "bottom";
  /** Extra classes for the floating surface (width, padding, text size). */
  className?: string;
  /** Skip the default padding/typography so the caller styles the surface. */
  bare?: boolean;
  /**
   * Widest the panel may get, in px. Applied inline (so it always beats the
   * caller's classes) and capped to the viewport, so a wide tooltip near a
   * screen edge shrinks instead of hanging off the page.
   */
  maxWidth?: number;
  /** Render nothing (used when a tile has no details to show). */
  disabled?: boolean;
}

/**
 * Anchored tooltips used to sit in the normal flow, so any ancestor with
 * `overflow-hidden` / `overflow-y-auto` (the sidebar, the resource bar, the bag
 * grid…) sliced them, and a trigger near a screen edge pushed its tooltip off
 * the page. This hook renders the tooltip in a portal on `document.body` with
 * `position: fixed`, then clamps it inside the viewport and flips it to the
 * other side when the preferred one has no room — so it can never be clipped.
 *
 * Placement is written straight to the node's style (rather than through state)
 * so following a scroll costs no re-render.
 *
 * Returns props to spread on the trigger plus the floating node to render.
 */
export function useTip(
  tip: ReactNode,
  {
    side = "top",
    className = "",
    bare = false,
    maxWidth = 230,
    disabled = false,
  }: TipOptions = {},
) {
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);

  const active = open && !disabled && tip != null && tip !== false;

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const el = tipRef.current;
    if (!anchor || !el) return;

    const a = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // The trigger scrolled out of its panel — hide rather than leave the
    // tooltip floating over unrelated content.
    if (a.bottom < 0 || a.top > vh || a.right < 0 || a.left > vw) {
      el.style.visibility = "hidden";
      return;
    }

    const { width: w, height: h } = el.getBoundingClientRect();
    const fitsAbove = a.top - GAP - h >= EDGE;
    const fitsBelow = a.bottom + GAP + h <= vh - EDGE;
    const above = side === "top" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

    el.style.top = `${clamp(above ? a.top - GAP - h : a.bottom + GAP, EDGE, vh - h - EDGE)}px`;
    el.style.left = `${clamp(a.left + a.width / 2 - w / 2, EDGE, vw - w - EDGE)}px`;
    el.style.visibility = "visible";
  }, [side]);

  // Place it as soon as it is in the DOM, then follow scroll/resize so it stays
  // glued to its trigger inside scrollable panels. The fade waits a frame —
  // an opacity set in the same tick as the insert would not transition.
  useLayoutEffect(() => {
    if (!active) return;
    reposition();
    const frame = requestAnimationFrame(() => {
      if (tipRef.current) tipRef.current.style.opacity = "1";
    });
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [active, reposition]);

  // Escape closes; on touch, a tap anywhere else closes the tapped-open tip.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const node = e.target as Node | null;
      if (node && anchorRef.current?.contains(node)) return;
      setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [active]);

  const triggerProps = {
    ref: (el: HTMLElement | null) => {
      anchorRef.current = el;
    },
    onPointerEnter: () => setOpen(true),
    onPointerLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  };

  const node = active
    ? createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          dir="rtl"
          className={`pointer-events-none fixed z-[200] transition-opacity duration-150 ${SURFACE} ${
            bare ? "" : DEFAULT_BODY
          } ${className}`}
          // Starts hidden at the origin; the layout effect measures it and
          // moves it into place before the browser paints.
          style={{
            top: 0,
            left: 0,
            opacity: 0,
            visibility: "hidden",
            maxWidth: `min(${maxWidth}px, calc(100vw - ${EDGE * 2}px))`,
          }}
        >
          {tip}
        </div>,
        document.body,
      )
    : null;

  return { triggerProps, node, open: active };
}

function clamp(value: number, min: number, max: number): number {
  // A tooltip taller/wider than the viewport would invert the bounds — pin it
  // to the near edge instead of letting `min` lose to `max`.
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

/**
 * A small styled tooltip that opens on hover/focus, matching the war-room look
 * (dark panel, gold border). Floats in a portal, so it is never clipped by a
 * scrolling ancestor and never spills past the screen edges.
 * Wrap any icon/badge/label that isn't self-explanatory.
 */
export function Tip({
  tip,
  side = "top",
  className = "",
  tipClassName = "",
  maxWidth,
  focusable = false,
  children,
}: {
  /** Tooltip content — keep it to one or two short sentences. */
  tip: ReactNode;
  side?: "top" | "bottom";
  /** Classes for the inline trigger wrapper. */
  className?: string;
  /** Classes for the floating surface (width, padding, text size). */
  tipClassName?: string;
  /** Widest the panel may get, in px (default 230). */
  maxWidth?: number;
  /**
   * Make the wrapper itself a tab stop. Only needed when the trigger holds no
   * focusable element of its own — otherwise the child's focus opens the tip.
   */
  focusable?: boolean;
  children: ReactNode;
}) {
  const { triggerProps, node } = useTip(tip, {
    side,
    className: tipClassName,
    maxWidth,
  });

  return (
    <span
      className={`relative inline-flex ${className}`}
      tabIndex={focusable ? 0 : -1}
      {...triggerProps}
    >
      {children}
      {node}
    </span>
  );
}
