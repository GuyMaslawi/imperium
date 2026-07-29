"use client";

import { useActionState } from "react";
import { foundCity, type ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { CITIZEN_GROWTH_LEVELS_PER_CITY } from "@/lib/game/constants";
import { cityAt } from "@/lib/game/cities";

const COST_RESOURCES = [
  { key: "gold", icon: "gold" },
  { key: "wood", icon: "wood" },
  { key: "iron", icon: "iron" },
  { key: "stone", icon: "stone" },
] as const;

export interface CityFoundCardProps {
  cities: number;
  maxCities: number;
  heroLevel: number;
  heroRequired: number;
  cost: { gold: number; wood: number; iron: number; stone: number; soldiers: number };
  available: { gold: number; wood: number; iron: number; stone: number };
  soldiersAvailable: number;
}

/** Mine production scales with the city count: ×1 now, ×(cities+1) after upgrading. */

export function CityFoundCard({
  cities,
  maxCities,
  heroLevel,
  heroRequired,
  cost,
  available,
  soldiersAvailable,
}: CityFoundCardProps) {
  const [state, action] = useActionState<ActionState, FormData>(foundCity, {});

  const isMax = cities >= maxCities;
  const meetsHero = heroLevel >= heroRequired;
  const enoughSoldiers = soldiersAvailable >= cost.soldiers;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-panel-inset"
        >
          <Icon name="base" size={26} className="text-crimson-bright" />
        </span>
        <div>
          <h3 className="font-bold text-gold-bright">עליית עיר</h3>
          {/* Named, not numbered: the card is the moment the player decides to
              make the climb, and "אשמורן → תרשיש" is a destination in a way
              that "3 → 4" never was. The tier stays alongside — it is what the
              costs and the hero gate are keyed to. */}
          <p className="text-xs font-semibold text-gold">
            <span className="text-bone">{cityAt(cities).name}</span>
            {!isMax && (
              <>
                {" → "}
                <span className="text-bone">{cityAt(cities + 1).name}</span>
              </>
            )}{" "}
            <span className="font-normal text-gold-dim">
              (עיר{" "}
              <span className="nums" dir="ltr">
                {cities}
              </span>{" "}
              מתוך{" "}
              <span className="nums" dir="ltr">
                {maxCities}
              </span>
              )
            </span>
          </p>
        </div>
      </div>

      {isMax ? (
        <p className="text-sm text-zinc-400">
          הגעת ל<span className="font-bold text-bone">{cityAt(cities).name}</span> — העיר
          האחרונה. תפוקת המכרות ורמות קבלת האזרחים שלך במקסימום.
        </p>
      ) : (
        <>
          <p className="text-sm text-zinc-400">
            עליית עיר מכפילה את תפוקת המכרות ל־
            <span className="font-bold text-emerald-400 nums" dir="ltr">
              ×{cities + 1}
            </span>{" "}
            ופותחת עוד{" "}
            <span className="font-bold text-emerald-400 nums" dir="ltr">
              {CITIZEN_GROWTH_LEVELS_PER_CITY}
            </span>{" "}
            רמות לשדרוג קבלת האזרחים.
          </p>

          {/* Requirements — these are gates the empire must meet; none are spent. */}
          <div className="panel-inset space-y-2 rounded-lg p-3 text-xs">
            <p className="font-semibold text-gold-dim">דרישות (אינן נצרכות):</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className={meetsHero ? "text-emerald-400" : "text-red-400"}>
                <Icon name="hero" size={14} className="inline align-[-2px]" /> גיבור רמה{" "}
                <span className="nums" dir="ltr">
                  {heroRequired}
                </span>{" "}
                (כעת{" "}
                <span className="nums" dir="ltr">
                  {heroLevel}
                </span>
                ) {meetsHero ? "✓" : "✗"}
              </span>
              <span className={enoughSoldiers ? "text-emerald-400" : "text-red-400"}>
                <Icon name="army" size={14} className="inline align-[-2px]" />{" "}
                <span className="nums" dir="ltr">
                  {formatNumber(cost.soldiers)}
                </span>{" "}
                חיילים בצבא {enoughSoldiers ? "✓" : "✗"}
              </span>
            </div>
          </div>

          <div className="panel-inset space-y-2 rounded-lg p-3 text-xs">
            <p className="font-semibold text-gold-dim">עלות עלייה (נצרכת):</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-zinc-400">
              {COST_RESOURCES.map(({ key, icon }) => {
                const missing = available[key] < cost[key];
                return (
                  <span
                    key={key}
                    className={missing ? "font-semibold text-red-400" : undefined}
                    title={missing ? "אין מספיק מהמשאב הזה" : undefined}
                  >
                    <Icon name={icon} size={14} className="inline align-[-2px]" />{" "}
                    <span className="nums" dir="ltr">
                      {formatNumber(cost[key])}
                    </span>
                  </span>
                );
              })}
            </div>
          </div>

          <form action={action} className="mt-auto">
            <SubmitButton
              className="btn btn-gold w-full"
              pendingText="מעלה עיר..."
              disabled={!meetsHero || !enoughSoldiers}
            >
              עלה עיר
            </SubmitButton>
          </form>
        </>
      )}

      <FormMessage error={state.error} success={state.success} />
    </Card>
  );
}
