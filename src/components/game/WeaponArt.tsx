"use client";

import { useEffect, useRef, useState } from "react";
import {
  WEAPON_CATEGORY_META,
  weaponArtPath,
  type WeaponDefinition,
} from "@/lib/game/weapons";

const SIZES = {
  sm: "h-12 w-12",
  md: "h-14 w-14",
} as const;

/**
 * The generated portrait for a weapon — a small square plate beside its name.
 * The art is rendered on black, so it sits on a dark inset that it blends into
 * rather than a framed tile. Until (or unless) the image loads, the category
 * emoji holds the space, so a missing file degrades instead of leaving a hole.
 */
export function WeaponArt({
  weapon,
  size = "md",
  locked = false,
}: {
  weapon: WeaponDefinition;
  size?: keyof typeof SIZES;
  /** The weapon is not unlocked yet — the art is dimmed and desaturated. */
  locked?: boolean;
}) {
  const [imgOk, setImgOk] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // On a warm cache the image can finish before hydration, so `onLoad` never
  // fires — check `.complete` on mount to catch that. Same trick as ItemTile.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) setImgOk(true);
  }, []);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-lg border border-border-subtle bg-black/60 ${SIZES[size]}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center text-2xl opacity-70"
      >
        {WEAPON_CATEGORY_META[weapon.category].icon}
      </span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={weaponArtPath(weapon)}
        alt=""
        loading="lazy"
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          imgOk ? "opacity-100" : "opacity-0"
        } ${locked ? "grayscale-[0.8] brightness-75" : ""}`}
        onLoad={() => setImgOk(true)}
        onError={() => setImgOk(false)}
      />
    </div>
  );
}
