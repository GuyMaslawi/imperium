"use client";

import type { CSSProperties } from "react";
import { formatNumber } from "@/lib/game/format";
import { useCountUp } from "@/components/ui/motion";
import { useT } from "@/i18n/client";

/**
 * The forge behind the weapon shop: a furnace burning, a hammer working the
 * anvil, sparks off every strike. One scene per category, lit in that
 * category's own colour — war-red for attack, cold steel for defence, a dim
 * violet for the spy workshop — so switching tabs visibly changes the smithy
 * you are standing in.
 *
 * The tier pips along the bottom are the real unlock ladder: lit up to the
 * tier this empire has opened, dark beyond it.
 */

export type ForgeCategory = "ATTACK" | "DEFENSE" | "SPY";

const FORGE_TINT: Record<ForgeCategory, { deep: string; mid: string; bright: string; glow: string }> = {
  ATTACK: {
    deep: "#43150c",
    mid: "#d2542a",
    bright: "#ffcf8f",
    glow: "rgba(226, 106, 48, 0.45)",
  },
  DEFENSE: {
    deep: "#0f2735",
    mid: "#3f8bb4",
    bright: "#b9e4f7",
    glow: "rgba(90, 166, 232, 0.4)",
  },
  SPY: {
    deep: "#241536",
    mid: "#7b53b8",
    bright: "#d8bef5",
    glow: "rgba(160, 107, 224, 0.4)",
  },
};

/** Sparks off the anvil. Their delays are fractions of one hammer cycle. */
const SPARKS = [
  { d: "0s", dx: "-2.4rem", dy: "-1.5rem" },
  { d: "0.05s", dx: "-1.5rem", dy: "-2.1rem" },
  { d: "0.1s", dx: "-0.6rem", dy: "-1.7rem" },
  { d: "0.04s", dx: "0.7rem", dy: "-2rem" },
  { d: "0.12s", dx: "1.6rem", dy: "-1.3rem" },
  { d: "0.08s", dx: "2.5rem", dy: "-1.8rem" },
];

/** Coals glowing in the furnace mouth. */
const EMBERS = [
  { x: "12%", d: "0s", dur: "4.2s" },
  { x: "20%", d: "1.6s", dur: "5.1s" },
  { x: "27%", d: "3.0s", dur: "4.6s" },
];

export interface ArmoryForgeProps {
  category: ForgeCategory;
  /** e.g. "התקפה" — printed on the plate. */
  label: string;
  /** "כוח התקפה כולל מנשקים" etc. */
  powerLabel: string;
  totalPower: number;
  unlockedTier: number;
  maxTier: number;
}

export function ArmoryForge({
  category,
  label,
  powerLabel,
  totalPower,
  unlockedTier,
  maxTier,
}: ArmoryForgeProps) {
  const t = useT();
  const tint = FORGE_TINT[category];
  const shownPower = useCountUp(totalPower);

  const style = {
    "--smithy-deep": tint.deep,
    "--smithy": tint.mid,
    "--smithy-bright": tint.bright,
    "--smithy-glow": tint.glow,
  } as CSSProperties;

  return (
    <div
      className="smithy"
      style={style}
      role="img"
      aria-label={t(
        "נפחיית {label} — {powerLabel}: {power}, שכבה {tier} מתוך {maxTier}",
        {
          label,
          powerLabel,
          power: formatNumber(totalPower),
          tier: unlockedTier,
          maxTier,
        }
      )}
    >
      <span className="smithy-wall" aria-hidden />
      <span className="smithy-heat" aria-hidden />

      {/* -------- the furnace -------- */}
      <span className="smithy-hearth" aria-hidden>
        <span className="smithy-fire" />
      </span>
      <span className="smithy-coals" aria-hidden>
        {EMBERS.map((ember) => (
          <span
            key={ember.x}
            style={{ "--x": ember.x, "--d": ember.d, "--dur": ember.dur } as CSSProperties}
          />
        ))}
      </span>

      {/* -------- anvil, hammer and the sparks off the strike -------- */}
      <span className="smithy-anvil" aria-hidden>
        <span className="smithy-blade" />
      </span>
      <span className="smithy-hammer" aria-hidden>
        <span className="smithy-hammer-head" />
      </span>
      <span className="smithy-sparks" aria-hidden>
        {SPARKS.map((spark) => (
          <span
            key={spark.dx}
            style={{ "--d": spark.d, "--dx": spark.dx, "--dy": spark.dy } as CSSProperties}
          />
        ))}
      </span>

      {/* the rest of the workshop — a finished rack and the quench barrel, so
          the strip reads as a room rather than one lit corner */}
      <span className="smithy-rack" aria-hidden>
        <span className="smithy-arm" style={{ "--a": "-14deg" } as CSSProperties} />
        <span className="smithy-arm" style={{ "--a": "-4deg" } as CSSProperties} />
        <span className="smithy-arm" style={{ "--a": "7deg" } as CSSProperties} />
      </span>
      <span className="smithy-barrel" aria-hidden>
        <span className="smithy-steam" />
        <span className="smithy-steam smithy-steam-2" />
      </span>

      <span className="smithy-floor" aria-hidden />

      {/* -------- the plate -------- */}
      <div className="smithy-plate">
        <span className="smithy-plate-power nums" dir="ltr">
          {formatNumber(shownPower)}
        </span>
        <span className="smithy-plate-label">{powerLabel}</span>
        <span className="smithy-tiers">
          {Array.from({ length: maxTier }).map((_, i) => (
            <span
              key={i}
              className={`smithy-tier${i < unlockedTier ? " smithy-tier-on" : ""}`}
              style={{ "--i": i } as CSSProperties}
            />
          ))}
          <span className="smithy-tier-count nums" dir="ltr">
            {unlockedTier}/{maxTier}
          </span>
        </span>
      </div>
    </div>
  );
}
