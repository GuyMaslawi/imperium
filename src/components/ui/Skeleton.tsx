"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/client";

/**
 * Loading-state primitives.
 *
 * Every /game screen ships its own `loading.tsx` built from these, so a
 * navigation swaps in a same-shaped grey copy of the page that is about to
 * arrive — same heading, same panels, same grid — instead of a generic spinner
 * screen. The point is that nothing *moves* when the real data lands: the
 * skeleton occupies the layout the page will occupy.
 *
 * Everything here is presentational and server-rendered (no "use client"): the
 * fallback must be part of the prefetched RSC payload to appear instantly.
 */

/** A plain block placeholder. Give it a height/width via `className`. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`skel block ${className}`} />;
}

/**
 * A bar standing in for a line of text. It carries a non-breaking space, so it
 * inherits the exact line box of the text around it — a heading placeholder is
 * as tall as the heading, a caption placeholder as tall as the caption, and the
 * swap to real text costs no vertical shift.
 */
export function SkeletonLine({ className = "w-24" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`skel inline-block max-w-full align-middle ${className}`}
    >
      &nbsp;
    </span>
  );
}

/**
 * Wrapper for a whole loading screen. Mirrors the page's own root spacing and
 * announces the wait once to screen readers (the bars themselves are hidden).
 */
export function SkeletonPage({
  children,
  className = "space-y-6",
}: {
  children: ReactNode;
  className?: string;
}) {
  const t = useT();
  return (
    <div role="status" aria-busy="true" aria-label={t("טוען")} className={className}>
      {children}
    </div>
  );
}

/**
 * Placeholder for <SectionHeading> — same flanking rules, same centered
 * title, so the screen title never jumps a pixel.
 */
export function SkeletonHeading({ titleWidth = "w-40" }: { titleWidth?: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full max-w-xl items-center gap-4">
        <span className="rule-gold flex-1" />
        <div className="section-heading shrink-0">
          <h1 className="st-title">
            <SkeletonLine className={titleWidth} />
          </h1>
        </div>
        <span className="rule-gold flex-1" />
      </div>
    </div>
  );
}

/**
 * A grid of identical card placeholders — the shape most screens are made of
 * (weapons, upgrades, mines, storages…). `grid` carries the same responsive
 * column classes the real grid uses; `tile` its card height.
 */
export function SkeletonGrid({
  count,
  grid = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
  tile = "h-56",
}: {
  count: number;
  grid?: string;
  tile?: string;
}) {
  return (
    <div className={grid}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`rounded-xl ${tile}`} />
      ))}
    </div>
  );
}

/** A stack of list rows (reports, messages, members, leaderboard entries). */
export function SkeletonRows({
  count,
  row = "h-14",
  className = "space-y-3",
}: {
  count: number;
  row?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`rounded-xl ${row}`} />
      ))}
    </div>
  );
}

/** Panel header placeholder: an icon square plus a title bar. */
export function SkeletonPanelTitle({ width = "w-40" }: { width?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Skeleton className="h-5 w-5 rounded" />
      <span className="text-base font-bold">
        <SkeletonLine className={width} />
      </span>
    </div>
  );
}
