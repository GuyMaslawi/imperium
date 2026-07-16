"use client";

import { useActionState } from "react";
import { allocateHeroPoints } from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import { HERO_STATS, HERO_STAT_META, type HeroStat } from "@/lib/game/hero";
import { formatBonus } from "@/components/game/ItemTile";
import { Tip } from "@/components/ui/Tip";

export interface StatBreakdown {
  points: number;
  items: number;
  total: number;
}

/**
 * The hero's six stats. Attack/defense/resources take allocated points
 * (a permanent +1% each) with equipped items stacking on top; turns,
 * diamonds and citizens come from equipped items only.
 */
export function HeroStatsCards({
  bonuses,
  unspentPoints,
}: {
  bonuses: Record<HeroStat, StatBreakdown>;
  unspentPoints: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    allocateHeroPoints,
    {}
  );

  return (
    <div className="flex flex-col gap-3 sm:w-40">
      {unspentPoints > 0 && (
        <Tip tip="נקודות שהתקבלו מעליות רמה וטרם הוקצו. לחיצה על +1 / +5 בכרטיס מקצה אותן לצמיתות (הן חוזרות רק באיפוס ברמה 100).">
          <div className="points-pulse w-full rounded-lg border bg-gold/10 p-3 text-center">
            <p className="text-xs font-bold text-gold-bright">
              ⭐ יש לך נקודות פנויות!
            </p>
            <p className="nums text-2xl font-black text-gold-bright" dir="ltr">
              {unspentPoints}
            </p>
            <p className="text-[10px] text-gold-dim">
              לחץ +1 / +5 בכרטיס כדי להקצות (כל נקודה = ‎+1%)
            </p>
          </div>
        </Tip>
      )}

      {HERO_STATS.map((stat) => {
        const meta = HERO_STAT_META[stat];
        const pointable = Boolean(meta.pointsField);
        const b = bonuses[stat];
        return (
          <div key={stat} className="panel-inset relative rounded-lg p-3">
            <Tip
              tip={
                <>
                  {meta.description}
                  <br />
                  {pointable ? (
                    <>
                      הסה&quot;כ מורכב מנקודות שהוקצו ({formatBonus(b.points)}%)
                      ומחפצים לבושים ({formatBonus(b.items)}%).
                    </>
                  ) : (
                    <>בונוס זה מגיע מחפצים לבושים בלבד — לא ניתן להקצות אליו נקודות.</>
                  )}
                </>
              }
            >
              <p className="cursor-help text-xs text-zinc-400">
                {meta.icon} {meta.label}
              </p>
            </Tip>
            <p className={`nums mt-0.5 text-lg font-bold ${meta.tone}`} dir="ltr">
              +{formatBonus(b.total)}%
            </p>
            {pointable && unspentPoints > 0 && (
              <div className="mt-2 flex gap-1.5">
                <form action={formAction} className="flex-1">
                  <input type="hidden" name="stat" value={stat} />
                  <input type="hidden" name="amount" value={1} />
                  <button type="submit" className="btn btn-gold w-full px-2 py-1 text-xs">
                    +1
                  </button>
                </form>
                {unspentPoints >= 5 && (
                  <form action={formAction} className="flex-1">
                    <input type="hidden" name="stat" value={stat} />
                    <input type="hidden" name="amount" value={5} />
                    <button type="submit" className="btn btn-ghost w-full px-2 py-1 text-xs">
                      +5
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        );
      })}

      {(state.error || state.success) && (
        <p
          className={`text-xs font-semibold ${
            state.error ? "text-red-400" : "text-emerald-400"
          }`}
        >
          {state.error ?? state.success}
        </p>
      )}
    </div>
  );
}
