"use client";

import { useActionState } from "react";
import { allocateHeroPoints } from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import {
  HERO_POINT_STATS,
  HERO_STAT_META,
  type HeroPointStat,
} from "@/lib/game/hero";
import { formatBonus } from "@/lib/game/format";
import { Icon } from "@/components/ui/Icon";
import { Tip } from "@/components/ui/Tip";
import { useT } from "@/i18n/client";

/**
 * The three point-allocatable stats (attack/defense/resources). Each one is a
 * single compact row — label, %, and the allocation buttons on one line — so
 * the three stack in half the panel's width beside the meters instead of
 * eating a full-width band of tall cards.
 *
 * A row shows ONLY the permanent % earned from allocated points; equipped items
 * no longer change these numbers, their combined yield lives in the power
 * summary below.
 *
 * `readOnly` is the dossier's view of somebody else's hero: the same three rows
 * and the same percentages, but no allocation buttons, no free-point banner and
 * copy that talks about "him" rather than "you".
 */
export function HeroStatsCards({
  points,
  unspentPoints,
  readOnly = false,
}: {
  /** % from allocated points, per point stat. */
  points: Record<HeroPointStat, number>;
  unspentPoints: number;
  /** Show-only: another player's allocation, with nothing to press. */
  readOnly?: boolean;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    allocateHeroPoints,
    {}
  );

  const t = useT();
  return (
    <div className="flex w-full flex-col gap-2">
      {!readOnly && unspentPoints > 0 && (
        <Tip tip={t("נקודות שהתקבלו מעליות רמה וטרם הוקצו. לחיצה על +1 / +5 בשורת התכונה מקצה אותן לצמיתות (הן חוזרות רק באיפוס ברמה 100).")}>
          {/* One line, not a stacked hero block: every row this costs pushes
              the stat rows down. */}
          <div className="points-pulse flex w-full flex-wrap items-center justify-center gap-x-2 rounded-lg border bg-gold/10 px-2 py-1 text-center">
            <p className="text-[11px] font-bold text-gold-bright">
              <Icon name="spark" size={13} className="inline align-[-2px]" />{" "}
              <span className="nums text-sm font-black" dir="ltr">
                {unspentPoints}
              </span>{" "}
              {t("נקודות פנויות — כל נקודה ‎+1%")}
            </p>
          </div>
        </Tip>
      )}

      {/* one compact row per point stat, stacked */}
      {HERO_POINT_STATS.map((stat) => {
        const meta = HERO_STAT_META[stat];
        const pointsPct = points[stat];
        return (
          <div
            key={stat}
            className="panel-inset flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2.5 py-1.5"
          >
            <Tip
              tip={
                <>
                  {t(meta.description)}
                  <br />
                  {readOnly
                    ? t("אחוז זה מגיע אך ורק מהנקודות שהקצה ({pct}%). חפצי הגיבור אינם משפיעים עליו — הם נספרים בנפרד.", {
                        pct: formatBonus(pointsPct),
                      })
                    : t("אחוז זה מגיע אך ורק מהנקודות שהקצית ({pct}%). חפצי הגיבור אינם משפיעים עליו — ראה ״סך הכל מהגיבור״ למטה.", {
                        pct: formatBonus(pointsPct),
                      })}
                </>
              }
            >
              <p className="cursor-help whitespace-nowrap text-[11px] text-zinc-400">
                <Icon name={meta.icon} size={13} className="inline align-[-2px]" />{" "}
                {t(meta.label)}
              </p>
            </Tip>
            <p
              className={`nums me-auto text-sm font-black ${meta.tone}`}
              dir="ltr"
            >
              +{formatBonus(pointsPct)}%
            </p>
            {!readOnly && unspentPoints > 0 && (
              <div className="flex items-center gap-1">
                <form action={formAction}>
                  <input type="hidden" name="stat" value={stat} />
                  <input type="hidden" name="amount" value={1} />
                  <button type="submit" className="btn btn-gold px-2 py-0.5 text-[11px]">
                    +1
                  </button>
                </form>
                {unspentPoints >= 5 && (
                  <form action={formAction}>
                    <input type="hidden" name="stat" value={stat} />
                    <input type="hidden" name="amount" value={5} />
                    <button
                      type="submit"
                      className="btn btn-ghost px-2 py-0.5 text-[11px]"
                    >
                      +5
                    </button>
                  </form>
                )}
                <form action={formAction}>
                  <input type="hidden" name="stat" value={stat} />
                  <input type="hidden" name="amount" value={unspentPoints} />
                  <button
                    type="submit"
                    title={t("שים את כל {count} הנקודות ב{stat}", {
                      count: unspentPoints,
                      stat: t(meta.label),
                    })}
                    className="btn btn-ghost px-2 py-0.5 text-[11px]"
                  >
                    {t("הכל")}
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
