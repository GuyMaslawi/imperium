"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";
import {
  spyOnEmpire,
  attackEmpire,
  type ActionState,
} from "@/server/actions/game";
import { ATTACK_TURN_COST, SPY_TURN_COST } from "@/lib/game/constants";
import { FormMessage } from "@/components/ui/FormMessage";

/** A big prominent submit button that shows a pending label while its form runs. */
function ActionButton({
  children,
  pendingText,
  disabled,
  tone,
  title,
}: {
  children: ReactNode;
  pendingText: string;
  disabled?: boolean;
  tone: "attack" | "spy";
  title?: string;
}) {
  const { pending } = useFormStatus();
  const base =
    "flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-black tracking-wide transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-45";
  const styles =
    tone === "attack"
      ? "border border-red-500/70 bg-gradient-to-b from-red-600 to-red-800 text-white shadow-[0_4px_20px_-6px_rgba(239,68,68,0.6)] hover:from-red-500 hover:to-red-700 hover:-translate-y-0.5"
      : "border border-gold/70 bg-gradient-to-b from-[#e8c877] to-[#c99a3f] text-[#241701] shadow-[0_4px_20px_-6px_rgba(212,168,67,0.55)] hover:brightness-110 hover:-translate-y-0.5";
  return (
    <button type="submit" disabled={pending || disabled} title={title} className={`${base} ${styles}`}>
      {pending ? pendingText : children}
    </button>
  );
}

export function RankActions({
  targetEmpireId,
  currentTurns,
}: {
  targetEmpireId: string;
  /** The viewer's available turns — used to disable unaffordable actions. */
  currentTurns: number;
}) {
  const [spyState, spyAction] = useActionState<ActionState, FormData>(spyOnEmpire, {});
  const [attackState, attackAction] = useActionState<ActionState, FormData>(attackEmpire, {});

  const canSpy = currentTurns >= SPY_TURN_COST;
  const canAttack = currentTurns >= ATTACK_TURN_COST;

  return (
    <div className="w-full space-y-2 sm:w-80">
      <div className="grid grid-cols-2 gap-2.5">
        <form action={attackAction}>
          <input type="hidden" name="targetEmpireId" value={targetEmpireId} />
          <ActionButton
            tone="attack"
            pendingText="תוקף…"
            disabled={!canAttack}
            title={canAttack ? `עלות תקיפה: ${ATTACK_TURN_COST} תורות` : "אין לך מספיק תורות לתקיפה"}
          >
            ⚔️ תקיפה
          </ActionButton>
          <p className="mt-1 text-center text-[10px] text-zinc-500 nums" dir="ltr">
            {ATTACK_TURN_COST} תורות
          </p>
        </form>
        <form action={spyAction}>
          <input type="hidden" name="targetEmpireId" value={targetEmpireId} />
          <ActionButton
            tone="spy"
            pendingText="מרגל…"
            disabled={!canSpy}
            title={canSpy ? `עלות ריגול: ${SPY_TURN_COST} תורות` : "אין לך מספיק תורות לריגול"}
          >
            🕵️ ריגול
          </ActionButton>
          <p className="mt-1 text-center text-[10px] text-zinc-500 nums" dir="ltr">
            {SPY_TURN_COST} תורות
          </p>
        </form>
      </div>
      <FormMessage
        error={spyState.error ?? attackState.error}
        success={spyState.success ?? attackState.success}
      />
    </div>
  );
}
