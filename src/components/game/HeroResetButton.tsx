"use client";

import { useActionState, useState } from "react";
import { resetHero } from "@/server/actions/hero";
import type { ActionState } from "@/server/actions/game";
import {
  HERO_MAX_LEVEL,
  HERO_RESET_CITIZENS,
  HERO_RESET_POINTS,
} from "@/lib/game/hero";

/**
 * Level-100 prestige reset with a two-step confirm: the hero returns to
 * level 1 (marked with a reset badge), all allocated points are wiped, and
 * the empire immediately receives 2,500 citizens + 25 fresh hero points.
 */
export function HeroResetButton() {
  const [state, formAction] = useActionState<ActionState, FormData>(resetHero, {});
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="rounded-xl border border-gold/60 bg-gradient-to-b from-gold-deep/25 to-transparent p-4">
      <h3 className="text-sm font-black text-gold-bright">
        ✨ הגיבור הגיע לרמה {HERO_MAX_LEVEL}!
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-300">
        איפוס הגיבור יחזיר אותו לרמה 1 ויעניק מיד{" "}
        <b className="text-emerald-400">
          {HERO_RESET_CITIZENS.toLocaleString("he-IL")} אזרחים
        </b>{" "}
        ו-<b className="text-gold-bright">{HERO_RESET_POINTS} נקודות גיבור</b>.
        כל הנקודות שהוקצו יימחקו, וחפצים מעל רמה 1 יוסרו לתיק.
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
