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

/**
 * Level-100 prestige reset with a two-step confirm: the hero returns to
 * level 1 (marked with a reset badge), all allocated points are wiped, and the
 * empire immediately receives 3,000 citizens, 6,000 turns and a fresh point
 * pool. The pool is the reason `resets` is a prop: every reset is worth another
 * permanent 25 points, so the promise has to name *this* player's figure (25 on
 * the first reset, 50 on the second) rather than the constant.
 */
export function HeroResetButton({ resets }: { resets: number }) {
  const freshPoints = heroResetPoints(resets + 1);
  const [state, formAction] = useActionState<ActionState, FormData>(resetHero, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-xl border border-gold/60 bg-gradient-to-b from-gold-deep/25 to-transparent p-4">
      <h3 className="text-sm font-black text-gold-bright">
        <Icon name="spark" size={14} className="inline align-[-2px]" /> הגיבור הגיע לרמה {HERO_MAX_LEVEL}!
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
        איפוס הגיבור יחזיר אותו לרמה 1 ויעניק מיד{" "}
        <b className="text-emerald-400">
          {formatNumber(HERO_RESET_CITIZENS)} אזרחים
        </b>
        ,{" "}
        <b className="text-amber-300">{formatNumber(HERO_RESET_TURNS)} תורות</b>{" "}
        ו-<b className="text-gold-bright">{freshPoints} נקודות גיבור</b>. כל
        הנקודות שהוקצו יימחקו — אך כל איפוס מוסיף {HERO_RESET_POINTS} נקודות
        פתיחה לצמיתות, כך שתחזור לרמה {HERO_MAX_LEVEL} עם{" "}
        <b className="text-gold-bright">
          {formatNumber(freshPoints + HERO_MAX_LEVEL - 1)} נקודות
        </b>
        .
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
        <b className="text-emerald-400">הציוד הלבוש נשאר עליך</b> וממשיך להעניק
        את מלוא הבונוס — אבל שים לב:{" "}
        <b className="text-amber-300">
          חפץ שתסיר יינעל בתיק עד שתחזור לרמתו
        </b>
        .
      </p>

      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="btn btn-gold mt-3 w-full px-4 py-2 text-sm"
        >
          🔄 איפוס גיבור
        </button>
      ) : (
        <div className="mt-3 flex gap-2">
          <form action={formAction} className="flex-1">
            <button type="submit" className="btn btn-gold w-full px-4 py-2 text-sm">
              אישור סופי — אפס!
            </button>
          </form>
          <button
            onClick={() => setConfirming(false)}
            className="btn btn-ghost px-4 py-2 text-sm"
          >
            ביטול
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
