"use client";

import { useActionState, type MouseEvent } from "react";
import type { DiamondEffectKind } from "@prisma/client";
import {
  cancelDiamondEffect,
  castDiamondSpell,
  clearDiamondCooldown,
  type AdminActionState,
} from "@/server/actions/admin";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { FormMessage } from "@/components/ui/FormMessage";

export interface DiamondSpellActionsProps {
  empireId: string;
  userId: string;
  kind: DiamondEffectKind;
  /** Shown in the confirm dialogs, so they read like the card above them. */
  label: string;
  /**
   * The shields' sale durations. Everything else casts at its own fixed
   * duration and renders no picker.
   */
  hourOptions?: number[];
  /** Greys out "בטל צינון" when there is no clock to lift. */
  hasCooldown: boolean;
  /** Greys out "בטל" when there is no row to remove. */
  hasEffect: boolean;
  /** Casting this one takes something away, so it asks first. */
  destructive?: boolean;
}

/**
 * The three things an admin can do to one spell on one empire: cast it for the
 * player, lift its cooldown, or cancel it.
 *
 * One `<form>` with three server actions rather than three forms, so the
 * hidden target fields (and the shield's duration picker) are written once and
 * every button posts the same payload — see `GuildMemberActions` for the same
 * shape. The card around this renders the clocks; nothing here reads the
 * current time, which keeps the client component free of hydration drift.
 */
export function DiamondSpellActions({
  empireId,
  userId,
  kind,
  label,
  hourOptions,
  hasCooldown,
  hasEffect,
  destructive,
}: DiamondSpellActionsProps) {
  const [castState, cast] = useActionState<AdminActionState, FormData>(
    castDiamondSpell,
    {}
  );
  const [cooldownState, clearCooldown] = useActionState<AdminActionState, FormData>(
    clearDiamondCooldown,
    {}
  );
  const [cancelState, cancel] = useActionState<AdminActionState, FormData>(
    cancelDiamondEffect,
    {}
  );

  const confirmClick =
    (message: string) => (event: MouseEvent<HTMLButtonElement>) => {
      if (!window.confirm(message)) event.preventDefault();
    };

  const error = castState.error ?? cooldownState.error ?? cancelState.error;
  const success = castState.success ?? cooldownState.success ?? cancelState.success;

  return (
    <form className="space-y-2">
      <input type="hidden" name="empireId" value={empireId} />
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="kind" value={kind} />

      {hourOptions && hourOptions.length > 0 && (
        <label className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
          משך
          <select
            name="hours"
            defaultValue={String(hourOptions[0])}
            className="rounded-lg border border-border-subtle bg-panel-inset px-2 py-1 text-xs text-zinc-100 outline-none focus:border-gold/60"
          >
            {hourOptions.map((h) => (
              <option key={h} value={h}>
                {h} שעות
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex flex-wrap gap-1.5">
        <SubmitButton
          variant="secondary"
          className="px-2 py-1 text-[11px]"
          formAction={cast}
          pendingText="..."
          onClick={
            destructive
              ? confirmClick(`להטיל "${label}" בשם השחקן? הפעולה משנה את האימפריה שלו.`)
              : undefined
          }
        >
          הטל בשבילו
        </SubmitButton>
        <SubmitButton
          variant="secondary"
          className="px-2 py-1 text-[11px]"
          formAction={clearCooldown}
          disabled={!hasCooldown}
          pendingText="..."
        >
          בטל צינון
        </SubmitButton>
        <SubmitButton
          variant="danger"
          className="px-2 py-1 text-[11px]"
          formAction={cancel}
          disabled={!hasEffect}
          pendingText="..."
          onClick={confirmClick(`לבטל את "${label}" לגמרי?`)}
        >
          בטל קסם
        </SubmitButton>
      </div>

      <FormMessage error={error} success={success} />
    </form>
  );
}
