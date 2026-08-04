"use client";

import type { CSSProperties } from "react";
import { formatNumber } from "@/lib/game/format";
import { oreVars, type OreKind } from "./oreTint";
import { useCountUp, type Pulse } from "@/components/ui/motion";
import { useT } from "@/i18n/client";

/**
 * The working mine drawn on every production card: a pit-head whose hoist wheel
 * turns, a bucket riding the cable up the shaft, and a conveyor feeding a pile
 * of ore that glows in the resource's own colour.
 *
 * The drawing is *live data*, not scenery — the crew assigned to the mine sets
 * how fast the machine runs, and a mine with nobody on it visibly shuts down.
 * The figures printed on the plate and in the card below are still the truth,
 * so the whole scene goes still under prefers-reduced-motion.
 */

/** Rising dust. Fixed table, so the server render and hydration agree. */
const MOTES = [
  { x: "14%", d: "0s", dur: "5.2s" },
  { x: "31%", d: "1.7s", dur: "6.1s" },
  { x: "52%", d: "3.1s", dur: "5.6s" },
  { x: "68%", d: "0.9s", dur: "6.8s" },
  { x: "86%", d: "2.4s", dur: "5.9s" },
];

/** Ore riding the conveyor — staggered so the belt never looks like a comb. */
const NUGGETS = [
  { d: "0s", rot: "-12deg", size: "0.42rem" },
  { d: "0.9s", rot: "18deg", size: "0.34rem" },
  { d: "1.7s", rot: "-4deg", size: "0.46rem" },
  { d: "2.6s", rot: "26deg", size: "0.36rem" },
  { d: "3.4s", rot: "8deg", size: "0.4rem" },
];

/** The burst thrown out of the shaft when an upgrade settles. */
const SPARKS = [
  { d: 0, dx: "-2.6rem", dy: "-2.2rem" },
  { d: 60, dx: "-1.4rem", dy: "-3.1rem" },
  { d: 120, dx: "-0.2rem", dy: "-2.6rem" },
  { d: 40, dx: "-3.6rem", dy: "-1.4rem" },
  { d: 180, dx: "0.7rem", dy: "-1.9rem" },
  { d: 240, dx: "-2.1rem", dy: "-3.4rem" },
  { d: 300, dx: "-4.4rem", dy: "-2.0rem" },
  { d: 150, dx: "-3.0rem", dy: "-0.7rem" },
];

export type MineRigPulseKind = "upgrade" | "assign";

export interface MineRigProps {
  resource: OreKind;
  /** Mine name, for the drawing's accessible label. */
  label: string;
  /** e.g. "עץ" — the unit printed on the output plate. */
  resourceLabel: string;
  /** Crew on this mine. Sets the machine's speed; zero shuts it down. */
  slaves: number;
  level: number;
  /** Real output per regular update, bonuses included. */
  output: number;
  /** A settled upgrade / re-assignment — replays the burst. */
  pulse: Pulse<MineRigPulseKind> | null;
}

/**
 * Seconds per turn of the hoist wheel. A lone worker cranks it over slowly; a
 * real crew has it spinning. Logarithmic, because crews span several orders of
 * magnitude and a linear map would peg the wheel at its floor almost at once.
 */
function wheelPeriod(slaves: number): number {
  if (slaves <= 0) return 0;
  return Math.max(0.85, 3.2 - Math.log10(slaves + 1) * 0.75);
}

export function MineRig({
  resource,
  label,
  resourceLabel,
  slaves,
  level,
  output,
  pulse,
}: MineRigProps) {
  const t = useT();
  // A mine with no crew — or one that was never built — produces nothing, and
  // the drawing says so: the machine stops rather than miming work.
  const idle = slaves <= 0 || level <= 0;
  const period = wheelPeriod(slaves) || 3;
  const shownOutput = useCountUp(output);

  const style = {
    ...oreVars(resource),
    "--spin": `${period}s`,
    // The belt is geared off the same shaft, so it tracks the wheel's speed.
    "--belt": `${period * 1.9}s`,
  } as CSSProperties;

  return (
    <div
      className={`rig${idle ? " rig-idle" : ""}${pulse ? " rig-active" : ""}`}
      style={style}
      role="img"
      aria-label={
        idle
          ? t("{mine} — מושבת, אין עובדים", { mine: label })
          : t("{mine} — {slaves} עובדים, {output} {resource} לעדכון", {
              mine: label,
              slaves: formatNumber(slaves),
              output: formatNumber(output),
              resource: resourceLabel,
            })
      }
    >
      <span className="rig-haze" aria-hidden />
      <span className="rig-ground" aria-hidden />
      <span className="rig-vein" aria-hidden />

      {/* -------- the pit-head -------- */}
      <div className="rig-head" aria-hidden>
        <span className="rig-leg rig-leg-l" />
        <span className="rig-leg rig-leg-r" />
        <span className="rig-brace" />
        <span className="rig-beam" />
        <span className="rig-wheel">
          <span className="rig-spoke" style={{ "--a": "0deg" } as CSSProperties} />
          <span className="rig-spoke" style={{ "--a": "60deg" } as CSSProperties} />
          <span className="rig-spoke" style={{ "--a": "120deg" } as CSSProperties} />
          <span className="rig-hub" />
        </span>
        <span className="rig-shaft">
          <span className="rig-cable" />
          <span className="rig-bucket" />
        </span>
      </div>

      {/* -------- conveyor and the pile it feeds -------- */}
      <div className="rig-belt" aria-hidden>
        <span className="rig-tread" />
        {NUGGETS.map((nugget) => (
          <span
            key={nugget.d}
            className="rig-nugget"
            style={
              {
                "--d": nugget.d,
                "--rot": nugget.rot,
                "--s": nugget.size,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <span className="rig-pile" aria-hidden />

      <span className="rig-motes" aria-hidden>
        {MOTES.map((mote) => (
          <span
            key={mote.x}
            className="rig-mote"
            style={{ "--x": mote.x, "--d": mote.d, "--dur": mote.dur } as CSSProperties}
          />
        ))}
      </span>

      {/* -------- the readout bolted to the frame -------- */}
      <div className="rig-plate">
        {idle ? (
          <>
            <span className="rig-plate-halt">{t("מושבת")}</span>
            <span className="rig-plate-label">
              {level <= 0 ? t("המכרה טרם נבנה") : t("אין עובדים במכרה")}
            </span>
          </>
        ) : (
          <>
            <span className="rig-plate-out nums" dir="ltr">
              +{formatNumber(shownOutput)}
            </span>
            <span className="rig-plate-label">
              {resourceLabel} {t("לעדכון · צוות")}{" "}
              <span className="nums" dir="ltr">
                {formatNumber(slaves)}
              </span>
            </span>
          </>
        )}
      </div>

      {/* remounted per pulse, so an identical repeat replays the burst */}
      {pulse && (
        <span className="rig-burst" key={pulse.id} aria-hidden>
          {SPARKS.map((spark) => (
            <span
              key={`${spark.dx}${spark.d}`}
              className="rig-spark"
              style={
                {
                  "--d": `${spark.d}ms`,
                  "--dx": spark.dx,
                  "--dy": spark.dy,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}
    </div>
  );
}
