"use client";

import { useEffect, useRef, useState } from "react";

export type Rarity = "legendary" | "epic" | "rare" | "common";

const RARITY: Record<
  Rarity,
  { ring: string; glow: string; bg: string; badge: string; text: string }
> = {
  legendary: {
    ring: "border-gold/80",
    glow: "shadow-[0_0_22px_-4px_rgba(212,168,67,0.6)]",
    bg: "from-[#3a2c10] to-[#0f0b06]",
    badge: "text-gold-bright",
    text: "text-gold-bright",
  },
  epic: {
    ring: "border-purple-400/70",
    glow: "shadow-[0_0_22px_-4px_rgba(168,85,247,0.55)]",
    bg: "from-[#2a1740] to-[#0e0916]",
    badge: "text-purple-200",
    text: "text-purple-300",
  },
  rare: {
    ring: "border-sky-400/70",
    glow: "shadow-[0_0_22px_-4px_rgba(56,189,248,0.5)]",
    bg: "from-[#0f2b40] to-[#080f16]",
    badge: "text-sky-200",
    text: "text-sky-300",
  },
  common: {
    ring: "border-emerald-400/60",
    glow: "shadow-[0_0_18px_-6px_rgba(52,211,153,0.5)]",
    bg: "from-[#123023] to-[#080f0c]",
    badge: "text-emerald-200",
    text: "text-emerald-300",
  },
};

/** Everything the hover tooltip shows about an item. */
export interface ItemTileDetails {
  name: string;
  rarityLabel: string;
  /** What the item grants, e.g. +12.5% התקפה. */
  statIcon: string;
  statLabel: string;
  bonusPct: number;
  /** Requirement: the hero must be at least this level to equip. */
  requiredLevel: number;
  /** Whether the current hero meets the requirement. */
  meetsRequirement?: boolean;
  equipped?: boolean;
  /** Catalog view: the player already owns a copy. */
  owned?: boolean;
  /** Action hint shown at the bottom, e.g. "לחץ כדי ללבוש". */
  hint?: string;
}

export function formatBonus(pct: number): string {
  return Number.isInteger(pct) ? String(pct) : pct.toFixed(1);
}

/**
 * A hero equipment / inventory tile. Renders generated art from
 * `/hero/<slug>.png` when it exists, otherwise falls back to the emoji.
 * With `details`, hovering (or focusing) the tile opens a tooltip with the
 * item's stats and its equip requirement; an unmet requirement renders the
 * tile locked (dimmed + 🔒).
 */
export function ItemTile({
  slug,
  icon,
  level,
  name,
  rarity,
  size = "md",
  details,
  tooltipBelow = false,
}: {
  slug?: string;
  icon: string;
  level?: number;
  name?: string;
  rarity: Rarity;
  size?: "md" | "lg";
  details?: ItemTileDetails;
  /** Open the tooltip under the tile (for tiles near the top of the screen). */
  tooltipBelow?: boolean;
}) {
  const [imgOk, setImgOk] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const r = RARITY[rarity];
  const iconSize = size === "lg" ? "text-6xl" : "text-4xl";
  const locked = details?.meetsRequirement === false;

  // On localhost the image can finish loading before React hydrates, so the
  // onLoad event never fires — check `.complete` on mount to catch that.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setImgOk(true);
  }, []);

  return (
    <div className="group relative flex flex-col items-center gap-1.5">
      <div
        className={`relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border-2 bg-gradient-to-b ${r.ring} ${r.glow} ${r.bg} ${
          locked ? "opacity-90" : ""
        }`}
      >
        {/* emoji base — always visible; generated art (if any) overlays it */}
        <span
          aria-hidden
          className={`${iconSize} drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] ${
            locked ? "grayscale-[0.7]" : ""
          }`}
        >
          {icon}
        </span>
        {slug && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            ref={imgRef}
            src={`/hero/${slug}.png`}
            alt={name ?? ""}
            className={`absolute inset-0 h-full w-full object-contain p-1 transition-opacity ${imgOk ? "opacity-100" : "opacity-0"} ${
              locked ? "grayscale-[0.7]" : ""
            }`}
            onLoad={() => setImgOk(true)}
            onError={() => setImgOk(false)}
          />
        )}
        {level != null && (
          <span
            className={`nums absolute right-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-black ${
              locked
                ? "border border-red-500/60 bg-black/80 text-red-300"
                : `bg-black/75 ${r.badge}`
            }`}
            dir="ltr"
            title={`רמה ${level}`}
          >
            {level}
          </span>
        )}
        {locked && (
          <span
            aria-label="נעול — הגיבור ברמה נמוכה מדי"
            className="absolute bottom-1 left-1 rounded bg-black/80 px-1 text-[11px]"
          >
            🔒
          </span>
        )}
        {details?.equipped && (
          <span className="absolute bottom-1 right-1 rounded bg-emerald-600/90 px-1 text-[9px] font-black text-white">
            לבוש
          </span>
        )}
        {details?.owned && !details.equipped && (
          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[10px] font-black text-emerald-300">
            ✓
          </span>
        )}
      </div>
      {name && <span className="text-xs font-semibold text-zinc-300">{name}</span>}

      {/* -------- hover / focus tooltip -------- */}
      {details && (
        <div
          role="tooltip"
          className={`pointer-events-none invisible absolute right-1/2 z-40 w-48 translate-x-1/2 rounded-lg border border-gold/40 bg-[#100d08]/97 p-3 text-right opacity-0 shadow-[0_8px_30px_rgba(0,0,0,0.8)] transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${
            tooltipBelow ? "top-full mt-2" : "bottom-full mb-2"
          }`}
          dir="rtl"
        >
          <p className={`text-sm font-black ${r.text}`}>{details.name}</p>
          <p className="mt-0.5 text-[10px] text-zinc-500">
            דרגה: <span className={r.text}>{details.rarityLabel}</span>
            {level != null && (
              <>
                {" · "}רמת פריט: <span className="nums text-zinc-300">{level}</span>
              </>
            )}
          </p>

          <div className="rule-gold my-2" />

          {/* what the item grants */}
          <p className="text-xs text-zinc-300">
            {details.statIcon}{" "}
            <span className="nums font-black text-emerald-400" dir="ltr">
              +{formatBonus(details.bonusPct)}%
            </span>{" "}
            {details.statLabel}
          </p>

          {/* requirement */}
          <p
            className={`mt-1 text-[11px] ${
              details.meetsRequirement === false ? "text-red-400" : "text-emerald-400"
            }`}
          >
            {details.meetsRequirement === false ? "✗" : "✓"} דרישה: גיבור רמה{" "}
            <span className="nums">{details.requiredLevel}</span>
          </p>

          {details.equipped && (
            <p className="mt-1 text-[11px] font-bold text-emerald-300">✔ לבוש כעת</p>
          )}
          {details.owned && !details.equipped && (
            <p className="mt-1 text-[11px] text-zinc-400">נמצא ברשותך</p>
          )}
          {details.hint && (
            <p className="mt-2 border-t border-white/10 pt-1.5 text-[10px] text-gold-dim">
              {details.hint}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
