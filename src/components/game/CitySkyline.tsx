import type { CSSProperties } from "react";
import { cityFullName, cityName } from "@/lib/game/cities";

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

export function CitySkyline({ cities, maxCities }: CitySkylineProps) {
  return (
    <div
      className="skyline"
      role="img"
      aria-label={`הממלכה שלך — ${cities} ערים מתוך ${maxCities}, ומושבך ב${cityName(cities)}`}
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
              title={`${i + 1}. ${cityFullName(i + 1)}`}
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
        {cityName(cities)} ·{" "}
        <span className="nums" dir="ltr">
          {cities} / {maxCities}
        </span>{" "}
        ערים · תפוקת מכרות{" "}
        <span className="nums" dir="ltr">
          ×{cities}
        </span>
      </p>
    </div>
  );
}
