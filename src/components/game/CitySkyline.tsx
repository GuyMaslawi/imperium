import type { CSSProperties } from "react";
import { cityFullName, cityName } from "@/lib/game/cities";
import { getT } from "@/i18n/server";

/**
 * The empire's cities, drawn as a skyline instead of a row of icons.
 *
 * Each tower is one city tier: the ones you hold are lit stone with burning
 * windows and a flag on the roof, the ones ahead are dark scaffolding. Towers
 * grow with their tier, so the ladder to city ten reads as a climb rather than
 * ten identical boxes.
 *
 * Deliberately a server component — the rise on load is a CSS keyframe that
 * animates to `var(--h)`, so no client JavaScript is needed for it.
 */

/** Stars over the skyline. Fixed table: nothing here may depend on randomness. */
const STARS = [
  { x: "7%", y: "18%", d: "0s" },
  { x: "19%", y: "9%", d: "1.4s" },
  { x: "31%", y: "22%", d: "2.7s" },
  { x: "44%", y: "12%", d: "0.8s" },
  { x: "57%", y: "24%", d: "3.3s" },
  { x: "69%", y: "8%", d: "1.9s" },
  { x: "83%", y: "19%", d: "2.2s" },
  { x: "93%", y: "11%", d: "0.4s" },
];

export interface CitySkylineProps {
  cities: number;
  maxCities: number;
}

export async function CitySkyline({ cities, maxCities }: CitySkylineProps) {
  const t = await getT();
  return (
    <div
      className="skyline"
      role="img"
      aria-label={t("הממלכה שלך — {cities} ערים מתוך {max}, ומושבך ב{city}", {
        cities,
        max: maxCities,
        city: cityName(t, cities),
      })}
    >
      <span className="skyline-moon" aria-hidden />
      <span className="skyline-stars" aria-hidden>
        {STARS.map((star) => (
          <span
            key={star.x}
            style={{ "--x": star.x, "--y": star.y, "--d": star.d } as CSSProperties}
          />
        ))}
      </span>

      <div className="skyline-row" aria-hidden>
        {Array.from({ length: maxCities }).map((_, i) => {
          const held = i < cities;
          // Towers climb across the row, so the tenth city towers over the first.
          const height = 38 + (i / Math.max(1, maxCities - 1)) * 56;
          return (
            <span
              key={i}
              className={`skyline-tower${held ? " skyline-held" : ""}`}
              style={{ "--h": `${height}%`, "--i": i } as CSSProperties}
              title={cityFullName(t, i + 1)}
            >
              <span className="skyline-roof" />
              <span className="skyline-windows" />
              {held && <span className="skyline-flag" />}
            </span>
          );
        })}
      </div>

      <span className="skyline-ground" aria-hidden />

      {/* The plate used to count towers only. The lead line is now the city the
          player actually sits in — the towers behind it already do the counting. */}
      <p className="skyline-plate">
        {cityName(t, cities)} ·{" "}
        <span className="nums" dir="ltr">
          {cities} / {maxCities}
        </span>{" "}
        {t("ערים · תפוקת מכרות")}{" "}
        <span className="nums" dir="ltr">
          ×{cities}
        </span>
      </p>
    </div>
  );
}
