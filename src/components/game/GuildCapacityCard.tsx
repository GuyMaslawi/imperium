"use client";

import { useActionState } from "react";
import { upgradeGuildCapacity } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";
import { useAfterFirstPaint } from "@/components/ui/motion";
import { formatNumber } from "@/lib/game/format";

export interface GuildCapacityCardProps {
  memberCount: number;
  capacity: number;
  /** Own gold for one more seat; null when the guild is fully expanded. */
  upgradeCost: number | null;
  /** The viewer's available gold — the upgrade is paid from it. */
  availableGold: number;
  /** False for plain members, who may not buy seats — the button hides. */
  mayUpgrade: boolean;
}

export function GuildCapacityCard({
  memberCount,
  capacity,
  upgradeCost,
  availableGold,
  mayUpgrade,
}: GuildCapacityCardProps) {
  const [state, action] = useActionState<ActionState, FormData>(
    upgradeGuildCapacity,
    {}
  );
  const painted = useAfterFirstPaint();

  return (
    <div className="panel-inset gd-up flex flex-col gap-3 rounded-lg p-3">
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
        הרחבת הברית מוסיפה מקום לחבר נוסף — עד 10 חברים.
      </p>
      <p className="text-[11px] text-zinc-500">
        מנהיג או סגן בלבד — משולם מהזהב הזמין שלו.
      </p>

      {/* How full the hall is right now — the same bar the aid card carries. */}
      <div className="gd-meter" aria-hidden>
        <span style={{ width: painted ? `${(memberCount / capacity) * 100}%` : "0%" }} />
      </div>

      <form action={action} className="mt-auto">
        {upgradeCost != null ? (
          <SubmitButton
            className="btn btn-dark w-full"
            disabled={!mayUpgrade || availableGold < upgradeCost}
            pendingText="מרחיב..."
          >
            הרחב ל־{capacity + 1} · {formatNumber(upgradeCost)}{" "}
            <Icon name="gold" size={14} className="inline-block align-text-bottom text-gold-bright" />
          </SubmitButton>
        ) : (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-semibold text-gold">
            <Icon name="rankings" size={14} /> קיבולת מקסימלית (10)
          </span>
        )}
      </form>

      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
