"use client";

import { useActionState, useState } from "react";
import { resetHero } from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import {
  HERO_MAX_LEVEL,
  HERO_RESET_CITIZENS,
  HERO_RESET_POINTS,
  HERO_RESET_TURNS,
  heroResetPoints,
} from "@/lib/game/hero";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { useT } from "@/i18n/client";

/**
 * Level-100 prestige reset with a two-step confirm: the hero returns to
 * level 1 (marked with a reset badge), all allocated points are wiped, and the
 * empire immediately receives 3,000 citizens, 6,000 turns and a fresh point
 * pool. The pool is the reason `resets` is a prop: every reset is worth another
 * permanent 30 points, so the promise has to name *this* player's figure (31 in
 * hand on the first reset, 61 on the second) rather than the constant.
 */
export function HeroResetButton({ resets }: { resets: number }) {
  const freshPoints = heroResetPoints(resets + 1);
  const [state, formAction] = useActionState<ActionState, FormData>(resetHero, {});
  const t = useT();
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-xl border border-gold/60 bg-gradient-to-b from-gold-deep/25 to-transparent p-4">
      <h3 className="text-sm font-black text-gold-bright">
        <Icon name="spark" size={14} className="inline align-[-2px]" />{" "}
        {t("הגיבור הגיע לרמה {level}!", { level: HERO_MAX_LEVEL })}
      </h3>
      <p className="nums mt-1.5 text-xs leading-relaxed text-zinc-300">
        {t("איפוס הגיבור יחזיר אותו לרמה 1 ויעניק מיד")}{" "}
        <b className="text-emerald-400">
          {t("{count} אזרחים", { count: formatNumber(HERO_RESET_CITIZENS) })}
        </b>
        ,{" "}
        <b className="text-amber-300">
          {t("{count} תורות", { count: formatNumber(HERO_RESET_TURNS) })}
        </b>{" "}
        {t("ו־")}
        <b className="text-gold-bright">
          {t("{count} נקודות גיבור", { count: freshPoints })}
        </b>
        {t(". כל הנקודות שהוקצו יימחקו — אך כל איפוס מוסיף {points} נקודות פתיחה לצמיתות, כך שתחזור לרמה {level} עם", {
          points: HERO_RESET_POINTS,
          level: HERO_MAX_LEVEL,
        })}{" "}
        <b className="text-gold-bright">
          {t("{count} נקודות", {
            count: formatNumber(freshPoints + HERO_MAX_LEVEL - 1),
          })}
        </b>
        .
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
        <b className="text-emerald-400">{t("הציוד הלבוש נשאר עליך")}</b>{" "}
        {t("וממשיך להעניק את מלוא הבונוס — אבל שים לב:")}{" "}
        <b className="text-amber-300">{t("חפץ שתסיר יינעל בתיק עד שתחזור לרמתו")}</b>
        .
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="btn btn-gold mt-3 w-full px-4 py-2 text-sm"
        >
          {t("🔄 איפוס גיבור")}
        </button>
      ) : (
        <div className="mt-3 flex gap-2">
          <form action={formAction} className="flex-1">
            <button type="submit" className="btn btn-gold w-full px-4 py-2 text-sm">
              {t("אישור סופי — אפס!")}
            </button>
          </form>
          <button
            onClick={() => setConfirming(false)}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            {t("ביטול")}
          </button>
        </div>
      )}

      {state.error && (
        <p className="mt-2 text-xs font-semibold text-red-400">{state.error}</p>
      )}
      {state.success && (
        <p className="mt-2 text-xs font-semibold text-emerald-400">{state.success}</p>
      )}
    </div>
  );
}
