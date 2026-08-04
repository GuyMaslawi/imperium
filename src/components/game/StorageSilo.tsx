"use client";

import type { CSSProperties } from "react";
import { formatNumber } from "@/lib/game/format";
import { oreVars, type OreKind } from "./oreTint";
import { useAfterFirstPaint, type Pulse } from "@/components/ui/motion";
import { useT } from "@/i18n/client";

/**
 * The warehouse drawn on every storage card: a ribbed silo whose contents rise
 * from empty on first paint, settle at the real fill level, and get crates
 * dropped in — or hauled out — every time a transfer settles.
 *
 * Gold pools like a liquid, so it carries a rolling crest; the three solids sit
 * as a heaped pile with a jagged surface. Same machine, different cargo.
 */

/** Four wave periods across a 120-unit box — one period is a quarter of the
 *  box, which is what lets the sliding crest loop without a seam. */
const LIQUID_CREST =
  "M0 7 Q 7.5 1 15 7 T 30 7 T 45 7 T 60 7 T 75 7 T 90 7 T 105 7 T 120 7 V14 H0 Z";

/** The same trick with a saw edge, for material that heaps instead of pooling. */
const SOLID_CREST =
  "M0 9 L7.5 3 L15 9 L22.5 4 L30 9 L37.5 3 L45 9 L52.5 4 L60 9 L67.5 3 L75 9 " +
  "L82.5 4 L90 9 L97.5 3 L105 9 L112.5 4 L120 9 V14 H0 Z";

/** Dust hanging over the stock. */
const MOTES = [
  { x: "24%", d: "0s", dur: "4.6s" },
  { x: "44%", d: "1.4s", dur: "5.4s" },
  { x: "62%", d: "2.9s", dur: "4.9s" },
  { x: "78%", d: "0.7s", dur: "6.0s" },
];

/**
 * Crates moving through the hatch. Hand-picked rather than random so the fall
 * reads as a scatter, and so nothing depends on Math.random (which would differ
 * between the server render and hydration).
 */
const CRATES = [
  { x: "32%", d: 0, rot: 260, dx: "0.3rem" },
  { x: "40%", d: 150, rot: -220, dx: "-0.4rem" },
  { x: "48%", d: 60, rot: 300, dx: "0.2rem" },
  { x: "56%", d: 240, rot: -280, dx: "0.5rem" },
  { x: "64%", d: 110, rot: 200, dx: "-0.3rem" },
  { x: "36%", d: 330, rot: -320, dx: "0.4rem" },
  { x: "52%", d: 420, rot: 240, dx: "-0.5rem" },
  { x: "60%", d: 500, rot: -200, dx: "0.2rem" },
];

/** Marks up the side of the glass, so a level can be read without the number. */
const TICKS = ["25%", "50%", "75%"];

export type SiloPulseKind = "deposit" | "withdraw";

export interface StorageSiloProps {
  resource: OreKind;
  /** Warehouse name, for the drawing's accessible label. */
  label: string;
  stored: number;
  capacity: number;
  /** A settled deposit / withdrawal — replays the crate run. */
  pulse: Pulse<SiloPulseKind> | null;
}

export function StorageSilo({
  resource,
  label,
  stored,
  capacity,
  pulse,
}: StorageSiloProps) {
  const ratio = capacity > 0 ? Math.min(1, stored / capacity) : 0;
  const pct = Math.round(ratio * 100);
  const nearFull = ratio >= 0.9;

  // Fill from empty on first paint rather than snapping to the final level. A
  // non-zero stock always shows a sliver, so "there is something in there" is
  // never rounded away to an empty silo.
  const filled = useAfterFirstPaint();
  const fillPct = filled ? Math.min(100, Math.max(stored > 0 ? 4 : 0, pct)) : 0;

  const crest = resource === "gold" ? LIQUID_CREST : SOLID_CREST;

  const t = useT();
  return (
    <div
      className={`silo${nearFull ? " silo-full" : ""}${pulse ? ` silo-${pulse.kind}` : ""}`}
      style={oreVars(resource)}
      role="img"
      aria-label={t("{store} — {stored} מתוך {capacity}, {pct}% מלא", {
        store: label,
        stored: formatNumber(stored),
        capacity: formatNumber(capacity),
        pct,
      })}
    >
      <span className="silo-floor" aria-hidden />
      <span className="silo-pipe" aria-hidden />

      <div className="silo-body" aria-hidden>
        <span className="silo-hatch" />
        {nearFull && <span className="silo-beacon" />}

        <div className="silo-glass">
          {/* The crest rides *above* the fill line, so an empty warehouse must
              drop the whole layer — a zero-height fill would still show its
              surface as a pile lying on the floor of the glass. */}
          {stored > 0 ? (
            <div className="silo-fill" style={{ height: `${fillPct}%` }}>
              <svg className="silo-crest" viewBox="0 0 120 14" preserveAspectRatio="none" aria-hidden>
                <path d={crest} />
              </svg>
              <svg
                className="silo-crest silo-crest-2"
                viewBox="0 0 120 14"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path d={crest} />
              </svg>
              <span className="silo-grain" data-grain={resource} />
              <span className="silo-sheen" />
              {/* clipped to the stock, so a mote never floats in empty air */}
              <span className="silo-motes">
                {MOTES.map((mote) => (
                  <span
                    key={mote.x}
                    className="silo-mote"
                    style={
                      { "--x": mote.x, "--d": mote.d, "--dur": mote.dur } as CSSProperties
                    }
                  />
                ))}
              </span>
            </div>
          ) : (
            <span className="silo-empty">{t("המחסן ריק")}</span>
          )}

          {TICKS.map((tick) => (
            <span key={tick} className="silo-tick" style={{ "--p": tick } as CSSProperties} />
          ))}
          <span className="silo-glare" />
        </div>

        <span className="silo-plate nums" dir="ltr">
          {pct}%
        </span>
      </div>

      <span className="silo-leg silo-leg-l" aria-hidden />
      <span className="silo-leg silo-leg-r" aria-hidden />
      <span className="silo-chute" aria-hidden />

      {/* remounted per pulse, so an identical repeat replays the run */}
      {pulse && (
        <span className="silo-crates" key={pulse.id} aria-hidden>
          {CRATES.map((crate) => (
            <span
              key={crate.x + crate.d}
              className={
                pulse.kind === "deposit" ? "silo-crate silo-crate-in" : "silo-crate silo-crate-out"
              }
              style={
                {
                  "--x": crate.x,
                  "--d": `${crate.d}ms`,
                  "--rot": `${crate.rot}deg`,
                  "--dx": crate.dx,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}
    </div>
  );
}
