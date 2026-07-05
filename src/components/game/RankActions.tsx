"use client";

import { useActionState } from "react";
import {
  spyOnEmpire,
  attackEmpire,
  type ActionState,
} from "@/server/actions/game";
import { ATTACK_TURN_COST, SPY_TURN_COST } from "@/lib/game/constants";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export function RankActions({
  targetEmpireId,
  currentTurns,
}: {
  targetEmpireId: string;
  /** The viewer's available turns — used to disable unaffordable actions. */
  currentTurns: number;
}) {
  const [spyState, spyAction] = useActionState<ActionState, FormData>(
    spyOnEmpire,
    {}
  );
  const [attackState, attackAction] = useActionState<ActionState, FormData>(
    attackEmpire,
    {}
  );

  const canSpy = currentTurns >= SPY_TURN_COST;
  const canAttack = currentTurns >= ATTACK_TURN_COST;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <form action={spyAction}>
          <input type="hidden" name="targetEmpireId" value={targetEmpireId} />
          <SubmitButton
            variant="secondary"
            pendingText="מרגל..."
            disabled={!canSpy}
            title={
              canSpy
                ? `עלות ריגול: ${SPY_TURN_COST} תורות`
                : "אין לך מספיק תורות לביצוע ריגול."
            }
          >
            🕵️ ריגול · {SPY_TURN_COST} תורות
          </SubmitButton>
        </form>
        <form action={attackAction}>
          <input type="hidden" name="targetEmpireId" value={targetEmpireId} />
          <SubmitButton
            variant="danger"
            pendingText="תוקף..."
            disabled={!canAttack}
            title={
              canAttack
                ? `עלות תקיפה: ${ATTACK_TURN_COST} תורות`
                : "אין לך מספיק תורות לביצוע תקיפה."
            }
          >
            ⚔️ תקיפה · {ATTACK_TURN_COST} תורות
          </SubmitButton>
        </form>
      </div>
      {!canAttack && (
        <p className="text-xs text-amber-400">
          {canSpy
            ? "אין לך מספיק תורות לביצוע תקיפה."
            : "אין לך מספיק תורות לביצוע ריגול."}
        </p>
      )}
      <FormMessage
        error={spyState.error ?? attackState.error}
        success={spyState.success ?? attackState.success}
      />
    </div>
  );
}
