"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { attackEmpire, type ActionState } from "@/server/actions/game";
import { ATTACK_TURN_COST } from "@/lib/game/constants";

function SubmitButton({ label, disabled }: { label: string; disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      title={
        disabled
          ? "אין לך מספיק תורות לתקיפה"
          : `עלות תקיפה: ${ATTACK_TURN_COST} תורות`
      }
      className="btn btn-gold px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
    >
      {pending ? "תוקף…" : label}
    </button>
  );
}

/**
 * Launches another attack on the same foe straight from the battle result —
 * attackEmpire redirects to the fresh report, so there's no detour back to
 * the empire page.
 */
export function AttackAgainButton({
  targetEmpireId,
  currentTurns,
  label,
}: {
  targetEmpireId: string;
  /** The viewer's available turns — used to disable an unaffordable attack. */
  currentTurns: number;
  label: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(attackEmpire, {});

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <input type="hidden" name="targetEmpireId" value={targetEmpireId} />
      <SubmitButton label={label} disabled={currentTurns < ATTACK_TURN_COST} />
      {state.error && (
        <p className="text-xs font-semibold text-red-400">{state.error}</p>
      )}
    </form>
  );
}
