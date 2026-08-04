"use client";

import type { CSSProperties } from "react";
import { useActionState } from "react";
import type { GuildSpellType } from "@prisma/client";
import { castGuildSpell, upgradeGuildSpell } from "@/server/actions/guild";
import type { ActionState } from "@/server/actions/game";
import { GUILD_SPELL_META } from "@/lib/game/guild";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";
import { Icon } from "@/components/ui/Icon";
import { useT } from "@/i18n/client";

export interface GuildShopCardProps {
  type: GuildSpellType;
  /** Current bonus % (= spell level). */
  bonusPct: number;
  /** This spell's own ceiling — shown once the shop has nothing left to sell. */
  maxPct: number;
  /** Diamonds to raise the guild-wide bonus by 1%; null when maxed. */
  upgradeCost: number | null;
  /** Diamonds to cast a personal buff at the current %. */
  castCost: number;
  /**
   * The buff's expiry time as an "HH:MM" label while it is active, else null.
   * Computed on the server (this app is server-rendered) so the client never
   * reads the clock during render — avoiding an impure render / hydration skew.
   */
  activeLabel: string | null;
  /** The player's diamond balance. */
  diamonds: number;
  /** Stagger index for the deal-in animation. */
  index: number;
}

export function GuildShopCard({
  type,
  bonusPct,
  maxPct,
  upgradeCost,
  castCost,
  activeLabel,
  diamonds,
  index,
}: GuildShopCardProps) {
  const t = useT();
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
    <div
      className={`panel-inset gd-spell flex flex-col gap-3 rounded-lg p-3${
        isActive ? " is-live" : ""
      }`}
      style={{ "--i": index } as CSSProperties}
    >
      {/* A rune circle that only turns while the spell is actually on you. */}
      <span className="gd-rune" aria-hidden />
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-bold text-gold-bright">
          <Icon name={meta.icon} size={15} className="gd-spell-icon text-gold-bright" />
          {t(meta.label)}
        </p>
        <span className="nums rounded-full border border-gold/40 bg-panel-inset px-2.5 py-0.5 text-xs font-black text-gold-bright" dir="ltr">
          +{bonusPct}%
        </span>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">{t(meta.description)}</p>
      <p className="text-[11px] text-gold-dim">{meta.effectLabel(t, bonusPct)}</p>

      <form className="mt-auto grid gap-2">
        <input type="hidden" name="type" value={type} />
        {isActive ? (
          <span className="gd-live flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-center text-xs font-semibold text-emerald-400">
            <Icon name="spark" size={14} /> {t("פעיל עד {time}", { time: activeLabel })}
          </span>
        ) : (
          <SubmitButton
            className="btn btn-gold w-full"
            formAction={castAction}
            disabled={diamonds < castCost}
            pendingText={t("מטיל קסם...")}
          >
            {t("הטל קסם")} · {castCost} <Icon name="diamond" size={14} className="inline-block align-text-bottom text-cyan-300" />
          </SubmitButton>
        )}
        {upgradeCost != null ? (
          <SubmitButton
            variant="secondary"
            className="btn btn-ghost w-full"
            formAction={upgradeAction}
            disabled={diamonds < upgradeCost}
            pendingText={t("משדרג...")}
          >
            {t("שדרג ל־{pct}%", { pct: bonusPct + 1 })} · {upgradeCost} <Icon name="diamond" size={14} className="inline-block align-text-bottom text-cyan-300" />
          </SubmitButton>
        ) : (
          <span className="flex items-center justify-center gap-1 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-center text-xs font-semibold text-gold">
            <Icon name="rankings" size={14} /> {t("עזרה מקסימלית ({max}%)", { max: maxPct })}
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
