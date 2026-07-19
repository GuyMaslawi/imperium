"use client";

import { useActionState } from "react";
import { upgradeGuildCapacity } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";

export interface GuildCapacityCardProps {
  memberCount: number;
  capacity: number;
  /** Diamonds for one more seat; null when the guild is fully expanded. */
  upgradeCost: number | null;
  diamonds: number;
}

export function GuildCapacityCard({
  memberCount,
  capacity,
  upgradeCost,
  diamonds,
}: GuildCapacityCardProps) {
  const [state, action] = useActionState<ActionState, FormData>(
    upgradeGuildCapacity,
    {}
  );

  return (
    <div className="panel-inset flex flex-col gap-3 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-gold-bright">
          <Icon name="base" size={16} className="text-crimson" />
          קיבולת הברית
        </p>
        <span className="nums rounded-full border border-gold/40 bg-panel-inset px-2.5 py-0.5 text-xs font-black text-gold-bright" dir="ltr">
          {memberCount}/{capacity}
        </span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">
        הרחבת הברית מוסיפה מקום לחבר נוסף.
      </p>

      <form action={action} className="mt-auto">
        {upgradeCost != null ? (
          <SubmitButton
            variant="secondary"
            className="btn btn-ghost w-full"
            disabled={diamonds < upgradeCost}
            pendingText="מרחיב..."
          >
            הרחב ל־{capacity + 1} חברים · {upgradeCost} <Icon name="diamond" size={14} className="inline-block align-text-bottom" />
          </SubmitButton>
        ) : (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-semibold text-gold">
            <Icon name="rankings" size={14} /> קיבולת מקסימלית
          </span>
        )}
      </form>

      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
