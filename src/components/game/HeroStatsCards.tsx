"use client";

import { useActionState } from "react";
import { allocateHeroPoints } from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import {
  HERO_POINT_STATS,
  HERO_STAT_META,
  type HeroPointStat,
} from "@/lib/game/hero";
import { formatBonus } from "@/components/game/ItemTile";
import { Icon } from "@/components/ui/Icon";
import { Tip } from "@/components/ui/Tip";

/**
 * The three point-allocatable stats (attack/defense/resources). Each card shows
 * ONLY the permanent % earned from allocated points — equipped items no longer
 * change these numbers; their combined yield lives in the power summary below.
 */
export function HeroStatsCards({
  points,
  unspentPoints,
}: {
  /** % from allocated points, per point stat. */
  points: Record<HeroPointStat, number>;
  unspentPoints: number;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    allocateHeroPoints,
    {}
  );

  return (
    <div className="flex w-full flex-col gap-3">
      {unspentPoints > 0 && (
        <Tip tip="נקודות שהתקבלו מעליות רמה וטרם הוקצו. לחיצה על +1 / +5 בכרטיס מקצה אותן לצמיתות (הן חוזרות רק באיפוס ברמה 100).">
          <div className="points-pulse w-full rounded-lg border bg-gold/10 p-3 text-center">
            <p className="text-xs font-bold text-gold-bright">
              <Icon name="spark" size={14} className="inline align-[-2px]" /> יש לך נקודות פנויות!
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

      {HERO_POINT_STATS.map((stat) => {
        const meta = HERO_STAT_META[stat];
        const pointsPct = points[stat];
        return (
          <div key={stat} className="panel-inset relative rounded-lg p-3">
            <Tip
              tip={
                <>
                  {meta.description}
                  <br />
                  אחוז זה מגיע אך ורק מהנקודות שהקצית ({formatBonus(pointsPct)}%).
                  חפצי הגיבור אינם משפיעים עליו — ראה &quot;סך הכל מהגיבור&quot;
                  למטה.
                </>
              }
            >
              <p className="cursor-help text-xs text-zinc-400">
                {meta.icon} {meta.label}
              </p>
            </Tip>
            <p className={`nums mt-0.5 text-lg font-bold ${meta.tone}`} dir="ltr">
              +{formatBonus(pointsPct)}%
            </p>
            {unspentPoints > 0 && (
              <div className="mt-2 flex flex-col gap-1.5">
                <div className="flex gap-1.5">
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
                <form action={formAction}>
                  <input type="hidden" name="stat" value={stat} />
                  <input type="hidden" name="amount" value={unspentPoints} />
                  <button
                    type="submit"
                    className="btn btn-ghost w-full px-2 py-1 text-[11px]"
                  >
                    שים את כל הנקודות ({unspentPoints})
                  </button>
                </form>
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
