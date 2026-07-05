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
import { Card } from "@/components/ui/Card";

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
    <Card className="space-y-3">
      <h2 className="text-sm font-bold text-zinc-100">פעולות מהירות ⚡</h2>
      <div className="flex flex-wrap gap-2">
        {ALL_TO_RESOURCE.map(({ resource, label }) => (
          <form key={resource} action={allAction}>
            <input type="hidden" name="resource" value={resource} />
            <SubmitButton variant="secondary" pendingText="מציב...">
              {label}
            </SubmitButton>
          </form>
        ))}
        <form action={splitAction}>
          <SubmitButton variant="secondary" pendingText="מחלק...">
            חלק שווה בין המשאבים
          </SubmitButton>
        </form>
        <form action={clearAction}>
          <SubmitButton variant="secondary" pendingText="מנקה...">
            נקה חלוקה
          </SubmitButton>
        </form>
      </div>
      <FormMessage
        error={allState.error ?? splitState.error ?? clearState.error}
        success={allState.success ?? splitState.success ?? clearState.success}
      />
    </Card>
  );
}
