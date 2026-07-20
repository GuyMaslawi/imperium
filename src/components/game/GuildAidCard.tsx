"use client";

import { useActionState } from "react";
import { upgradeGuildAid } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";
import { formatNumber } from "@/lib/game/format";
import { GUILD_AID_MAX_LEVEL } from "@/lib/game/guild";

export interface GuildAidCardProps {
  /** Current aid percent (= aid level). */
  aidPct: number;
  /** Treasury gold to raise the aid by 1%; null when maxed. */
  upgradeCost: number | null;
  /** Gold in the guild treasury (the upgrade is paid from it). */
  guildGold: number;
}

export function GuildAidCard({ aidPct, upgradeCost, guildGold }: GuildAidCardProps) {
  const [state, action] = useActionState<ActionState, FormData>(
    upgradeGuildAid,
    {}
  );

  return (
    <div className="panel-inset flex flex-col gap-3 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-gold-bright">
          <Icon name="shield" size={16} className="text-crimson" />
          עזרת הברית
        </p>
        <span className="nums rounded-full border border-gold/40 bg-panel-inset px-2.5 py-0.5 text-xs font-black text-gold-bright" dir="ltr">
          +{aidPct}%
        </span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">
        כל חבר נלחם עם תוספת כוח בקרב.
      </p>
      <p className="text-[11px] text-gold-dim">
        +{aidPct}% מסך הכוח הכולל של הברית להתקפה ולהגנה
      </p>

      <form action={action} className="mt-auto">
        {upgradeCost != null ? (
          <SubmitButton
            className="btn btn-dark w-full"
            disabled={guildGold < upgradeCost}
            pendingText="משדרג..."
          >
            שדרג ל־{aidPct + 1}% · {formatNumber(upgradeCost)}{" "}
            <Icon name="gold" size={14} className="inline-block align-text-bottom text-gold-bright" />
          </SubmitButton>
        ) : (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-semibold text-gold">
            <Icon name="rankings" size={14} /> עזרה מקסימלית ({GUILD_AID_MAX_LEVEL}%)
          </span>
        )}
      </form>

      <FormMessage error={state.error} success={state.success} />
    </div>
  );
}
