"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { attackCityBoss, type BossActionState } from "@/server/actions/boss";

function SubmitButton({
  bossName,
  disabled,
  title,
}: {
  bossName: string;
  disabled: boolean;
  title: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={title}
      className="group/boss relative w-full overflow-hidden rounded-xl border border-[rgb(var(--boss-accent))]/70 bg-gradient-to-b from-[rgb(var(--boss-accent))]/85 to-black px-6 py-3.5 text-base font-black tracking-wide text-white shadow-[0_6px_28px_-8px_rgb(var(--boss-accent)/0.75)] transition-all hover:-translate-y-0.5 hover:brightness-115 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:w-auto"
    >
      {/* light sweep across the CTA — the boss button should feel dangerous */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-l from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover/boss:translate-x-full"
      />
      <span className="relative">
        {pending ? "צר על המצודה…" : `צא לקרב מול ${bossName}`}
      </span>
    </button>
  );
}

/**
 * Launches the city-boss run. The action redirects to the fight report on
 * success, so the only thing rendered back here is a refusal.
 */
export function BossAttackButton({
  bossName,
  disabled,
  disabledReason,
  turnCost,
}: {
  bossName: string;
  disabled: boolean;
  /** Why the button is dead — shown as its tooltip. */
  disabledReason?: string;
  turnCost: number;
}) {
  const [state, formAction] = useActionState<BossActionState, FormData>(
    () => attackCityBoss(),
    {}
  );

  return (
    <form action={formAction} className="w-full space-y-2 sm:w-auto">
      <SubmitButton
        bossName={bossName}
        disabled={disabled}
        title={
          disabled
            ? (disabledReason ?? "לא ניתן לתקוף כרגע")
            : `עלות הקרב: ${turnCost.toLocaleString("he-IL")} תורות`
        }
      />
      {state.error && (
        <p className="text-center text-xs font-semibold text-red-400">{state.error}</p>
      )}
    </form>
  );
}
