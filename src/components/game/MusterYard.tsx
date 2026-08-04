"use client";

import type { CSSProperties } from "react";
import { formatNumber } from "@/lib/game/format";
import { useCountUp, type Pulse } from "@/components/ui/motion";
import { useT } from "@/i18n/client";

/**
 * The parade ground drawn on every training card: a torch-lit yard behind the
 * fortress wall, with a rank of this unit's own silhouettes standing in it.
 *
 * The rank is *live data* — the number of figures tracks how many of the unit
 * the empire actually holds (logarithmically, so a garrison of five and one of
 * fifty thousand both read at a glance), and each unit stands differently:
 * soldiers shoulder a spear, spies keep to the shadows, mine slaves carry a
 * pick. Training new units marches fresh figures in from the gate.
 */

export type UnitKind = "soldiers" | "spies" | "mineSlaves";

/** Per-unit livery: the colour its silhouettes and torchlight are lit in. */
const UNIT_TINT: Record<UnitKind, { deep: string; mid: string; bright: string; glow: string }> = {
  soldiers: {
    deep: "#3a1d12",
    mid: "#b4703a",
    bright: "#f0c98a",
    glow: "rgba(228, 160, 90, 0.42)",
  },
  spies: {
    deep: "#1b1b2e",
    mid: "#5f5f8e",
    bright: "#b9b9e2",
    glow: "rgba(140, 140, 210, 0.34)",
  },
  mineSlaves: {
    deep: "#33291a",
    mid: "#9a8446",
    bright: "#e2cf94",
    glow: "rgba(210, 185, 110, 0.36)",
  },
};

/** The widest rank the yard can hold before it would start to crowd. */
const MAX_FIGURES = 13;

/** Embers off the torches — fixed table, so SSR and hydration agree. */
const EMBERS = [
  { x: "11%", d: "0s", dur: "4.4s" },
  { x: "16%", d: "1.9s", dur: "5.2s" },
  { x: "85%", d: "0.8s", dur: "4.8s" },
  { x: "90%", d: "3.1s", dur: "5.6s" },
];

/** The squad that marches in when training settles. */
const RECRUITS = [0, 130, 260];

export interface MusterYardProps {
  unit: UnitKind;
  /** Plural unit name, for the drawing's accessible label. */
  label: string;
  owned: number;
  /** Military power per unit — 0 for the units that don't fight. */
  power: number;
  /** A settled training order — marches the recruits in. */
  pulse: Pulse<"train"> | null;
}

/**
 * How many silhouettes stand for `owned`. Logarithmic: unit counts span
 * several orders of magnitude, and a linear map would fill the yard for good
 * after the first hundred.
 */
function rankSize(owned: number): number {
  if (owned <= 0) return 0;
  return Math.max(1, Math.min(MAX_FIGURES, Math.round(Math.log10(owned + 1) * 3.4)));
}

export function MusterYard({ unit, label, owned, power, pulse }: MusterYardProps) {
  const tint = UNIT_TINT[unit];
  const figures = rankSize(owned);
  const shownOwned = useCountUp(owned);

  const style = {
    "--unit-deep": tint.deep,
    "--unit": tint.mid,
    "--unit-bright": tint.bright,
    "--unit-glow": tint.glow,
  } as CSSProperties;

  const t = useT();
  return (
    <div
      className={`yard yard-${unit}${pulse ? " yard-active" : ""}`}
      style={style}
      role="img"
      aria-label={
        owned > 0
          ? t("{unit} — {count} יחידות במסדר", {
              unit: label,
              count: formatNumber(owned),
            })
          : t("{unit} — המסדר ריק", { unit: label })
      }
    >
      <span className="yard-sky" aria-hidden />
      <span className="yard-wall" aria-hidden />
      <span className="yard-gate" aria-hidden />

      {/* the two torches that light the yard */}
      <span className="yard-torch yard-torch-l" aria-hidden>
        <span className="yard-flame" />
      </span>
      <span className="yard-torch yard-torch-r" aria-hidden>
        <span className="yard-flame" />
      </span>
      <span className="yard-embers" aria-hidden>
        {EMBERS.map((ember) => (
          <span
            key={ember.x}
            style={{ "--x": ember.x, "--d": ember.d, "--dur": ember.dur } as CSSProperties}
          />
        ))}
      </span>

      <span className="yard-ground" aria-hidden />

      {/* -------- the rank itself -------- */}
      <div className="yard-rank" aria-hidden>
        {Array.from({ length: figures }).map((_, i) => (
          <span key={i} className="yard-figure" style={{ "--i": i } as CSSProperties}>
            <span className="yard-head" />
            <span className="yard-body" />
            <span className="yard-tool" />
          </span>
        ))}
      </div>

      {owned <= 0 && <span className="yard-empty">{t("המסדר ריק")}</span>}

      {/* -------- the muster roll -------- */}
      <div className="yard-plate">
        <span className="yard-plate-count nums" dir="ltr">
          {formatNumber(shownOwned)}
        </span>
        <span className="yard-plate-label">
          {label}
          {power > 0 ? (
            <>
              {" · "}
              <span className="nums" dir="ltr">
                {formatNumber(owned * power)}
              </span>{" "}
              {t("עוצמה")}
            </>
          ) : null}
        </span>
      </div>

      {/* remounted per pulse, so an identical repeat marches again */}
      {pulse && (
        <span className="yard-recruits" key={pulse.id} aria-hidden>
          {RECRUITS.map((delay) => (
            <span key={delay} className="yard-figure yard-recruit" style={{ "--d": `${delay}ms` } as CSSProperties}>
              <span className="yard-head" />
              <span className="yard-body" />
              <span className="yard-tool" />
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
