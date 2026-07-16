"use client";

import { useActionState } from "react";
import {
  assignAllMineSlavesToResource,
  splitMineSlavesEqually,
  clearMineSlaveAssignments,
  type ActionState,
} from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

const ALL_TO_RESOURCE: Array<{
  resource: "gold" | "wood" | "iron" | "stone";
  label: string;
}> = [
  { resource: "gold", label: "הצב הכל בזהב" },
  { resource: "wood", label: "הצב הכל בעץ" },
  { resource: "iron", label: "הצב הכל בברזל" },
  { resource: "stone", label: "הצב הכל באבן" },
];

export function MineSlaveQuickActions() {
  const [allState, allAction] = useActionState<ActionState, FormData>(
    assignAllMineSlavesToResource,
    {}
  );
  const [splitState, splitAction] = useActionState<ActionState, FormData>(
    splitMineSlavesEqually,
    {}
  );
  const [clearState, clearAction] = useActionState<ActionState, FormData>(
    clearMineSlaveAssignments,
    {}
  );

  return (
    <div className="panel rounded-xl p-4 space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-bold tracking-wide text-gold-bright">
        <span aria-hidden>⚡</span>
        פעולות מהירות
      </h2>
      <div className="flex flex-wrap gap-2">
        {ALL_TO_RESOURCE.map(({ resource, label }) => (
          <form key={resource} action={allAction}>
            <input type="hidden" name="resource" value={resource} />
            <SubmitButton variant="secondary" className="btn btn-ghost px-4 py-2 text-sm" pendingText="מציב...">
              {label}
            </SubmitButton>
          </form>
        ))}
        <form action={splitAction}>
          <SubmitButton variant="secondary" className="btn btn-ghost px-4 py-2 text-sm" pendingText="מחלק...">
            חלק שווה בין המשאבים
          </SubmitButton>
        </form>
        <form action={clearAction}>
          <SubmitButton variant="secondary" className="btn btn-ghost px-4 py-2 text-sm" pendingText="מנקה...">
            נקה חלוקה
          </SubmitButton>
        </form>
      </div>
      <FormMessage
        error={allState.error ?? splitState.error ?? clearState.error}
        success={allState.success ?? splitState.success ?? clearState.success}
      />
    </div>
  );
}
