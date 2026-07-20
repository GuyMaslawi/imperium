"use client";

import { useActionState } from "react";
import type { GuildSpellType } from "@prisma/client";
import { castGuildSpell, upgradeGuildSpell } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import {
  GUILD_SPELL_MAX_LEVEL,
  GUILD_SPELL_META,
} from "@/lib/game/guild";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";

export interface GuildShopCardProps {
  type: GuildSpellType;
  /** Current bonus % (= spell level). */
  bonusPct: number;
  /** Diamonds to raise the guild-wide bonus by 1%; null when maxed. */
  upgradeCost: number | null;
  /** Diamonds to cast a personal 24h buff at the current %. */
  castCost: number;
  /**
   * The buff's expiry time as an "HH:MM" label while it is active, else null.
   * Computed on the server (this app is server-rendered) so the client never
   * reads the clock during render — avoiding an impure render / hydration skew.
   */
  activeLabel: string | null;
  /** The player's diamond balance. */
  diamonds: number;
}

export function GuildShopCard({
  type,
  bonusPct,
  upgradeCost,
  castCost,
  activeLabel,
  diamonds,
}: GuildShopCardProps) {
  const [castState, castAction] = useActionState<ActionState, FormData>(
    castGuildSpell,
    {}
  );
  const [upgradeState, upgradeAction] = useActionState<ActionState, FormData>(
    upgradeGuildSpell,
    {}
  );

  const meta = GUILD_SPELL_META[type];
  const isActive = activeLabel != null;

  return (
    <div className="panel-inset flex flex-col gap-3 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-gold-bright">
          <span aria-hidden>{meta.icon}</span>
          {meta.label}
        </p>
        <span className="nums rounded-full border border-gold/40 bg-panel-inset px-2.5 py-0.5 text-xs font-black text-gold-bright" dir="ltr">
          +{bonusPct}%
        </span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">{meta.description}</p>
      <p className="text-[11px] text-gold-dim">{meta.effectLabel(bonusPct)}</p>

      <form className="mt-auto grid gap-2">
        <input type="hidden" name="type" value={type} />
        {isActive ? (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-400">
            <Icon name="spark" size={14} /> פעיל עד {activeLabel}
          </span>
        ) : (
          <SubmitButton
            className="btn btn-gold w-full"
            formAction={castAction}
            disabled={diamonds < castCost}
            pendingText="מטיל קסם..."
          >
            הטל קסם · {castCost} <Icon name="diamond" size={14} className="inline-block align-text-bottom text-cyan-300" />
          </SubmitButton>
        )}
        {upgradeCost != null ? (
          <SubmitButton
            variant="secondary"
            className="btn btn-ghost w-full"
            formAction={upgradeAction}
            disabled={diamonds < upgradeCost}
            pendingText="משדרג..."
          >
            שדרג ל־{bonusPct + 1}% · {upgradeCost} <Icon name="diamond" size={14} className="inline-block align-text-bottom text-cyan-300" />
          </SubmitButton>
        ) : (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-semibold text-gold">
            <Icon name="rankings" size={14} /> עזרה מקסימלית ({GUILD_SPELL_MAX_LEVEL}%)
          </span>
        )}
      </form>

      <FormMessage
        error={castState.error ?? upgradeState.error}
        success={castState.success ?? upgradeState.success}
      />
    </div>
  );
}
